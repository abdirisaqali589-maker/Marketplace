import { prisma } from '../../common/prisma';
import { AppError, NotFoundError } from '../../common/errors';
import slugify from '../../common/slugify';

export class PromotionService {
  // ── Coupons ──
  async createCoupon(data: any) {
    const existing = await prisma.couponRule.findUnique({ where: { code: data.code } });
    if (existing) throw new AppError(409, 'Coupon code already exists');
    return prisma.couponRule.create({
      data: {
        sellerId: data.sellerId || null,
        code: data.code,
        type: data.type,
        value: data.value,
        minSpend: data.minSpend ?? 0,
        maxDiscount: data.maxDiscount || null,
        usageLimit: data.usageLimit || null,
        userLimit: data.userLimit || null,
        isActive: data.isActive ?? true,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });
  }

  async updateCoupon(id: string, data: any) {
    const coupon = await prisma.couponRule.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundError('Coupon not found');
    return prisma.couponRule.update({
      where: { id },
      data: {
        ...(data.code !== undefined && { code: data.code }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.value !== undefined && { value: data.value }),
        ...(data.minSpend !== undefined && { minSpend: data.minSpend }),
        ...(data.maxDiscount !== undefined && { maxDiscount: data.maxDiscount }),
        ...(data.usageLimit !== undefined && { usageLimit: data.usageLimit }),
        ...(data.userLimit !== undefined && { userLimit: data.userLimit }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.startsAt !== undefined && { startsAt: data.startsAt ? new Date(data.startsAt) : null }),
        ...(data.expiresAt !== undefined && { expiresAt: data.expiresAt ? new Date(data.expiresAt) : null }),
      },
    });
  }

  async getCoupons(query: any) {
    const { page, limit, isActive, sellerId } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (sellerId) where.sellerId = sellerId;

    const [coupons, total] = await Promise.all([
      prisma.couponRule.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.couponRule.count({ where }),
    ]);
    return { data: coupons, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async validateCoupon(code: string, userId: string, subtotal: number) {
    const coupon = await prisma.couponRule.findUnique({ where: { code: code.toUpperCase() } });
    if (!coupon) throw new NotFoundError('Coupon not found');
    if (!coupon.isActive) throw new AppError(400, 'Coupon is inactive');
    if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new AppError(400, 'Coupon has expired');
    if (coupon.startsAt && coupon.startsAt > new Date()) throw new AppError(400, 'Coupon is not yet active');
    if (subtotal < coupon.minSpend) throw new AppError(400, `Minimum spend of ${coupon.minSpend} required`);
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw new AppError(400, 'Coupon usage limit reached');
    if (coupon.userLimit) {
      const userUsage = await prisma.couponUsage.count({ where: { couponId: coupon.id, userId } });
      if (userUsage >= coupon.userLimit) throw new AppError(400, 'You have reached the usage limit for this coupon');
    }

    let discount = coupon.type === 'PERCENTAGE' ? subtotal * (coupon.value / 100) : coupon.value;
    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);

    return { coupon, discount, valid: true };
  }

  async deleteCoupon(id: string) {
    const coupon = await prisma.couponRule.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundError('Coupon not found');
    await prisma.couponRule.delete({ where: { id } });
    return { message: 'Coupon deleted' };
  }

  // ── Campaigns ──
  async createCampaign(data: any) {
    const slug = data.slug || slugify(data.name);
    const campaign = await prisma.campaign.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        banner: data.banner,
        type: data.type,
        discountType: data.discountType,
        discountValue: data.discountValue,
        startAt: new Date(data.startAt),
        endAt: new Date(data.endAt),
        products: data.productIds ? {
          create: data.productIds.map((productId: string) => ({ productId })),
        } : undefined,
      },
      include: { _count: { select: { products: true } } },
    });
    return campaign;
  }

  async getCampaigns(query: any) {
    const { page, limit, isActive, type } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (type) where.type = type;

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        include: { _count: { select: { products: true } } },
        orderBy: { startAt: 'desc' }, skip, take: limit,
      }),
      prisma.campaign.count({ where }),
    ]);
    return { data: campaigns, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getActiveCampaigns() {
    const now = new Date();
    return prisma.campaign.findMany({
      where: { isActive: true, startAt: { lte: now }, endAt: { gte: now } },
      include: {
        products: {
          include: {
            product: {
              select: { id: true, title: true, slug: true, basePrice: true, discountPrice: true, images: { take: 1, where: { isPrimary: true }, select: { url: true } } },
            },
          },
        },
      },
    });
  }

  async deleteCampaign(id: string) {
    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundError('Campaign not found');
    await prisma.campaign.delete({ where: { id } });
    return { message: 'Campaign deleted' };
  }
}
