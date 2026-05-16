import { prisma } from '../../common/prisma';
import { AppError, NotFoundError } from '../../common/errors';
import slugify from '../../common/slugify';
import { generateTokens } from '../../common/jwt';
import { AuthPayload } from '../../common/middleware';

export class SellerService {
  async findPublic(query: any) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 12);
    const skip = (page - 1) * limit;
    const search = query.search as string | undefined;
    const where: any = { isActive: true };
    if (search) {
      where.OR = [
        { storeName: { contains: search } },
        { storeDescription: { contains: search } },
        { storeLocation: { contains: search } },
      ];
    }

    const [sellers, total] = await Promise.all([
      prisma.seller.findMany({
        where,
        orderBy: [{ isVerified: 'desc' }, { rating: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        select: {
          id: true,
          storeName: true,
          storeSlug: true,
          storeLogo: true,
          storeBanner: true,
          storeDescription: true,
          storeLocation: true,
          isVerified: true,
          rating: true,
          responseRate: true,
          totalOrders: true,
          createdAt: true,
          _count: { select: { products: true, reviews: true } },
        },
      }),
      prisma.seller.count({ where }),
    ]);

    return {
      data: sellers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getProfile(userId: string) {
    const seller = await prisma.seller.findUnique({
      where: { userId },
      include: {
        _count: { select: { products: true, orders: true, payouts: true } },
        storefrontSections: { orderBy: { sortOrder: 'asc' } },
        user: { select: { id: true, email: true, phone: true, firstName: true, lastName: true, avatar: true } },
      },
    });
    if (!seller) throw new NotFoundError('Seller profile not found');
    return seller;
  }

  async getByStoreSlug(slug: string) {
    const seller = await prisma.seller.findUnique({
      where: { storeSlug: slug },
      include: {
        _count: { select: { products: true } },
        storefrontSections: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        products: {
          where: { isActive: true, status: 'ACTIVE' },
          take: 12,
          orderBy: { createdAt: 'desc' },
          include: {
            images: { where: { isPrimary: true }, take: 1 },
            _count: { select: { reviews: true } },
          },
        },
      },
    });
    if (!seller) throw new NotFoundError('Seller not found');
    return seller;
  }

  async create(userId: string, data: any) {
    const existing = await prisma.seller.findUnique({ where: { userId } });
    if (existing) throw new AppError(409, 'Seller profile already exists');

    const slug = data.storeSlug || slugify(data.storeName);
    const slugExists = await prisma.seller.findUnique({ where: { storeSlug: slug } });
    if (slugExists) throw new AppError(409, 'Store slug already exists');

    const seller = await prisma.seller.create({
      data: {
        userId,
        storeName: data.storeName,
        storeSlug: slug,
        storeLogo: data.storeLogo,
        storeBanner: data.storeBanner,
        storeDescription: data.storeDescription,
        storeLocation: data.storeLocation,
        storefrontLayout: data.storefrontLayout ? JSON.stringify(data.storefrontLayout) : undefined,
        sellerType: data.sellerType || 'INDIVIDUAL',
        shippingPolicy: data.shippingPolicy,
        returnPolicy: data.returnPolicy,
        warrantyPolicy: data.warrantyPolicy,
      },
    });

    // Update user role to SELLER
    const user = await prisma.user.update({
      where: { id: userId },
      data: { role: 'SELLER' },
    });

    const payload: AuthPayload = {
      userId: user.id,
      email: user.email || undefined,
      phone: user.phone || undefined,
      role: user.role,
    };
    const tokens = generateTokens(payload);

    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      seller,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
      },
      ...tokens,
    };
  }

  async update(userId: string, data: any) {
    const seller = await prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundError('Seller profile not found');

    let storeSlug = data.storeSlug;
    if (storeSlug && storeSlug !== seller.storeSlug) {
      const slugExists = await prisma.seller.findUnique({ where: { storeSlug } });
      if (slugExists) throw new AppError(409, 'Store slug already exists');
    }

    return prisma.seller.update({
      where: { userId },
      data: {
        ...(data.storeName !== undefined && { storeName: data.storeName }),
        ...(storeSlug !== undefined && { storeSlug }),
        ...(data.storeLogo !== undefined && { storeLogo: data.storeLogo }),
        ...(data.storeBanner !== undefined && { storeBanner: data.storeBanner }),
        ...(data.storeDescription !== undefined && { storeDescription: data.storeDescription }),
        ...(data.storeLocation !== undefined && { storeLocation: data.storeLocation }),
        ...(data.storefrontLayout !== undefined && { storefrontLayout: JSON.stringify(data.storefrontLayout) }),
        ...(data.sellerType !== undefined && { sellerType: data.sellerType }),
        ...(data.shippingPolicy !== undefined && { shippingPolicy: data.shippingPolicy }),
        ...(data.returnPolicy !== undefined && { returnPolicy: data.returnPolicy }),
        ...(data.warrantyPolicy !== undefined && { warrantyPolicy: data.warrantyPolicy }),
      },
    });
  }

  async updateStorefront(userId: string, data: any) {
    const seller = await prisma.seller.findUnique({ where: { userId }, select: { id: true } });
    if (!seller) throw new NotFoundError('Seller profile not found');

    if (data.storefrontSections) {
      await prisma.storefrontSection.deleteMany({ where: { sellerId: seller.id } });
      await prisma.storefrontSection.createMany({
        data: data.storefrontSections.map((section: any, index: number) => ({
          sellerId: seller.id,
          title: section.title,
          type: section.type || 'FEATURED_PRODUCTS',
          sortOrder: section.sortOrder ?? index,
          isActive: section.isActive ?? true,
          featuredProductIds: JSON.stringify(section.featuredProductIds || []),
          metadata: section.metadata ? JSON.stringify(section.metadata) : null,
        })),
      });
    }

    if (data.storefrontLayout !== undefined) {
      await prisma.seller.update({
        where: { id: seller.id },
        data: { storefrontLayout: JSON.stringify(data.storefrontLayout) },
      });
    }

    return prisma.seller.findUnique({
      where: { id: seller.id },
      include: { storefrontSections: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async getDashboard(userId: string) {
    const seller = await prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundError('Seller not found');

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalProducts, totalOrders, totalRevenue, recentOrders, recentPayouts, monthlyOrders] = await Promise.all([
      prisma.product.count({ where: { sellerId: seller.id } }),
      prisma.order.count({ where: { sellerId: seller.id } }),
      prisma.order.aggregate({
        where: { sellerId: seller.id, status: 'DELIVERED' },
        _sum: { totalAmount: true },
      }),
      prisma.order.findMany({
        where: { sellerId: seller.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          user: { select: { firstName: true, lastName: true } },
          _count: { select: { items: true } },
        },
      }),
      prisma.sellerPayout.findMany({
        where: { sellerId: seller.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.order.count({
        where: {
          sellerId: seller.id,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
    ]);

    return {
      stats: {
        totalProducts,
        totalOrders,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        monthlyOrders,
        rating: seller.rating,
        responseRate: seller.responseRate,
      },
      recentOrders,
      recentPayouts,
    };
  }

  async requestPayout(userId: string, data: any) {
    const seller = await prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundError('Seller not found');

    if (data.amount > seller.totalRevenue) {
      throw new AppError(400, 'Insufficient balance');
    }

    const payout = await prisma.sellerPayout.create({
      data: {
        sellerId: seller.id,
        amount: data.amount,
        method: data.method,
        accountRef: data.accountRef,
        status: 'PENDING',
      },
    });

    return payout;
  }

  async getPayouts(userId: string) {
    const seller = await prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundError('Seller not found');

    return prisma.sellerPayout.findMany({
      where: { sellerId: seller.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAnalytics(userId: string, period: string = '30d') {
    const seller = await prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundError('Seller not found');

    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
    const days = daysMap[period] || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const orders = await prisma.order.findMany({
      where: {
        sellerId: seller.id,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date for chart
    const salesByDate = orders.reduce((acc: Record<string, { orders: number; revenue: number }>, order) => {
      const date = order.createdAt.toISOString().split('T')[0];
      if (!acc[date]) acc[date] = { orders: 0, revenue: 0 };
      acc[date].orders++;
      acc[date].revenue += order.totalAmount;
      return acc;
    }, {});

    return {
      period,
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, o) => sum + o.totalAmount, 0),
      avgOrderValue: orders.length > 0 ? orders.reduce((sum, o) => sum + o.totalAmount, 0) / orders.length : 0,
      salesByDate: Object.entries(salesByDate).map(([date, data]) => ({ date, ...data })),
    };
  }

  async submitKyc(userId: string, data: any) {
    const seller = await prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundError('Seller not found');

    await prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus: 'SUBMITTED',
        kycInfo: JSON.stringify({
          businessName: data.businessName,
          registrationNumber: data.registrationNumber,
          taxId: data.taxId,
          ownerIdNumber: data.ownerIdNumber,
        }),
      },
    });

    return prisma.seller.update({
      where: { userId },
      data: {
        kycStatus: 'SUBMITTED',
        kycDocuments: JSON.stringify(data.documents),
      },
    });
  }
}
