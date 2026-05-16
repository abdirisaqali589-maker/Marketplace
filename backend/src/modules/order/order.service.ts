import { prisma } from '../../common/prisma';
import { AppError, NotFoundError } from '../../common/errors';
import { v4 as uuidv4 } from 'uuid';
import { AuthPayload } from '../../common/middleware';

export class OrderService {
  private isAdmin(user: AuthPayload): boolean {
    return ['ADMIN', 'SUPER_ADMIN'].includes(user.role);
  }

  private async getSellerIdForUser(userId: string): Promise<string> {
    const seller = await prisma.seller.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!seller) throw new NotFoundError('Seller profile not found');
    return seller.id;
  }

  private async ensureCanAccessOrder(order: { userId: string; sellerId: string }, user: AuthPayload) {
    if (this.isAdmin(user) || order.userId === user.userId) return;
    if (user.role === 'SELLER') {
      const sellerId = await this.getSellerIdForUser(user.userId);
      if (order.sellerId === sellerId) return;
    }
    throw new AppError(403, 'Not authorized');
  }

  private generateOrderNumber(): string {
    const prefix = 'ORD';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  async create(userId: string, data: any) {
    return prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: { select: { id: true, title: true, basePrice: true, discountPrice: true, slug: true, sellerId: true, isActive: true, status: true } },
              variant: { select: { id: true, sku: true, price: true, discountPrice: true, stock: true, isActive: true } },
            },
          },
        },
      });

      if (!cart || cart.items.length === 0) {
        throw new AppError(400, 'Cart is empty');
      }

      const sellerGroups = new Map<string, typeof cart.items>();
      for (const item of cart.items) {
        if (!item.product.isActive || item.product.status !== 'ACTIVE') {
          throw new AppError(400, `${item.product.title} is no longer available`);
        }
        if (item.variant && !item.variant.isActive) {
          throw new AppError(400, `${item.product.title} variant is no longer available`);
        }
        const sellerId = item.product.sellerId;
        if (!sellerGroups.has(sellerId)) sellerGroups.set(sellerId, []);
        sellerGroups.get(sellerId)!.push(item);
      }

      for (const item of cart.items) {
        if (item.variant && item.quantity > item.variant.stock) {
          throw new AppError(400, `Insufficient stock for ${item.product.title}`);
        }
      }

      const orders = [];
      const shippingAddress = JSON.stringify(data.shippingAddress);

      for (const [sellerId, items] of sellerGroups) {
        const orderNumber = this.generateOrderNumber();
        const subtotal = items.reduce((sum, item) => {
          const price = item.variant?.discountPrice ?? item.variant?.price ?? item.product.discountPrice ?? item.product.basePrice;
          return sum + (price * item.quantity);
        }, 0);

        let discountAmount = 0;
        let couponId: string | null = null;
        if (data.couponCode) {
          const coupon = await tx.couponRule.findUnique({ where: { code: data.couponCode.toUpperCase() } });
          if (coupon && coupon.isActive && (!coupon.expiresAt || coupon.expiresAt > new Date()) && (!coupon.startsAt || coupon.startsAt <= new Date())) {
            const userUsage = coupon.userLimit ? await tx.couponUsage.count({ where: { couponId: coupon.id, userId } }) : 0;
            if (subtotal >= coupon.minSpend && (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit) && (!coupon.userLimit || userUsage < coupon.userLimit)) {
              discountAmount = coupon.type === 'PERCENTAGE'
                ? Math.min(subtotal * (coupon.value / 100), coupon.maxDiscount || Infinity)
                : coupon.value;
              couponId = coupon.id;
            }
          }
        }

        const order = await tx.order.create({
          data: {
            orderNumber,
            userId,
            sellerId,
            status: 'PENDING_PAYMENT',
            shippingAddress,
            shippingMethod: data.shippingMethod,
            shippingFee: 0,
            taxAmount: 0,
            discountAmount,
            couponCode: data.couponCode?.toUpperCase(),
            subtotal,
            totalAmount: Math.max(0, subtotal - discountAmount),
            paymentMethod: data.paymentMethod,
            notes: data.notes,
            items: {
              create: items.map(item => ({
                productId: item.product.id,
                variantId: item.variant?.id || null,
                productSnapshot: JSON.stringify({
                  title: item.product.title,
                  slug: item.product.slug,
                  price: item.variant?.discountPrice ?? item.variant?.price ?? item.product.discountPrice ?? item.product.basePrice,
                }),
                quantity: item.quantity,
                unitPrice: item.variant?.discountPrice ?? item.variant?.price ?? item.product.discountPrice ?? item.product.basePrice,
                totalPrice: (item.variant?.discountPrice ?? item.variant?.price ?? item.product.discountPrice ?? item.product.basePrice) * item.quantity,
              })),
            },
          },
          include: { items: true },
        });

        orders.push(order);

        if (couponId) {
          await tx.couponUsage.create({ data: { couponId, userId, orderId: order.id } });
          await tx.couponRule.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } });
        }

        for (const item of items) {
          if (item.variant) {
            const updated = await tx.productVariant.updateMany({
              where: { id: item.variant.id, stock: { gte: item.quantity } },
              data: { stock: { decrement: item.quantity } },
            });
            if (updated.count !== 1) throw new AppError(400, `Insufficient stock for ${item.product.title}`);
          }
        }
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return orders;
    });
  }

  async findById(id: string, user: AuthPayload) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: { select: { id: true, title: true, slug: true, images: { where: { isPrimary: true }, take: 1, select: { url: true } } } } } },
        payments: true,
        shipments: true,
        seller: { select: { id: true, storeName: true } },
      },
    });
    if (!order) throw new NotFoundError('Order not found');
    await this.ensureCanAccessOrder(order, user);
    return order;
  }

  async findByOrderNumber(orderNumber: string, user: AuthPayload) {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: { include: { product: { select: { id: true, title: true, slug: true, images: { where: { isPrimary: true }, take: 1, select: { url: true } } } } } },
        payments: true,
        shipments: true,
      },
    });
    if (!order) throw new NotFoundError('Order not found');
    await this.ensureCanAccessOrder(order, user);
    return order;
  }

  async findUserOrders(userId: string, query: any) {
    const { page, limit, status, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;
    const where: any = { userId };
    if (status) where.status = status;

    const orderBy = sortBy && sortOrder ? { [sortBy]: sortOrder } : { createdAt: 'desc' as const };
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: { product: { select: { id: true, title: true, slug: true, images: { where: { isPrimary: true }, take: 1, select: { url: true } } } } },
          },
          seller: { select: { id: true, storeName: true } },
          _count: { select: { shipments: true, returnRequests: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return { data: orders, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findSellerOrders(userId: string, query: any) {
    const sellerId = await this.getSellerIdForUser(userId);
    const { page, limit, status, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;
    const where: any = { sellerId };
    if (status) where.status = status;

    const sellerOrderBy = sortBy && sortOrder ? { [sortBy]: sortOrder } : { createdAt: 'desc' as const };
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: { product: { select: { id: true, title: true, slug: true, images: { where: { isPrimary: true }, take: 1, select: { url: true } } } } },
          },
          user: { select: { id: true, firstName: true, lastName: true, phone: true } },
        },
        orderBy: sellerOrderBy,
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return { data: orders, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findAll(query: any) {
    const { page, limit, status, paymentStatus, startDate, endDate, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const allOrderBy = sortBy && sortOrder ? { [sortBy]: sortOrder } : { createdAt: 'desc' as const };
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          seller: { select: { id: true, storeName: true } },
          _count: { select: { items: true } },
        },
        orderBy: allOrderBy,
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return { data: orders, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async updateStatus(id: string, status: string, user: AuthPayload, notes?: string) {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundError('Order not found');
    if (!this.isAdmin(user)) {
      await this.ensureCanAccessOrder(order, user);
    }

    const updateData: any = { status };
    if (status === 'DELIVERED') updateData.deliveredAt = new Date();
    if (notes) updateData.notes = notes;

    return prisma.order.update({
      where: { id },
      data: updateData,
      include: { items: true },
    });
  }

  async cancelOrder(id: string, userId: string) {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundError('Order not found');
    if (order.userId !== userId) throw new AppError(403, 'Not authorized');
    if (!['PENDING_PAYMENT', 'PAYMENT_CONFIRMED', 'PROCESSING'].includes(order.status)) {
      throw new AppError(400, 'Order cannot be cancelled');
    }

    // Restore stock
    const items = await prisma.orderItem.findMany({ where: { orderId: id } });
    for (const item of items) {
      if (item.variantId) {
        await prisma.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    return prisma.order.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}
