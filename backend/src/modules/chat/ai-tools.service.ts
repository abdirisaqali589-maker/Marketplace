import { prisma } from '../../common/prisma';
import { logger } from '../../common/logger';
import { config } from '../../common/config';
import ExcelJS from 'exceljs';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface ToolResult {
  name: string;
  result: any;
}

export class AIToolsService {
  // ── CUSTOMER TOOLS ──

  async searchProducts(query: string, limit = 5): Promise<any> {
    try {
      const products = await prisma.product.findMany({
        where: {
          isActive: true,
          status: 'ACTIVE',
          OR: [
            { title: { contains: query } },
            { description: { contains: query } },
          ],
        },
        take: limit,
        orderBy: { totalSales: 'desc' },
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          seller: { select: { storeName: true } },
          category: { select: { name: true } },
          variants: { where: { isActive: true }, take: 1, select: { stock: true, price: true } },
        } as any,
      });
      return (products as any[]).map((p: any) => ({
        id: p.id, title: p.title, slug: p.slug,
        price: p.discountPrice || p.basePrice, originalPrice: p.basePrice,
        currency: p.currency, image: p.images?.[0]?.url || null,
        store: p.seller?.storeName || '', category: p.category?.name || null,
        rating: p.rating, totalSales: p.totalSales,
        stock: p.variants?.[0]?.stock || 0,
      }));
    } catch (error: any) {
      logger.error('AITool: searchProducts failed', { error: error.message });
      return { error: `Search failed: ${error.message}` };
    }
  }

  async getProductBySlug(slug: string): Promise<any> {
    try {
      const product = await (prisma.product.findUnique as any)({
        where: { slug, isActive: true, status: 'ACTIVE' },
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          variants: { where: { isActive: true } },
          seller: { select: { storeName: true, storeSlug: true, rating: true } },
          category: { select: { name: true, slug: true } },
          brand: { select: { name: true } },
          questions: { where: { isApproved: true }, take: 5, orderBy: { createdAt: 'desc' } },
        },
      });
      if (!product) return { error: 'Product not found' };
      return {
        id: product.id, title: product.title, slug: product.slug,
        description: product.description, price: product.discountPrice || product.basePrice,
        originalPrice: product.basePrice, currency: product.currency,
        totalStock: product.variants.reduce((sum: number, v: any) => sum + v.stock, 0),
        images: (product.images as any[]).map((i: any) => i.url),
        variants: (product.variants as any[]).map((v: any) => ({
          id: v.id, sku: v.sku, attributes: v.attributes ? JSON.parse(v.attributes) : {},
          price: v.discountPrice || v.price, stock: v.stock,
        })),
        store: product.seller.storeName, storeSlug: product.seller.storeSlug,
        category: product.category?.name, brand: product.brand?.name,
        rating: product.rating, totalSales: product.totalSales, isFeatured: product.isFeatured,
      };
    } catch (error: any) {
      logger.error('AITool: getProductBySlug failed', { error: error.message, slug });
      return { error: `Failed to fetch product: ${error.message}` };
    }
  }

  async listCategories(): Promise<any[]> {
    try {
      const categories = await prisma.category.findMany({
        where: { isActive: true, parentId: null },
        include: { children: { where: { isActive: true }, select: { id: true, name: true, slug: true } } },
        orderBy: { sortOrder: 'asc' }, take: 20,
      });
      return categories.map(c => ({
        id: c.id, name: c.name, slug: c.slug, description: c.description,
        image: c.image || null,
        subcategories: c.children.map(ch => ({ id: ch.id, name: ch.name, slug: ch.slug })),
      }));
    } catch (error: any) {
      logger.error('AITool: listCategories failed', { error: error.message });
      return [];
    }
  }

  async getCart(userId: string): Promise<any> {
    try {
      const cart = await prisma.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: { select: { id: true, title: true, slug: true, basePrice: true, discountPrice: true, currency: true } },
              variant: { select: { id: true, sku: true, attributes: true, stock: true } },
            },
          },
        },
      });
      if (!cart) return { items: [], total: 0, itemCount: 0 };
      const items = cart.items.map(item => ({
        id: item.id, productId: item.productId, title: item.product.title,
        slug: item.product.slug, price: item.product.discountPrice || item.product.basePrice,
        currency: item.product.currency, quantity: item.quantity,
        variant: item.variant ? { sku: item.variant.sku, attributes: item.variant.attributes ? JSON.parse(item.variant.attributes) : {} } : null,
      }));
      const total = items.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0);
      return { items, total, currency: items[0]?.currency || 'TZS', itemCount: items.length };
    } catch (error: any) {
      logger.error('AITool: getCart failed', { error: error.message });
      return { error: 'Failed to retrieve cart' };
    }
  }

  async addToCart(userId: string, productId: string, variantId?: string, quantity = 1): Promise<any> {
    try {
      const product = await prisma.product.findUnique({ where: { id: productId }, include: { variants: { where: { isActive: true } } } });
      if (!product) return { success: false, message: 'Product not found' };
      if (!product.isActive || product.status !== 'ACTIVE') return { success: false, message: 'Product is not available' };

      // Check stock from variants
      const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
      if (totalStock < quantity) return { success: false, message: `Insufficient stock. Only ${totalStock} available.` };

      let cart = await prisma.cart.findUnique({ where: { userId } });
      if (!cart) cart = await prisma.cart.create({ data: { userId } });

      const existing = await prisma.cartItem.findFirst({
        where: { cartId: cart.id, productId, variantId: variantId || null },
      });
      if (existing) {
        const newQty = existing.quantity + quantity;
        await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: newQty } });
      } else {
        await prisma.cartItem.create({
          data: { cartId: cart.id, productId, variantId: variantId || null, sellerId: product.sellerId, quantity },
        });
      }
      const updatedCart = await this.getCart(userId);
      return { success: true, message: `${product.title} added to cart`, cart: updatedCart };
    } catch (error: any) {
      logger.error('AITool: addToCart failed', { error: error.message });
      return { success: false, message: `Failed to add to cart: ${error.message}` };
    }
  }

  async removeFromCart(userId: string, itemId: string): Promise<any> {
    try {
      const cart = await prisma.cart.findUnique({ where: { userId } });
      if (!cart) return { success: false, message: 'Cart not found' };
      const item = await prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id } });
      if (!item) return { success: false, message: 'Item not found in cart' };
      await prisma.cartItem.delete({ where: { id: itemId } });
      return { success: true, message: 'Item removed from cart', cart: await this.getCart(userId) };
    } catch (error: any) {
      return { success: false, message: `Failed to remove item: ${error.message}` };
    }
  }

  async updateCartItem(userId: string, itemId: string, quantity: number): Promise<any> {
    try {
      if (quantity < 1) return { success: false, message: 'Quantity must be at least 1' };
      const cart = await prisma.cart.findUnique({ where: { userId } });
      if (!cart) return { success: false, message: 'Cart not found' };
      const item = await prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id } });
      if (!item) return { success: false, message: 'Item not found in cart' };
      await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
      return { success: true, message: 'Cart updated', cart: await this.getCart(userId) };
    } catch (error: any) {
      return { success: false, message: `Failed to update cart: ${error.message}` };
    }
  }

  async clearCart(userId: string): Promise<any> {
    try {
      const cart = await prisma.cart.findUnique({ where: { userId } });
      if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      return { success: true, message: 'Cart cleared' };
    } catch (error: any) {
      return { success: false, message: `Failed to clear cart: ${error.message}` };
    }
  }

  async getWishlist(userId: string): Promise<any> {
    try {
      const items = await prisma.wishlistItem.findMany({
        where: { userId },
        include: {
          product: {
            select: { id: true, title: true, slug: true, basePrice: true, discountPrice: true, currency: true },
            include: { images: { where: { isPrimary: true }, take: 1 } },
          } as any,
        },
        orderBy: { createdAt: 'desc' },
      });
      return items.map(w => ({
        id: w.id, productId: w.productId,
        title: w.product.title, slug: w.product.slug,
        price: w.product.discountPrice || w.product.basePrice,
        currency: w.product.currency,
        image: (w.product as any).images?.[0]?.url || null,
        addedAt: w.createdAt,
      }));
    } catch (error: any) {
      return { error: 'Failed to fetch wishlist' };
    }
  }

  async addToWishlist(userId: string, productId: string): Promise<any> {
    try {
      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) return { success: false, message: 'Product not found' };
      const existing = await prisma.wishlistItem.findFirst({ where: { userId, productId } });
      if (existing) return { success: false, message: 'Product already in wishlist' };
      await prisma.wishlistItem.create({ data: { userId, productId } });
      return { success: true, message: `${product.title} added to wishlist` };
    } catch (error: any) {
      return { success: false, message: `Failed: ${error.message}` };
    }
  }

  async removeFromWishlist(userId: string, productId: string): Promise<any> {
    try {
      const item = await prisma.wishlistItem.findFirst({ where: { userId, productId } });
      if (!item) return { success: false, message: 'Item not in wishlist' };
      await prisma.wishlistItem.delete({ where: { id: item.id } });
      return { success: true, message: 'Removed from wishlist' };
    } catch (error: any) {
      return { success: false, message: `Failed: ${error.message}` };
    }
  }

  async getUserOrders(userId: string, limit = 5, status?: string): Promise<any> {
    try {
      const where: any = { userId };
      if (status) where.status = status;
      const orders = await prisma.order.findMany({
        where, orderBy: { createdAt: 'desc' }, take: limit,
        include: {
          items: { include: { product: { select: { id: true, title: true, slug: true } } } },
          seller: { select: { storeName: true } },
        },
      });
      return orders.map(o => ({
        id: o.id, orderNumber: o.orderNumber, status: o.status,
        total: o.totalAmount, subtotal: o.subtotal,
        shippingCost: o.shippingFee,
        paymentStatus: o.paymentStatus, paymentMethod: o.paymentMethod,
        shippingAddress: o.shippingAddress,
        items: o.items.map(i => ({ title: i.product.title, quantity: i.quantity, price: i.unitPrice })),
        store: o.seller.storeName, createdAt: o.createdAt, updatedAt: o.updatedAt,
      }));
    } catch (error: any) {
      return { error: `Failed to fetch orders: ${error.message}` };
    }
  }

  async getOrderDetail(userId: string, orderId: string): Promise<any> {
    try {
      const order = await prisma.order.findFirst({
        where: { id: orderId, userId },
        include: {
          items: { include: { product: { select: { id: true, title: true, slug: true } } } },
          seller: { select: { storeName: true, storeSlug: true } },
          payments: { select: { id: true, status: true, amount: true, method: true, createdAt: true } },
        },
      });
      if (!order) return { error: 'Order not found' };
      return {
        id: order.id, orderNumber: order.orderNumber, status: order.status,
        total: order.totalAmount, subtotal: order.subtotal,
        shippingCost: order.shippingFee, taxAmount: order.taxAmount,
        paymentStatus: order.paymentStatus, paymentMethod: order.paymentMethod,
        shippingAddress: order.shippingAddress, notes: order.notes,
        items: order.items.map(i => ({ title: i.product.title, quantity: i.quantity, price: i.unitPrice })),
        store: order.seller.storeName, createdAt: order.createdAt, updatedAt: order.updatedAt,
        payments: order.payments,
      };
    } catch (error: any) {
      return { error: `Failed to fetch order: ${error.message}` };
    }
  }

  async getFeaturedProducts(limit = 4): Promise<any[]> {
    try {
      const products = await prisma.product.findMany({
        where: { isActive: true, status: 'ACTIVE', isFeatured: true },
        take: limit, orderBy: { totalSales: 'desc' },
        include: { images: { where: { isPrimary: true }, take: 1 }, seller: { select: { storeName: true } } },
      });
      return products.map(p => ({
        id: p.id, title: p.title, slug: p.slug, price: p.discountPrice || p.basePrice,
        image: p.images[0]?.url || null, store: p.seller.storeName, rating: p.rating,
      }));
    } catch (error: any) {
      return [];
    }
  }

  async getPlatformStats(): Promise<any> {
    try {
      const [productCount, sellerCount, categoryCount, orderCount] = await Promise.all([
        prisma.product.count({ where: { isActive: true, status: 'ACTIVE' } }),
        prisma.seller.count({ where: { isActive: true, isVerified: true } }),
        prisma.category.count({ where: { isActive: true, parentId: null } }),
        prisma.order.count(),
      ]);
      return { activeProducts: productCount, verifiedSellers: sellerCount, categories: categoryCount, totalOrders: orderCount, name: 'MarketPlace' };
    } catch { return null; }
  }

  async getNavigationLinks(role = 'CUSTOMER'): Promise<any> {
    const shared = [
      { label: 'Home', href: '/' },
      { label: 'Products', href: '/products' },
      { label: 'Cart', href: '/cart' },
      { label: 'AI Chat', href: '/ai-chat' },
    ];
    const customer = [
      { label: 'My orders', href: '/account/orders' },
      { label: 'Wishlist', href: '/account/wishlist' },
      { label: 'Checkout', href: '/checkout' },
      { label: 'Profile', href: '/account/profile' },
    ];
    const seller = [
      { label: 'Seller dashboard', href: '/seller' },
      { label: 'Seller products', href: '/seller/products' },
      { label: 'Seller orders', href: '/seller/orders' },
      { label: 'Seller analytics', href: '/seller/analytics' },
      { label: 'Seller payouts', href: '/seller/payouts' },
    ];
    const admin = [
      { label: 'Admin dashboard', href: '/admin' },
      { label: 'Admin products', href: '/admin/products' },
      { label: 'Admin users', href: '/admin/users' },
      { label: 'Admin orders', href: '/admin/orders' },
      { label: 'Announcements', href: '/admin/announcements' },
      { label: 'Promotions', href: '/admin/config' },
      { label: 'AI tools', href: '/admin/ai-tools' },
      { label: 'AI providers', href: '/admin/ai-providers' },
      { label: 'System config', href: '/admin/config' },
    ];

    return {
      role,
      links: [
        ...shared,
        ...(role === 'SELLER' ? seller : []),
        ...(['ADMIN', 'SUPER_ADMIN'].includes(role) ? [...seller, ...admin] : customer),
      ],
      message: 'Use these href values as markdown links when guiding users through the app.',
    };
  }

  // ── SELLER TOOLS ──

  async getSellerProfile(userId: string): Promise<any> {
    try {
      const seller = await prisma.seller.findUnique({
        where: { userId },
        include: { _count: { select: { products: true, orders: true } } },
      });
      if (!seller) return { error: 'Seller profile not found. You need to register as a seller.' };
      return {
        id: seller.id, storeName: seller.storeName, storeSlug: seller.storeSlug,
        description: seller.storeDescription, logo: seller.storeLogo, banner: seller.storeBanner,
        storeLocation: seller.storeLocation, sellerType: seller.sellerType,
        kycStatus: seller.kycStatus, isVerified: seller.isVerified,
        rating: seller.rating, totalRevenue: seller.totalRevenue,
        productCount: seller._count.products, orderCount: seller._count.orders,
        commission: seller.commissionRate, createdAt: seller.createdAt,
      };
    } catch (error: any) {
      return { error: 'Failed to get seller profile' };
    }
  }

  async updateSellerProfile(userId: string, data: any): Promise<any> {
    try {
      const seller = await prisma.seller.findUnique({ where: { userId } });
      if (!seller) return { error: 'Seller not found' };
      const updateData: Record<string, any> = {};
      if (data.storeName !== undefined) updateData.storeName = data.storeName;
      if (data.description !== undefined) updateData.storeDescription = data.description;
      if (data.phone !== undefined) updateData.shippingPolicy = data.phone;
      if (data.address !== undefined) updateData.storeLocation = data.address;
      if (data.logo !== undefined) updateData.storeLogo = data.logo;
      if (data.banner !== undefined) updateData.storeBanner = data.banner;
      const updated = await prisma.seller.update({ where: { userId }, data: updateData });
      return { success: true, message: 'Seller profile updated', storeName: updated.storeName };
    } catch (error: any) {
      return { success: false, message: `Failed to update: ${error.message}` };
    }
  }

  async getSellerProducts(userId: string, query?: string, status?: string, limit = 20, page = 1): Promise<any> {
    try {
      const seller = await prisma.seller.findUnique({ where: { userId } });
      if (!seller) return { error: 'Seller not found' };
      const where: any = { sellerId: seller.id };
      if (query) where.OR = [{ title: { contains: query } }, { description: { contains: query } }];
      if (status) where.status = status;
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
          include: { images: { where: { isPrimary: true }, take: 1 }, category: { select: { name: true } }, variants: { take: 1, select: { stock: true } } },
        }),
        prisma.product.count({ where }),
      ]);
      return {
        products: products.map((p: any) => ({
          id: p.id, title: p.title, slug: p.slug, price: p.discountPrice || p.basePrice,
          originalPrice: p.basePrice, currency: p.currency,
          stock: p.variants?.[0]?.stock || 0,
          status: p.status, isActive: p.isActive, isFeatured: p.isFeatured,
          image: p.images[0]?.url || null, category: p.category?.name || null,
          totalSales: p.totalSales, rating: p.rating, createdAt: p.createdAt,
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    } catch (error: any) {
      return { error: `Failed to fetch products: ${error.message}` };
    }
  }

  async createProduct(userId: string, data: any): Promise<any> {
    try {
      const seller = await prisma.seller.findUnique({ where: { userId } });
      if (!seller) return { success: false, message: 'Seller profile not found' };
      if (!seller.isVerified) return { success: false, message: 'Seller account is not verified' };

      const slug = data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const product = await prisma.product.create({
        data: {
          title: data.title, slug,
          description: data.description || '', basePrice: data.price,
          discountPrice: data.discountPrice || null, currency: data.currency || 'TZS',
          sellerId: seller.id, categoryId: data.categoryId || null,
          brandId: data.brandId || null,
          status: 'DRAFT', isActive: false,
        },
      });

      // Create default variant with stock if provided
      if (data.stock) {
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            sku: data.sku || `${slug}-default`,
            price: data.price,
            stock: data.stock || 0,
          },
        });
      }

      return { success: true, message: `Product "${product.title}" created as DRAFT`, productId: product.id, slug: product.slug };
    } catch (error: any) {
      return { success: false, message: `Failed to create product: ${error.message}` };
    }
  }

  async updateProduct(userId: string, productId: string, data: any): Promise<any> {
    try {
      const seller = await prisma.seller.findUnique({ where: { userId } });
      if (!seller) return { success: false, message: 'Seller not found' };
      const product = await prisma.product.findFirst({ where: { id: productId, sellerId: seller.id } });
      if (!product) return { success: false, message: 'Product not found or not yours' };
      const updateData: Record<string, any> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.price !== undefined) updateData.basePrice = data.price;
      if (data.discountPrice !== undefined) updateData.discountPrice = data.discountPrice;
      if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
      if (data.brandId !== undefined) updateData.brandId = data.brandId;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.status !== undefined) updateData.status = data.status;
      await prisma.product.update({ where: { id: productId }, data: updateData });

      // Update stock on the first variant if requested
      if (data.stock !== undefined) {
        const variant = await prisma.productVariant.findFirst({ where: { productId } });
        if (variant) {
          await prisma.productVariant.update({ where: { id: variant.id }, data: { stock: data.stock } });
        }
      }

      return { success: true, message: `Product "${product.title}" updated` };
    } catch (error: any) {
      return { success: false, message: `Failed to update product: ${error.message}` };
    }
  }

  async getSellerOrders(userId: string, status?: string, limit = 10, page = 1): Promise<any> {
    try {
      const seller = await prisma.seller.findUnique({ where: { userId } });
      if (!seller) return { error: 'Seller not found' };
      const where: any = { sellerId: seller.id };
      if (status) where.status = status;
      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
          include: {
            items: { include: { product: { select: { title: true, slug: true } } } },
            user: { select: { firstName: true, lastName: true, email: true, phone: true } },
          },
        }),
        prisma.order.count({ where }),
      ]);
      return {
        orders: orders.map(o => ({
          id: o.id, orderNumber: o.orderNumber, status: o.status,
          total: o.totalAmount,
          paymentStatus: o.paymentStatus, shippingAddress: o.shippingAddress,
          items: o.items.map(i => ({ title: i.product.title, quantity: i.quantity, price: i.unitPrice })),
          customer: { name: `${o.user.firstName || ''} ${o.user.lastName || ''}`.trim(), email: o.user.email, phone: o.user.phone },
          createdAt: o.createdAt,
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    } catch (error: any) {
      return { error: `Failed to fetch orders: ${error.message}` };
    }
  }

  async updateOrderStatus(userId: string, orderId: string, status: string): Promise<any> {
    try {
      const seller = await prisma.seller.findUnique({ where: { userId } });
      if (!seller) return { success: false, message: 'Seller not found' };
      const order = await prisma.order.findFirst({ where: { id: orderId, sellerId: seller.id } });
      if (!order) return { success: false, message: 'Order not found or not yours' };
      const validTransitions: Record<string, string[]> = {
        'PENDING_PAYMENT': ['CONFIRMED', 'CANCELLED'],
        'CONFIRMED': ['PROCESSING', 'CANCELLED'],
        'PROCESSING': ['SHIPPED', 'CANCELLED'],
        'SHIPPED': ['DELIVERED'],
        'DELIVERED': [],
        'CANCELLED': [],
      };
      const allowed = validTransitions[order.status] || [];
      if (!allowed.includes(status)) return { success: false, message: `Cannot transition from ${order.status} to ${status}. Allowed: ${allowed.join(', ') || 'none'}` };
      await prisma.order.update({ where: { id: orderId }, data: { status } });
      return { success: true, message: `Order ${order.orderNumber} updated to ${status}` };
    } catch (error: any) {
      return { success: false, message: `Failed to update order: ${error.message}` };
    }
  }

  async getSellerAnalytics(userId: string, period = 'this_month'): Promise<any> {
    try {
      const seller = await prisma.seller.findUnique({ where: { userId } });
      if (!seller) return { error: 'Seller not found' };
      const now = new Date();
      let startDate: Date;
      switch (period) {
        case 'today': startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
        case 'this_week': startDate = new Date(now); startDate.setDate(now.getDate() - now.getDay()); startDate.setHours(0, 0, 0, 0); break;
        case 'this_month': startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
        case 'this_year': startDate = new Date(now.getFullYear(), 0, 1); break;
        default: startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      const [orders, totalRevenue, totalProducts] = await Promise.all([
        prisma.order.count({ where: { sellerId: seller.id, createdAt: { gte: startDate } } }),
        prisma.order.aggregate({ where: { sellerId: seller.id, createdAt: { gte: startDate }, paymentStatus: 'PAID' }, _sum: { totalAmount: true } }),
        prisma.product.count({ where: { sellerId: seller.id } }),
      ]);
      return { period, totalOrders: orders, totalRevenue: totalRevenue._sum.totalAmount || 0, totalProducts };
    } catch (error: any) {
      return { error: 'Failed to fetch analytics' };
    }
  }

  async submitKyc(userId: string, kycData: any): Promise<any> {
    try {
      const seller = await prisma.seller.findUnique({ where: { userId } });
      if (!seller) return { success: false, message: 'Seller not found. Register as a seller first.' };
      await prisma.seller.update({ where: { userId }, data: { kycDocuments: JSON.stringify(kycData), kycStatus: 'PENDING' } });
      return { success: true, message: 'KYC documents submitted for review. You will be notified once verified.' };
    } catch (error: any) {
      return { success: false, message: `KYC submission failed: ${error.message}` };
    }
  }

  async getSellerPayouts(userId: string, limit = 10): Promise<any> {
    try {
      const seller = await prisma.seller.findUnique({ where: { userId } });
      if (!seller) return { error: 'Seller not found' };
      const payouts = await prisma.sellerPayout.findMany({
        where: { sellerId: seller.id }, orderBy: { createdAt: 'desc' }, take: limit,
      });
      return payouts.map(p => ({
        id: p.id, amount: p.amount, status: p.status, method: p.method,
        accountRef: p.accountRef, createdAt: p.createdAt, paidAt: p.paidAt,
      }));
    } catch { return []; }
  }

  // ── ADMIN TOOLS ──

  async getAdminDashboard(): Promise<any> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const [totalUsers, totalSellers, totalOrders, totalProducts, totalRevenue, pendingSellers, pendingReturns] = await Promise.all([
        prisma.user.count(),
        prisma.seller.count(),
        prisma.order.count(),
        prisma.product.count(),
        prisma.order.aggregate({ where: { status: 'DELIVERED' }, _sum: { totalAmount: true } }),
        prisma.seller.count({ where: { kycStatus: 'PENDING' } }),
        prisma.returnRequest.count({ where: { status: 'PENDING' } }),
      ]);
      return { totalUsers, totalSellers, totalOrders, totalProducts, totalRevenue: totalRevenue._sum.totalAmount || 0, pendingSellers, pendingReturns };
    } catch { return { error: 'Failed to fetch dashboard' }; }
  }

  async listOrders(search?: string, status?: string, limit = 20, page = 1): Promise<any> {
    try {
      const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
      const safePage = Math.max(Number(page) || 1, 1);
      const where: Record<string, any> = {};
      if (status) where.status = status;
      if (search) {
        where.OR = [
          { orderNumber: { contains: search } },
          { user: { email: { contains: search } } },
          { seller: { storeName: { contains: search } } },
        ];
      }

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (safePage - 1) * safeLimit,
          take: safeLimit,
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
            seller: { select: { id: true, storeName: true, storeSlug: true } },
            items: { select: { quantity: true, unitPrice: true, totalPrice: true, product: { select: { id: true, title: true, slug: true } } } },
          },
        }),
        prisma.order.count({ where }),
      ]);

      return {
        orders: orders.map(order => ({
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          totalAmount: order.totalAmount,
          currency: 'TZS',
          customer: {
            id: order.user.id,
            name: `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() || order.user.email || 'Customer',
            email: order.user.email,
          },
          seller: order.seller,
          itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
          items: order.items.map(item => ({
            productId: item.product.id,
            title: item.product.title,
            slug: item.product.slug,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })),
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        })),
        pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) },
        navigation: {
          adminOrders: '/admin/orders',
          adminDashboard: '/admin',
        },
      };
    } catch (error: any) {
      return { error: `Failed to list orders: ${error.message}` };
    }
  }

  async listUsers(search?: string, role?: string, limit = 20, page = 1): Promise<any> {
    try {
      const where: Record<string, any> = {};
      if (search) where.OR = [{ email: { contains: search } }, { firstName: { contains: search } }, { lastName: { contains: search } }];
      if (role) where.role = role;
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where, select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, isVerified: true, kycStatus: true, createdAt: true },
          orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
        }),
        prisma.user.count({ where }),
      ]);
      return { users, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    } catch { return { error: 'Failed to list users' }; }
  }

  async toggleUserStatus(userId: string): Promise<any> {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return { success: false, message: 'User not found' };
      const updated = await prisma.user.update({ where: { id: userId }, data: { isActive: !user.isActive } });
      return { success: true, message: `User ${updated.isActive ? 'activated' : 'deactivated'}`, isActive: updated.isActive };
    } catch { return { success: false, message: 'Failed to toggle user status' }; }
  }

  async verifySeller(sellerId: string): Promise<any> {
    try {
      const seller = await prisma.seller.findUnique({ where: { id: sellerId } });
      if (!seller) return { success: false, message: 'Seller not found' };
      await prisma.seller.update({ where: { id: sellerId }, data: { kycStatus: 'VERIFIED', isVerified: true } });
      return { success: true, message: `Seller "${seller.storeName}" verified successfully` };
    } catch { return { success: false, message: 'Failed to verify seller' }; }
  }

  async rejectSeller(sellerId: string, reason: string): Promise<any> {
    try {
      const seller = await prisma.seller.findUnique({ where: { id: sellerId } });
      if (!seller) return { success: false, message: 'Seller not found' };
      await prisma.seller.update({ where: { id: sellerId }, data: { kycStatus: 'REJECTED', kycDocuments: reason ? JSON.stringify({ rejectionReason: reason }) : undefined } });
      return { success: true, message: `Seller "${seller.storeName}" rejected` };
    } catch { return { success: false, message: 'Failed to reject seller' }; }
  }

  async listRoles(): Promise<any> {
    try {
      const roles = await prisma.adminRole.findMany({ include: { _count: { select: { users: true } } }, orderBy: { name: 'asc' } });
      return roles.map(r => ({ id: r.id, name: r.name, description: r.description, permissions: r.permissions ? JSON.parse(r.permissions) : [], isSystem: r.isSystem, userCount: r._count.users }));
    } catch { return []; }
  }

  async createRole(data: any): Promise<any> {
    try {
      const existing = await prisma.adminRole.findUnique({ where: { name: data.name } });
      if (existing) return { success: false, message: 'Role already exists' };
      await prisma.adminRole.create({ data: { name: data.name, description: data.description, permissions: JSON.stringify(data.permissions || []) } });
      return { success: true, message: `Role "${data.name}" created` };
    } catch { return { success: false, message: 'Failed to create role' }; }
  }

  async deleteRole(roleId: string): Promise<any> {
    try {
      const role = await prisma.adminRole.findUnique({ where: { id: roleId }, include: { _count: { select: { users: true } } } });
      if (!role) return { success: false, message: 'Role not found' };
      if (role.isSystem) return { success: false, message: 'Cannot delete system role' };
      if (role._count.users > 0) return { success: false, message: 'Role has assigned users. Remove them first.' };
      await prisma.adminRole.delete({ where: { id: roleId } });
      return { success: true, message: 'Role deleted' };
    } catch { return { success: false, message: 'Failed to delete role' }; }
  }

  async getConfig(key?: string): Promise<any> {
    try {
      if (key) {
        const flag = await prisma.featureFlag.findUnique({ where: { key } });
        if (!flag) return { error: 'Config not found' };
        return { key: flag.key, value: JSON.parse(flag.value), type: flag.type, description: flag.description };
      }
      const flags = await prisma.featureFlag.findMany();
      return flags.map(f => ({ key: f.key, value: JSON.parse(f.value), type: f.type, description: f.description }));
    } catch { return { error: 'Failed to fetch config' }; }
  }

  async updateConfig(key: string, value: any): Promise<any> {
    try {
      await prisma.featureFlag.upsert({
        where: { key },
        create: { key, value: JSON.stringify(value), type: typeof value },
        update: { value: JSON.stringify(value) },
      });
      return { success: true, message: `Configuration "${key}" updated` };
    } catch { return { success: false, message: 'Failed to update config' }; }
  }

  async getThemes(): Promise<any> {
    try {
      const siteTheme = await this.getConfig('site.theme');
      const themeConfig = siteTheme?.value || {};
      const presets = [
        { id: 'marketplace-classic', label: 'Marketplace Classic', homeTemplate: 'dense-marketplace' },
        { id: 'trade-pro', label: 'Trade Pro', homeTemplate: 'supplier-desk' },
        { id: 'fresh-retail', label: 'Fresh Retail', homeTemplate: 'retail-grid' },
        { id: 'mono-luxe', label: 'Mono Luxe', homeTemplate: 'editorial-grid' },
      ];
      return {
        presets,
        currentTheme: themeConfig.presetId || 'marketplace-classic',
        colorMode: themeConfig.colorMode || 'user',
        density: themeConfig.density || 'dense',
        cornerRadius: themeConfig.cornerRadius || 'compact',
        navigation: { adminThemeConfig: '/admin/config', storefront: '/' },
      };
    } catch (error: any) {
      return { error: `Failed to read theme settings: ${error.message}` };
    }
  }

  async setTheme(theme: string): Promise<any> {
    try {
      const current = await this.getConfig('site.theme');
      const value = current?.value || {};
      await prisma.featureFlag.upsert({
        where: { key: 'site.theme' },
        create: { key: 'site.theme', value: JSON.stringify({ ...value, presetId: theme }), type: 'json', description: 'Central storefront theme preset, layout density, and shared design tokens' },
        update: { value: JSON.stringify({ ...value, presetId: theme }) },
      });
      return { success: true, message: `Theme preset changed to "${theme}"`, navigation: { preview: '/', settings: '/admin/config' } };
    } catch (error: any) { return { success: false, message: `Failed to change theme: ${error.message}` }; }
  }

  async setThemeMode(mode: 'light' | 'dark' | 'system' | 'user'): Promise<any> {
    try {
      if (!['light', 'dark', 'system', 'user'].includes(mode)) {
        return { success: false, message: 'Theme mode must be light, dark, system, or user' };
      }
      const current = await this.getConfig('site.theme');
      const value = current?.value || {};
      await prisma.featureFlag.upsert({
        where: { key: 'site.theme' },
        create: {
          key: 'site.theme',
          value: JSON.stringify({ ...value, colorMode: mode }),
          type: 'json',
          description: 'Central storefront theme preset, layout density, and shared design tokens',
        },
        update: { value: JSON.stringify({ ...value, colorMode: mode }) },
      });
      return {
        success: true,
        message: mode === 'user' ? 'Theme mode now follows each user preference' : `Theme mode changed to ${mode}`,
        colorMode: mode,
        navigation: { preview: '/', settings: '/admin/config' },
      };
    } catch (error: any) {
      return { success: false, message: `Failed to update theme mode: ${error.message}` };
    }
  }

  async getPromotionPlacements(): Promise<any> {
    try {
      const [homepage, activeAnnouncements, campaigns, coupons] = await Promise.all([
        this.getConfig('homepage.content'),
        prisma.announcement.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' }, take: 10 }),
        prisma.campaign.findMany({ orderBy: { startAt: 'desc' }, take: 10, include: { _count: { select: { products: true } } } }),
        prisma.couponRule.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
      ]);
      const content = homepage?.value || {};
      return {
        placements: [
          { name: 'Announcement bar', appearsAt: 'Top/global notices where active announcements are rendered', adminLink: '/admin/announcements', items: activeAnnouncements },
          { name: 'Homepage hero', appearsAt: 'Top of storefront homepage', adminLink: '/admin/config', current: { title: content.heroTitle, imageUrl: content.heroImageUrl } },
          { name: 'Homepage promo banners', appearsAt: 'Homepage merchandising banner grid', adminLink: '/admin/config', items: content.promoBanners || [] },
          { name: 'Featured products and deal rail', appearsAt: 'Homepage product rails and product listing filters', adminLink: '/admin/products' },
          { name: 'Campaigns', appearsAt: 'Campaign/deal surfaces and linked product groups', adminLink: '/admin/config', items: campaigns },
          { name: 'Coupons', appearsAt: 'Checkout/order discount flow when a valid code is entered', adminLink: '/admin/config', items: coupons },
        ],
        navigation: { announcements: '/admin/announcements', config: '/admin/config', products: '/admin/products', storefront: '/' },
      };
    } catch (error: any) {
      return { error: `Failed to inspect promotion placements: ${error.message}` };
    }
  }

  async getPageContent(pageKey: string): Promise<any> {
    try {
      const flag = await prisma.featureFlag.findUnique({ where: { key: `page.${pageKey}` } });
      if (!flag) {
        // Also try without 'page.' prefix or as direct key
        const directFlag = await prisma.featureFlag.findUnique({ where: { key: pageKey } });
        if (!directFlag) return { error: `Page "${pageKey}" not found` };
        return { type: 'page', key: directFlag.key, value: JSON.parse(directFlag.value), updatedAt: directFlag.updatedAt, description: directFlag.description };
      }
      return { type: 'page', key: pageKey, value: JSON.parse(flag.value), updatedAt: flag.updatedAt, description: flag.description };
    } catch (error: any) {
      return { error: `Failed to fetch page: ${error.message}` };
    }
  }

  async listPages(search?: string): Promise<any> {
    try {
      const results: any[] = [];
      const pageConfigs = await prisma.featureFlag.findMany({
        where: { key: { startsWith: 'page.' }, ...(search ? { key: { contains: search } } : {}) },
        orderBy: { updatedAt: 'desc' },
      });
      results.push(...pageConfigs.map(f => ({
        type: 'page', key: f.key.replace('page.', ''), value: JSON.parse(f.value), updatedAt: f.updatedAt,
      })));
      try {
        const blogs = await prisma.blogPost.findMany({
          where: search ? { OR: [{ title: { contains: search } }, { content: { contains: search } }] } : {},
          select: { id: true, title: true, slug: true, status: true, updatedAt: true },
          orderBy: { updatedAt: 'desc' }, take: 20,
        });
        results.push(...blogs.map(b => ({ type: 'blog', id: b.id, title: b.title, slug: b.slug, status: b.status, updatedAt: b.updatedAt })));
      } catch { /* skip */ }
      return results;
    } catch { return []; }
  }

  async updatePage(key: string, content: any): Promise<any> {
    try {
      // Support both 'page.xxx' and 'xxx' keys
      const pageKey = key.startsWith('page.') ? key : `page.${key}`;
      await prisma.featureFlag.upsert({
        where: { key: pageKey },
        create: { key: pageKey, value: JSON.stringify(content), type: 'object', description: `Page: ${key.replace('page.', '')}` },
        update: { value: JSON.stringify(content) },
      });
      return { success: true, message: `Page "${key}" updated successfully` };
    } catch { return { success: false, message: 'Failed to update page' }; }
  }

  async updatePageSection(key: string, section: string, content: any): Promise<any> {
    try {
      const pageKey = key.startsWith('page.') ? key : `page.${key}`;
      const flag = await prisma.featureFlag.findUnique({ where: { key: pageKey } });
      let pageContent: any = flag ? JSON.parse(flag.value) : {};
      
      // If page content has sections array, find and update the specific section
      if (pageContent.sections && Array.isArray(pageContent.sections)) {
        const sectionIndex = pageContent.sections.findIndex((s: any) => 
          s.heading?.toLowerCase() === section.toLowerCase() || s.id === section
        );
        if (sectionIndex >= 0) {
          pageContent.sections[sectionIndex] = { ...pageContent.sections[sectionIndex], ...content };
        } else {
          pageContent.sections.push({ heading: section, ...content });
        }
      } else if (pageContent[section] !== undefined) {
        // Direct property update
        pageContent[section] = content;
      } else {
        // Add as new section
        if (!pageContent.sections) pageContent.sections = [];
        pageContent.sections.push({ heading: section, ...content });
      }

      await prisma.featureFlag.upsert({
        where: { key: pageKey },
        create: { key: pageKey, value: JSON.stringify(pageContent), type: 'object', description: `Page: ${key}` },
        update: { value: JSON.stringify(pageContent) },
      });
      return { success: true, message: `Section "${section}" updated on page "${key}"` };
    } catch { return { success: false, message: 'Failed to update page section' }; }
  }

  async deletePageSection(key: string, section: string): Promise<any> {
    try {
      const pageKey = key.startsWith('page.') ? key : `page.${key}`;
      const flag = await prisma.featureFlag.findUnique({ where: { key: pageKey } });
      if (!flag) return { success: false, message: 'Page not found' };
      
      const pageContent = JSON.parse(flag.value);
      
      if (pageContent.sections && Array.isArray(pageContent.sections)) {
        const beforeCount = pageContent.sections.length;
        pageContent.sections = pageContent.sections.filter((s: any) => 
          s.heading?.toLowerCase() !== section.toLowerCase() && s.id !== section
        );
        if (pageContent.sections.length === beforeCount) {
          return { success: false, message: `Section "${section}" not found` };
        }
      } else if (pageContent[section] !== undefined) {
        delete pageContent[section];
      } else {
        return { success: false, message: `Section "${section}" not found` };
      }

      await prisma.featureFlag.update({
        where: { key: pageKey },
        data: { value: JSON.stringify(pageContent) },
      });
      return { success: true, message: `Section "${section}" removed from page "${key}"` };
    } catch { return { success: false, message: 'Failed to delete page section' }; }
  }

  async searchContent(query: string): Promise<any> {
    try {
      const results: any[] = [];
      const lowerQuery = query.toLowerCase();

      // Search in FeatureFlag pages (page.* keys)
      const pageFlags = await prisma.featureFlag.findMany({
        where: { key: { startsWith: 'page.' } },
      });
      for (const flag of pageFlags) {
        try {
          const value = JSON.parse(flag.value);
          const valueStr = JSON.stringify(value).toLowerCase();
          if (valueStr.includes(lowerQuery)) {
            results.push({
              type: 'page',
              key: flag.key.replace('page.', ''),
              title: value.title || value.name || flag.key.replace('page.', ''),
              matchType: 'content',
              updatedAt: flag.updatedAt,
              snippet: valueStr.substring(
                Math.max(0, valueStr.indexOf(lowerQuery) - 50),
                Math.min(valueStr.length, valueStr.indexOf(lowerQuery) + 100)
              ),
            });
          }
        } catch { continue; }
      }

      // Search in all FeatureFlag configs (non-page keys)
      const configFlags = await prisma.featureFlag.findMany({
        where: { key: { not: { startsWith: 'page.' } } },
      });
      for (const flag of configFlags) {
        try {
          const valueStr = JSON.stringify(JSON.parse(flag.value)).toLowerCase();
          if (valueStr.includes(lowerQuery)) {
            results.push({
              type: 'config',
              key: flag.key,
              matchType: 'content',
              updatedAt: flag.updatedAt,
            });
          }
        } catch { continue; }
      }

      // Search in blog posts
      try {
        const blogs = await prisma.blogPost.findMany({
          where: {
            OR: [
              { title: { contains: query } },
              { content: { contains: query } },
            ],
          },
          select: { id: true, title: true, slug: true, content: true, status: true, updatedAt: true },
          take: 10,
        });
        for (const blog of blogs) {
          const contentStr = (blog.content || '').toLowerCase();
          results.push({
            type: 'blog_post',
            id: blog.id,
            title: blog.title,
            slug: blog.slug,
            status: blog.status,
            matchType: contentStr.includes(lowerQuery) ? 'content' : 'title',
            updatedAt: blog.updatedAt,
            snippet: contentStr.includes(lowerQuery) 
              ? contentStr.substring(Math.max(0, contentStr.indexOf(lowerQuery) - 50), Math.min(contentStr.length, contentStr.indexOf(lowerQuery) + 100))
              : undefined,
          });
        }
      } catch { /* blog table may not exist */ }

      return { results, totalResults: results.length, query };
    } catch { return { results: [], totalResults: 0, query }; }
  }

  async getBlogPost(slug: string): Promise<any> {
    try {
      const blog = await prisma.blogPost.findFirst({
        where: { OR: [{ slug }, { id: slug }] },
        select: { id: true, title: true, slug: true, content: true, excerpt: true, status: true, tags: true, createdAt: true, updatedAt: true },
      });
      if (!blog) return { error: 'Blog post not found' };
      return blog;
    } catch { return { error: 'Failed to fetch blog post' }; }
  }

  async updateBlogPost(slug: string, data: any): Promise<any> {
    try {
      const blog = await prisma.blogPost.findFirst({
        where: { OR: [{ slug }, { id: slug }] },
      });
      if (!blog) return { success: false, message: 'Blog post not found' };
      
      const updateData: Record<string, any> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.content !== undefined) updateData.content = data.content;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.excerpt !== undefined) updateData.excerpt = data.excerpt;
      if (data.tags !== undefined) updateData.tags = data.tags;
      
      await prisma.blogPost.update({ where: { id: blog.id }, data: updateData });
      return { success: true, message: `Blog post "${blog.title}" updated` };
    } catch { return { success: false, message: 'Failed to update blog post' }; }
  }

  async listPlugins(): Promise<any> {
    try {
      const plugins = await prisma.plugin.findMany({ orderBy: { name: 'asc' } });
      return plugins.map(p => ({ id: p.id, name: p.name, slug: p.slug, description: p.description, version: p.version, isEnabled: p.isEnabled, settings: p.settings ? JSON.parse(p.settings) : {} }));
    } catch { return []; }
  }

  async togglePlugin(pluginId: string, enabled: boolean): Promise<any> {
    try {
      const plugin = await prisma.plugin.findUnique({ where: { id: pluginId } });
      if (!plugin) return { success: false, message: 'Plugin not found' };
      await prisma.plugin.update({ where: { id: pluginId }, data: { isEnabled: enabled } });
      return { success: true, message: `Plugin "${plugin.name}" ${enabled ? 'enabled' : 'disabled'}` };
    } catch { return { success: false, message: 'Failed to toggle plugin' }; }
  }

  async listAnnouncements(): Promise<any> {
    try {
      const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
      return announcements.map(a => ({ id: a.id, title: a.title, body: a.body, type: a.type, isActive: a.isActive, expiresAt: a.expiresAt, createdAt: a.createdAt }));
    } catch { return []; }
  }

  async createAnnouncement(data: any): Promise<any> {
    try {
      const announcement = await prisma.announcement.create({ data: { title: data.title, body: data.content || data.body, type: (data.type || 'INFO').toUpperCase(), isActive: data.isActive !== false, expiresAt: data.expiresAt ? new Date(data.expiresAt) : null } });
      return { success: true, message: 'Announcement created', announcementId: announcement.id };
    } catch { return { success: false, message: 'Failed to create announcement' }; }
  }

  async updateAnnouncement(announcementId: string, data: any): Promise<any> {
    try {
      const existing = await prisma.announcement.findUnique({ where: { id: announcementId } });
      if (!existing) return { success: false, message: 'Announcement not found' };
      const updated = await prisma.announcement.update({
        where: { id: announcementId },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.body !== undefined && { body: data.body }),
          ...(data.content !== undefined && { body: data.content }),
          ...(data.type !== undefined && { type: String(data.type).toUpperCase() }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
          ...(data.startsAt !== undefined && { startsAt: data.startsAt ? new Date(data.startsAt) : null }),
          ...(data.expiresAt !== undefined && { expiresAt: data.expiresAt ? new Date(data.expiresAt) : null }),
        },
      });
      return { success: true, message: `Announcement "${updated.title}" updated`, announcement: updated, navigation: { announcements: '/admin/announcements' } };
    } catch (error: any) {
      return { success: false, message: `Failed to update announcement: ${error.message}` };
    }
  }

  async toggleAnnouncement(announcementId: string): Promise<any> {
    try {
      const existing = await prisma.announcement.findUnique({ where: { id: announcementId } });
      if (!existing) return { success: false, message: 'Announcement not found' };
      const updated = await prisma.announcement.update({ where: { id: announcementId }, data: { isActive: !existing.isActive } });
      return { success: true, message: `Announcement "${updated.title}" ${updated.isActive ? 'activated' : 'deactivated'}`, announcement: updated };
    } catch (error: any) {
      return { success: false, message: `Failed to toggle announcement: ${error.message}` };
    }
  }

  async getAnalyticsSummary(period = 'all'): Promise<any> {
    try {
      const now = new Date();
      let startDate: Date | null = null;
      switch (period) {
        case 'today': startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
        case 'this_week': startDate = new Date(now); startDate.setDate(now.getDate() - now.getDay()); startDate.setHours(0, 0, 0, 0); break;
        case 'this_month': startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
        case 'this_year': startDate = new Date(now.getFullYear(), 0, 1); break;
      }
      const dateFilter = startDate ? { gte: startDate } : undefined;
      const [totalUsers, totalProducts, totalOrders, totalRevenue, activeSellers] = await Promise.all([
        prisma.user.count({ where: startDate ? { createdAt: dateFilter } : {} }),
        prisma.product.count({ where: { status: 'ACTIVE', ...(startDate ? { createdAt: dateFilter } : {}) } }),
        prisma.order.count({ where: startDate ? { createdAt: dateFilter } : {} }),
        prisma.order.aggregate({ where: { paymentStatus: 'PAID', ...(startDate ? { createdAt: dateFilter } : {}) }, _sum: { totalAmount: true } }),
        prisma.seller.count({ where: { isActive: true } }),
      ]);
      return { period, stats: { totalUsers, totalProducts, totalOrders, totalRevenue: totalRevenue._sum.totalAmount || 0, activeSellers }, summary: `Platform has ${totalUsers} users, ${totalProducts} products, ${activeSellers} active sellers, ${totalOrders} orders, and total revenue of ${totalRevenue._sum.totalAmount || 0}.` };
    } catch { return { error: 'Failed to fetch analytics' }; }
  }

  async generateOrdersReport(format = 'xlsx', period = 'all', status?: string): Promise<any> {
    try {
      const normalizedFormat = String(format || 'xlsx').toLowerCase();
      if (!['xlsx', 'csv', 'doc', 'html', 'pdf'].includes(normalizedFormat)) {
        return { success: false, message: 'Report format must be xlsx, csv, doc, html, or pdf' };
      }

      const now = new Date();
      let startDate: Date | null = null;
      switch (period) {
        case 'today': startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
        case 'this_week': startDate = new Date(now); startDate.setDate(now.getDate() - now.getDay()); startDate.setHours(0, 0, 0, 0); break;
        case 'this_month': startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
        case 'this_year': startDate = new Date(now.getFullYear(), 0, 1); break;
      }
      const where: Record<string, any> = {};
      if (startDate) where.createdAt = { gte: startDate };
      if (status) where.status = status;

      const orders = await prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          seller: { select: { storeName: true } },
          items: { select: { quantity: true, totalPrice: true } },
        },
      });

      const rows = orders.map(order => ({
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        customer: `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() || order.user.email || '',
        customerEmail: order.user.email || '',
        seller: order.seller.storeName,
        itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
        subtotal: order.subtotal,
        discountAmount: order.discountAmount,
        shippingFee: order.shippingFee,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt.toISOString(),
      }));

      const summary = {
        period,
        status: status || 'all',
        orderCount: rows.length,
        revenue: rows.reduce((sum, row) => sum + row.totalAmount, 0),
        generatedAt: now.toISOString(),
      };

      const reportsDir = path.join(config.uploadDir, 'reports');
      await fs.mkdir(reportsDir, { recursive: true });
      const extension = normalizedFormat === 'html' ? 'html' : normalizedFormat;
      const filename = `orders-report-${period}-${uuidv4()}.${extension}`;
      const filePath = path.join(reportsDir, filename);

      if (normalizedFormat === 'xlsx') {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Orders');
        sheet.columns = Object.keys(rows[0] || {
          orderNumber: '', status: '', paymentStatus: '', customer: '', customerEmail: '', seller: '',
          itemCount: 0, subtotal: 0, discountAmount: 0, shippingFee: 0, totalAmount: 0, createdAt: '',
        }).map(key => ({ header: key, key, width: 20 }));
        rows.forEach(row => sheet.addRow(row));
        const summarySheet = workbook.addWorksheet('Summary');
        Object.entries(summary).forEach(([key, value]) => summarySheet.addRow([key, value]));
        await workbook.xlsx.writeFile(filePath);
      } else if (normalizedFormat === 'csv') {
        const headers = Object.keys(rows[0] || summary);
        const escape = (value: any) => `"${String(value ?? '').replace(/"/g, '""')}"`;
        const csv = [headers.join(','), ...rows.map(row => headers.map(key => escape((row as any)[key])).join(','))].join('\n');
        await fs.writeFile(filePath, csv, 'utf8');
      } else if (normalizedFormat === 'pdf') {
        await fs.writeFile(filePath, this.buildSimplePdf([
          'Orders and Sales Report',
          `Period: ${summary.period}`,
          `Orders: ${summary.orderCount}`,
          `Revenue: ${summary.revenue}`,
          `Generated: ${summary.generatedAt}`,
          '',
          ...rows.slice(0, 40).map(row => `${row.orderNumber} | ${row.status} | ${row.seller} | ${row.totalAmount}`),
        ]));
      } else {
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>Orders Report</title></head><body><h1>Orders and Sales Report</h1><pre>${JSON.stringify(summary, null, 2)}</pre><table border="1" cellspacing="0" cellpadding="6"><thead><tr>${Object.keys(rows[0] || {}).map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${Object.values(row).map(v => `<td>${String(v ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
        await fs.writeFile(filePath, html, 'utf8');
      }

      return {
        success: true,
        message: `Orders report generated as ${normalizedFormat.toUpperCase()}`,
        summary,
        file: {
          filename,
          url: `/uploads/reports/${filename}`,
          downloadUrl: `/uploads/reports/${filename}`,
          format: normalizedFormat,
        },
        navigation: { adminOrders: '/admin/orders', adminDashboard: '/admin' },
      };
    } catch (error: any) {
      return { success: false, message: `Failed to generate report: ${error.message}` };
    }
  }

  async generateUsersReport(format = 'xlsx', role?: string): Promise<any> {
    try {
      const normalizedFormat = String(format || 'xlsx').toLowerCase();
      if (!['xlsx', 'csv', 'doc', 'html', 'pdf'].includes(normalizedFormat)) {
        return { success: false, message: 'Report format must be xlsx, csv, doc, html, or pdf' };
      }

      const where: Record<string, any> = {};
      if (role) where.role = role;
      const users = await prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          isVerified: true,
          kycStatus: true,
          createdAt: true,
          seller: { select: { storeName: true, storeSlug: true, isVerified: true, kycStatus: true } },
        },
      });

      const rows = users.map(user => ({
        id: user.id,
        email: user.email || '',
        phone: user.phone || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        role: user.role,
        isActive: user.isActive ? 'Yes' : 'No',
        isVerified: user.isVerified ? 'Yes' : 'No',
        kycStatus: user.kycStatus,
        sellerStore: user.seller?.storeName || '',
        sellerVerified: user.seller ? (user.seller.isVerified ? 'Yes' : 'No') : '',
        sellerKycStatus: user.seller?.kycStatus || '',
        createdAt: user.createdAt.toISOString(),
      }));

      const summary = {
        role: role || 'all',
        userCount: rows.length,
        generatedAt: new Date().toISOString(),
      };

      const reportsDir = path.join(config.uploadDir, 'reports');
      await fs.mkdir(reportsDir, { recursive: true });
      const extension = normalizedFormat === 'html' ? 'html' : normalizedFormat;
      const filename = `users-report-${role || 'all'}-${uuidv4()}.${extension}`;
      const filePath = path.join(reportsDir, filename);

      if (normalizedFormat === 'xlsx') {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Users');
        sheet.columns = Object.keys(rows[0] || {
          id: '', email: '', phone: '', firstName: '', lastName: '', role: '', isActive: '',
          isVerified: '', kycStatus: '', sellerStore: '', sellerVerified: '', sellerKycStatus: '', createdAt: '',
        }).map(key => ({ header: key, key, width: 22 }));
        rows.forEach(row => sheet.addRow(row));
        const summarySheet = workbook.addWorksheet('Summary');
        Object.entries(summary).forEach(([key, value]) => summarySheet.addRow([key, value]));
        await workbook.xlsx.writeFile(filePath);
      } else if (normalizedFormat === 'csv') {
        const headers = Object.keys(rows[0] || summary);
        const escape = (value: any) => `"${String(value ?? '').replace(/"/g, '""')}"`;
        const csv = [headers.join(','), ...rows.map(row => headers.map(key => escape((row as any)[key])).join(','))].join('\n');
        await fs.writeFile(filePath, csv, 'utf8');
      } else if (normalizedFormat === 'pdf') {
        await fs.writeFile(filePath, this.buildSimplePdf([
          'Users Report',
          `Role: ${summary.role}`,
          `Users: ${summary.userCount}`,
          `Generated: ${summary.generatedAt}`,
          '',
          ...rows.slice(0, 40).map(row => `${row.email || row.phone} | ${row.firstName} ${row.lastName} | ${row.role} | active: ${row.isActive}`),
        ]));
      } else {
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>Users Report</title></head><body><h1>Users Report</h1><pre>${JSON.stringify(summary, null, 2)}</pre><table border="1" cellspacing="0" cellpadding="6"><thead><tr>${Object.keys(rows[0] || {}).map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${Object.values(row).map(v => `<td>${String(v ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
        await fs.writeFile(filePath, html, 'utf8');
      }

      return {
        success: true,
        message: `Users report generated as ${normalizedFormat.toUpperCase()}`,
        summary,
        file: {
          filename,
          url: `/uploads/reports/${filename}`,
          downloadUrl: `/uploads/reports/${filename}`,
          format: normalizedFormat,
        },
        navigation: { adminUsers: '/admin/users', adminDashboard: '/admin' },
      };
    } catch (error: any) {
      return { success: false, message: `Failed to generate users report: ${error.message}` };
    }
  }

  private buildSimplePdf(lines: string[]): Buffer {
    const escapedLines = lines.map(line => String(line).replace(/[()\\]/g, '\\$&'));
    const text = escapedLines.map((line, index) => `BT /F1 10 Tf 50 ${760 - index * 16} Td (${line.slice(0, 100)}) Tj ET`).join('\n');
    const objects = [
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
      '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
      `5 0 obj << /Length ${Buffer.byteLength(text)} >> stream\n${text}\nendstream endobj`,
    ];
    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    for (const object of objects) {
      offsets.push(Buffer.byteLength(pdf));
      pdf += `${object}\n`;
    }
    const xref = Buffer.byteLength(pdf);
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach(offset => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
    pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return Buffer.from(pdf);
  }

  async getAuditLogs(action?: string, entity?: string, limit = 20, page = 1): Promise<any> {
    try {
      const where: Record<string, any> = {};
      if (action) where.action = action;
      if (entity) where.entity = entity;
      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({ where, include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
        prisma.auditLog.count({ where }),
      ]);
      return { logs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    } catch { return { error: 'Failed to fetch audit logs' }; }
  }

  async sendNotification(userId: string, title: string, message: string, type = 'info'): Promise<any> {
    try {
      await prisma.notification.create({ data: { userId, title, body: message, type } });
      return { success: true, message: 'Notification sent' };
    } catch { return { success: false, message: 'Failed to send notification' }; }
  }

  async getReturnRequests(status?: string, limit = 20, page = 1): Promise<any> {
    try {
      const where: Record<string, any> = {};
      if (status) where.status = status;
      const [returns, total] = await Promise.all([
        prisma.returnRequest.findMany({
          where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
          include: { user: { select: { firstName: true, lastName: true, email: true } }, order: { select: { orderNumber: true } } },
        }),
        prisma.returnRequest.count({ where }),
      ]);
      return { returns: returns.map(r => ({ id: r.id, orderNumber: r.order.orderNumber, reason: r.reason, status: r.status, amount: r.refundAmount, customer: `${r.user.firstName} ${r.user.lastName}`.trim(), createdAt: r.createdAt })), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    } catch { return { error: 'Failed to fetch returns' }; }
  }

  async processReturn(returnId: string, action: 'approve' | 'reject', reason?: string): Promise<any> {
    try {
      const returnReq = await prisma.returnRequest.findUnique({ where: { id: returnId } });
      if (!returnReq) return { success: false, message: 'Return request not found' };
      const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
      await prisma.returnRequest.update({ where: { id: returnId }, data: { status: newStatus, adminNote: reason } });
      return { success: true, message: `Return request ${newStatus.toLowerCase()}` };
    } catch { return { success: false, message: 'Failed to process return' }; }
  }

  async getWorkflows(): Promise<any> {
    try {
      const templates = await prisma.workflowTemplate.findMany({ orderBy: { name: 'asc' } });
      return templates.map(t => ({ id: t.id, name: t.name, slug: t.slug, description: t.description, category: t.category, isEnabled: t.isEnabled, steps: t.steps ? JSON.parse(t.steps) : [], triggers: t.triggers ? JSON.parse(t.triggers) : [], createdAt: t.createdAt }));
    } catch { return []; }
  }

  async toggleWorkflow(workflowId: string): Promise<any> {
    try {
      const template = await prisma.workflowTemplate.findUnique({ where: { id: workflowId } });
      if (!template) return { success: false, message: 'Workflow not found' };
      await prisma.workflowTemplate.update({ where: { id: workflowId }, data: { isEnabled: !template.isEnabled } });
      return { success: true, message: `Workflow "${template.name}" ${template.isEnabled ? 'disabled' : 'enabled'}` };
    } catch { return { success: false, message: 'Failed to toggle workflow' }; }
  }

  async createWorkflow(data: any): Promise<any> {
    try {
      const existing = await prisma.workflowTemplate.findUnique({ where: { slug: data.slug } });
      if (existing) return { success: false, message: 'Workflow slug already exists' };
      await prisma.workflowTemplate.create({ data: { name: data.name, slug: data.slug, description: data.description, category: data.category, steps: JSON.stringify(data.steps || []), triggers: JSON.stringify(data.triggers || []), config: data.config ? JSON.stringify(data.config) : null } });
      return { success: true, message: `Workflow "${data.name}" created` };
    } catch { return { success: false, message: 'Failed to create workflow' }; }
  }

  async getTickets(status?: string, limit = 10): Promise<any> {
    try {
      const where: Record<string, any> = {};
      if (status) where.status = status;
      const tickets = await prisma.supportTicket.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit });
      // Get user details separately since SupportTicket doesn't have a direct user relation in this schema
      const userIds = [...new Set(tickets.map(t => t.userId))];
      const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, firstName: true, lastName: true, email: true } });
      const userMap = new Map(users.map(u => [u.id, u]));
      return tickets.map(t => {
        const user = userMap.get(t.userId);
        return { id: t.id, subject: t.subject, status: t.status, priority: t.priority, customer: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Unknown', createdAt: t.createdAt };
      });
    } catch { return []; }
  }

  async updateTicketStatus(ticketId: string, status: string): Promise<any> {
    try {
      const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
      if (!ticket) return { success: false, message: 'Ticket not found' };
      await prisma.supportTicket.update({ where: { id: ticketId }, data: { status } });
      return { success: true, message: `Ticket updated to ${status}` };
    } catch { return { success: false, message: 'Failed to update ticket' }; }
  }

  // ── CONTENT GENERATION TOOL ──

  async generateContent(pageType: string, tone?: string, context?: string, sections?: string[]): Promise<any> {
    const CONTENT_TEMPLATES: Record<string, { title: string; sections: string[] }> = {
      'about_us': { title: 'About Us', sections: ['Our Story', 'Our Mission', 'Our Values', 'Our Team', 'Why Choose Us'] },
      'privacy_policy': { title: 'Privacy Policy', sections: ['Information We Collect', 'How We Use Your Information', 'Data Sharing', 'Cookies', 'Your Rights', 'Contact Us'] },
      'terms_of_service': { title: 'Terms of Service', sections: ['Acceptance of Terms', 'Account Registration', 'Products and Pricing', 'Payments', 'Shipping and Delivery', 'Returns and Refunds', 'Limitation of Liability'] },
      'return_policy': { title: 'Return Policy', sections: ['Return Window', 'Condition Requirements', 'Refund Process', 'Exchange Policy', 'Exceptions'] },
      'shipping_policy': { title: 'Shipping Policy', sections: ['Processing Time', 'Shipping Methods', 'Delivery Timeframes', 'Shipping Costs', 'International Shipping', 'Tracking'] },
      'faq': { title: 'Frequently Asked Questions', sections: ['Orders', 'Payments', 'Shipping', 'Returns', 'Account', 'Products'] },
      'blog_post': { title: 'Blog Post', sections: ['Introduction', 'Main Content', 'Tips and Tricks', 'Conclusion'] },
      'landing_page': { title: 'Landing Page', sections: ['Hero Section', 'Features', 'Benefits', 'Testimonials', 'Call to Action'] },
      'product_description': { title: 'Product Description', sections: ['Overview', 'Features', 'Specifications', 'Benefits', 'Usage Instructions'] },
      'email_template': { title: 'Email Template', sections: ['Subject Line', 'Greeting', 'Main Content', 'Call to Action', 'Footer'] },
    };
    try {
      const template = CONTENT_TEMPLATES[pageType];
      if (!template) return { success: false, message: `Unknown page type: ${pageType}. Available: ${Object.keys(CONTENT_TEMPLATES).join(', ')}` };
      const selectedSections = sections && sections.length > 0 ? sections : template.sections;
      return { success: true, pageType, title: template.title, sections: selectedSections.map(s => ({ heading: s, content: `## ${s}\n\n[Content for ${s} will be generated based on your requirements.]`, placeholder: true })), tone: tone || 'professional', context: context || '' };
    } catch (error: any) {
      return { success: false, message: `Content generation failed: ${error.message}` };
    }
  }

  // ── COUPON/COUPON TOOLS ──

  async listCoupons(): Promise<any> {
    try {
      const coupons = await prisma.couponRule.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
      return coupons.map(c => ({ id: c.id, code: c.code, type: c.type, value: c.value, minSpend: c.minSpend, usageLimit: c.usageLimit, usedCount: c.usedCount, startsAt: c.startsAt, expiresAt: c.expiresAt, isActive: c.isActive }));
    } catch { return []; }
  }

  async createCoupon(data: any): Promise<any> {
    try {
      if (data.code) {
        const existing = await prisma.couponRule.findUnique({ where: { code: data.code } });
        if (existing) return { success: false, message: 'Coupon code already exists' };
      }
      const coupon = await prisma.couponRule.create({ data: { code: data.code, type: data.type, value: data.value, minSpend: data.minOrder || 0, usageLimit: data.usageLimit, startsAt: data.startDate ? new Date(data.startDate) : null, expiresAt: data.endDate ? new Date(data.endDate) : null } });
      return { success: true, message: `Coupon "${coupon.code}" created` };
    } catch { return { success: false, message: 'Failed to create coupon' }; }
  }

  async toggleCoupon(couponId: string): Promise<any> {
    try {
      const coupon = await prisma.couponRule.findUnique({ where: { id: couponId } });
      if (!coupon) return { success: false, message: 'Coupon not found' };
      await prisma.couponRule.update({ where: { id: couponId }, data: { isActive: !coupon.isActive } });
      return { success: true, message: `Coupon "${coupon.code}" ${coupon.isActive ? 'disabled' : 'enabled'}` };
    } catch { return { success: false, message: 'Failed to toggle coupon' }; }
  }

  /**
   * Resolve a tool call — routes to the appropriate method based on tool name
   */
  async executeTool(userId: string, tool: ToolCall): Promise<ToolResult> {
    const { name, arguments: args } = tool;

    switch (name) {
      // ── Customer Tools ──
      case 'search_products': return { name, result: await this.searchProducts(args.query, args.limit) };
      case 'get_product': return { name, result: await this.getProductBySlug(args.slug) };
      case 'list_categories': return { name, result: await this.listCategories() };
      case 'get_cart': return { name, result: await this.getCart(userId) };
      case 'add_to_cart': return { name, result: await this.addToCart(userId, args.productId, args.variantId, args.quantity) };
      case 'remove_from_cart': return { name, result: await this.removeFromCart(userId, args.itemId) };
      case 'update_cart_item': return { name, result: await this.updateCartItem(userId, args.itemId, args.quantity) };
      case 'clear_cart': return { name, result: await this.clearCart(userId) };
      case 'get_wishlist': return { name, result: await this.getWishlist(userId) };
      case 'add_to_wishlist': return { name, result: await this.addToWishlist(userId, args.productId) };
      case 'remove_from_wishlist': return { name, result: await this.removeFromWishlist(userId, args.productId) };
      case 'get_orders': return { name, result: await this.getUserOrders(userId, args.limit, args.status) };
      case 'get_order_detail': return { name, result: await this.getOrderDetail(userId, args.orderId) };
      case 'get_featured': return { name, result: await this.getFeaturedProducts(args.limit) };
      case 'get_platform_stats': return { name, result: await this.getPlatformStats() };
      case 'get_navigation_links': return { name, result: await this.getNavigationLinks(args.role) };

      // ── Seller Tools ──
      case 'get_seller_profile': return { name, result: await this.getSellerProfile(userId) };
      case 'update_seller_profile': return { name, result: await this.updateSellerProfile(userId, args) };
      case 'get_seller_products': return { name, result: await this.getSellerProducts(userId, args.query, args.status, args.limit, args.page) };
      case 'create_product': return { name, result: await this.createProduct(userId, args) };
      case 'update_product': return { name, result: await this.updateProduct(userId, args.productId, args) };
      case 'get_seller_orders': return { name, result: await this.getSellerOrders(userId, args.status, args.limit, args.page) };
      case 'update_order_status': return { name, result: await this.updateOrderStatus(userId, args.orderId, args.status) };
      case 'get_seller_analytics': return { name, result: await this.getSellerAnalytics(userId, args.period) };
      case 'submit_kyc': return { name, result: await this.submitKyc(userId, args) };
      case 'get_seller_payouts': return { name, result: await this.getSellerPayouts(userId, args.limit) };

      // ── Admin Tools ──
      case 'get_admin_dashboard': return { name, result: await this.getAdminDashboard() };
      case 'list_orders': return { name, result: await this.listOrders(args.search, args.status, args.limit, args.page) };
      case 'list_users': return { name, result: await this.listUsers(args.search, args.role, args.limit, args.page) };
      case 'toggle_user_status': return { name, result: await this.toggleUserStatus(args.userId) };
      case 'verify_seller': return { name, result: await this.verifySeller(args.sellerId) };
      case 'reject_seller': return { name, result: await this.rejectSeller(args.sellerId, args.reason) };
      case 'list_roles': return { name, result: await this.listRoles() };
      case 'create_role': return { name, result: await this.createRole(args) };
      case 'delete_role': return { name, result: await this.deleteRole(args.roleId) };
      case 'get_config': return { name, result: await this.getConfig(args.key) };
      case 'update_config': return { name, result: await this.updateConfig(args.key, args.value) };
      case 'get_themes': return { name, result: await this.getThemes() };
      case 'set_theme': return { name, result: await this.setTheme(args.theme) };
      case 'set_theme_mode': return { name, result: await this.setThemeMode(args.mode) };
      case 'get_promotion_placements': return { name, result: await this.getPromotionPlacements() };
      case 'list_pages': return { name, result: await this.listPages(args.search) };
      case 'update_page': return { name, result: await this.updatePage(args.key, args.content) };
      case 'list_plugins': return { name, result: await this.listPlugins() };
      case 'toggle_plugin': return { name, result: await this.togglePlugin(args.pluginId, args.enabled) };
      case 'list_announcements': return { name, result: await this.listAnnouncements() };
      case 'create_announcement': return { name, result: await this.createAnnouncement(args) };
      case 'update_announcement': return { name, result: await this.updateAnnouncement(args.announcementId, args) };
      case 'toggle_announcement': return { name, result: await this.toggleAnnouncement(args.announcementId) };
      case 'get_analytics_summary': return { name, result: await this.getAnalyticsSummary(args.period) };
      case 'generate_orders_report': return { name, result: await this.generateOrdersReport(args.format, args.period, args.status) };
      case 'generate_users_report': return { name, result: await this.generateUsersReport(args.format, args.role) };
      case 'get_audit_logs': return { name, result: await this.getAuditLogs(args.action, args.entity, args.limit, args.page) };
      case 'send_notification': return { name, result: await this.sendNotification(args.userId, args.title, args.message, args.type) };
      case 'get_return_requests': return { name, result: await this.getReturnRequests(args.status, args.limit, args.page) };
      case 'process_return': return { name, result: await this.processReturn(args.returnId, args.action, args.reason) };
      case 'get_workflows': return { name, result: await this.getWorkflows() };
      case 'toggle_workflow': return { name, result: await this.toggleWorkflow(args.workflowId) };
      case 'create_workflow': return { name, result: await this.createWorkflow(args) };
      case 'get_tickets': return { name, result: await this.getTickets(args.status, args.limit) };
      case 'update_ticket_status': return { name, result: await this.updateTicketStatus(args.ticketId, args.status) };
      case 'list_coupons': return { name, result: await this.listCoupons() };
      case 'create_coupon': return { name, result: await this.createCoupon(args) };
      case 'toggle_coupon': return { name, result: await this.toggleCoupon(args.couponId) };

      // ── Content Read/Write Tools ──
      case 'get_page_content': return { name, result: await this.getPageContent(args.key) };
      case 'update_page': return { name, result: await this.updatePage(args.key, args.content) };
      case 'update_page_section': return { name, result: await this.updatePageSection(args.key, args.section, args.content) };
      case 'delete_page_section': return { name, result: await this.deletePageSection(args.key, args.section) };
      case 'search_content': return { name, result: await this.searchContent(args.query) };
      case 'get_blog_post': return { name, result: await this.getBlogPost(args.slug) };
      case 'update_blog_post': return { name, result: await this.updateBlogPost(args.slug, args) };
      case 'generate_content': return { name, result: await this.generateContent(args.pageType, args.tone, args.context, args.sections) };

      default: return { name, result: { error: `Unknown tool: ${name}` } };
    }
  }
}
