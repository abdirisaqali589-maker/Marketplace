import { prisma } from '../../common/prisma';
import { AppError, NotFoundError } from '../../common/errors';

export class CartService {
  async getCart(userId: string) {
    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true, title: true, slug: true, basePrice: true,
                discountPrice: true, currency: true, status: true, isActive: true,
                images: { where: { isPrimary: true }, take: 1, select: { url: true } },
                seller: { select: { id: true, storeName: true } },
              },
            },
            variant: {
              select: {
                id: true, sku: true, price: true, discountPrice: true,
                stock: true, attributes: true, isActive: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: { items: { include: { product: { select: { id: true, title: true, slug: true, basePrice: true, discountPrice: true, currency: true, status: true, isActive: true, images: { where: { isPrimary: true }, take: 1, select: { url: true } }, seller: { select: { id: true, storeName: true } } } }, variant: { select: { id: true, sku: true, price: true, discountPrice: true, stock: true, attributes: true, isActive: true } } }, orderBy: { createdAt: "desc" } } },
      });
    }

    // Calculate totals
    const items = cart.items.map(item => {
      const price = item.variant?.discountPrice ?? item.variant?.price ?? item.product.discountPrice ?? item.product.basePrice;
      return { ...item, unitPrice: price, totalPrice: price * item.quantity };
    });

    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      id: cart.id,
      userId: cart.userId,
      items,
      subtotal,
      itemCount,
      currency: items[0]?.product.currency || 'TZS',
    };
  }

  async addItem(userId: string, data: any) {
    // Ensure cart exists
    let cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId } });
    }

    // Validate product
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
      include: { variants: { where: { isActive: true } } },
    });
    if (!product) throw new NotFoundError('Product not found');
    if (!product.isActive || product.status !== 'ACTIVE') {
      throw new AppError(400, 'Product is not available');
    }

    // Validate variant if specified
    if (data.variantId) {
      const variant = product.variants.find(v => v.id === data.variantId);
      if (!variant) throw new NotFoundError('Variant not found');
      if (variant.stock < data.quantity) throw new AppError(400, 'Insufficient stock');
    }

    // Check if item already exists
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: data.productId,
        variantId: data.variantId || null,
      },
    });

    if (existingItem) {
      // Update quantity
      const newQty = existingItem.quantity + data.quantity;
      if (data.variantId) {
        const variant = product.variants.find(v => v.id === data.variantId);
        if (variant && newQty > variant.stock) throw new AppError(400, 'Insufficient stock');
      }
      return prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQty, note: data.note ?? existingItem.note },
      });
    }

    // Create new item
    return prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: data.productId,
        variantId: data.variantId || null,
        sellerId: product.sellerId,
        quantity: data.quantity,
        note: data.note,
      },
      include: {
        product: { select: { id: true, title: true, slug: true, basePrice: true, images: { where: { isPrimary: true }, take: 1, select: { url: true } } } },
        variant: { select: { id: true, sku: true, price: true, stock: true, attributes: true } },
      },
    });
  }

  async updateItem(userId: string, itemId: string, data: any) {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw new NotFoundError('Cart not found');

    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
      include: { variant: true },
    });
    if (!item) throw new NotFoundError('Cart item not found');

    if (data.quantity === 0) {
      await prisma.cartItem.delete({ where: { id: itemId } });
      return { message: 'Item removed from cart' };
    }

    if (item.variant && data.quantity > item.variant.stock) {
      throw new AppError(400, 'Insufficient stock');
    }

    return prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: data.quantity, note: data.note },
    });
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw new NotFoundError('Cart not found');

    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) throw new NotFoundError('Cart item not found');

    await prisma.cartItem.delete({ where: { id: itemId } });
    return { message: 'Item removed from cart' };
  }

  async clearCart(userId: string) {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw new NotFoundError('Cart not found');

    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return { message: 'Cart cleared' };
  }

  async mergeGuestCart(userId: string, guestItems: any[]) {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw new NotFoundError('Cart not found');

    for (const item of guestItems) {
      try {
        await this.addItem(userId, item);
      } catch {
        // Skip invalid items
      }
    }

    return this.getCart(userId);
  }
}
