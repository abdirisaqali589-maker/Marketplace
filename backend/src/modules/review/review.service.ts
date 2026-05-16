import { prisma } from '../../common/prisma';
import { AppError, NotFoundError } from '../../common/errors';

export class ReviewService {
  private isAdmin(role: string): boolean {
    return ['ADMIN', 'SUPER_ADMIN'].includes(role);
  }

  private async getSellerIdForUser(userId: string): Promise<string> {
    const seller = await prisma.seller.findUnique({ where: { userId }, select: { id: true } });
    if (!seller) throw new NotFoundError('Seller profile not found');
    return seller.id;
  }

  async findByProduct(productId: string, query: any) {
    const { page, limit, sortBy, sortOrder, rating, isApproved } = query;
    const skip = (page - 1) * limit;
    const where: any = { productId };
    if (rating) where.rating = rating;
    if (isApproved !== undefined) where.isApproved = isApproved === 'true';

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          images: { orderBy: { sortOrder: 'asc' } },
          replies: {

            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.review.count({ where }),
    ]);

    return {
      data: reviews,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findAll(query: any) {
    const { page, limit, sortBy, sortOrder, isApproved } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (isApproved !== undefined) where.isApproved = isApproved === 'true';

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          product: { select: { id: true, title: true, slug: true } },
          images: true,
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.review.count({ where }),
    ]);

    return {
      data: reviews,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findBySeller(userId: string, role: string, query: any) {
    const { page, limit, sortBy, sortOrder, rating, isApproved } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (!this.isAdmin(role)) {
      const seller = await prisma.seller.findUnique({ where: { userId }, select: { id: true } });
      if (!seller) {
        return {
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        };
      }
      where.product = { sellerId: seller.id };
    }
    if (rating) where.rating = rating;
    if (isApproved !== undefined) where.isApproved = isApproved === 'true';

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          product: { select: { id: true, title: true, slug: true, images: { orderBy: { sortOrder: 'asc' }, take: 1 } } },
          images: { orderBy: { sortOrder: 'asc' } },
          replies: {
            include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.review.count({ where }),
    ]);

    return {
      data: reviews,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }


  async create(userId: string, data: any) {
    // Check existing review
    const existing = await prisma.review.findFirst({
      where: { userId, productId: data.productId },
      include: { images: true },
    });
    if (existing) return existing;

    // Check order ownership if orderId provided
    if (data.orderId) {
      const order = await prisma.order.findFirst({
        where: { id: data.orderId, userId, status: 'DELIVERED' },
      });
      if (!order) throw new AppError(400, 'Verified purchase required');
    }

    const review = await prisma.review.create({
      data: {
        userId,
        productId: data.productId,
        orderId: data.orderId || null,
        sellerId: await this.getProductSellerId(data.productId),
        rating: data.rating,
        title: data.title,
        text: data.text,
        isVerified: !!data.orderId,
        images: data.images ? {
          create: data.images.map((img: any, idx: number) => ({
            url: img.url,
            sortOrder: img.sortOrder ?? idx,
          })),
        } : undefined,
      },
      include: { images: true },
    });

    await this.updateProductRating(data.productId);
    return review;
  }

  async update(id: string, userId: string, data: any) {
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundError('Review not found');
    if (review.userId !== userId) throw new AppError(403, 'Not authorized');

    if (data.images) {
      await prisma.reviewImage.deleteMany({ where: { reviewId: id } });
      await prisma.reviewImage.createMany({
        data: data.images.map((img: any, idx: number) => ({
          reviewId: id,
          url: img.url,
          sortOrder: img.sortOrder ?? idx,
        })),
      });
    }

    const updated = await prisma.review.update({
      where: { id },
      data: {
        ...(data.rating !== undefined && { rating: data.rating }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.text !== undefined && { text: data.text }),
      },
      include: { images: true },
    });

    if (data.rating !== undefined) {
      await this.updateProductRating(review.productId);
    }
    return updated;
  }

  async delete(id: string, userId: string) {
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundError('Review not found');
    if (review.userId !== userId) throw new AppError(403, 'Not authorized');

    await prisma.review.delete({ where: { id } });
    await this.updateProductRating(review.productId);
    return { message: 'Review deleted' };
  }

  async replyToReview(reviewId: string, userId: string, role: string, text: string) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { product: { select: { sellerId: true } } },
    });
    if (!review) throw new NotFoundError('Review not found');
    if (!this.isAdmin(role)) {
      const sellerId = await this.getSellerIdForUser(userId);
      if (review.product.sellerId !== sellerId) throw new AppError(403, 'Not authorized');
    }

    return prisma.reviewReply.create({
      data: { reviewId, userId, text },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async toggleApproval(id: string) {
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundError('Review not found');
    return prisma.review.update({
      where: { id },
      data: { isApproved: !review.isApproved },
    });
  }

  private async updateProductRating(productId: string) {
    const result = await prisma.review.aggregate({
      where: { productId, isApproved: true },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await prisma.product.update({
      where: { id: productId },
      data: {
        rating: result._avg.rating || 0,
        reviewCount: result._count.rating,
      },
    });
  }

  private async getProductSellerId(productId: string) {
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { sellerId: true } });
    return product?.sellerId || null;
  }
}
