import { prisma } from '../../common/prisma';
import { AppError, NotFoundError } from '../../common/errors';

export class WishlistService {
  async list(userId: string) {
    return prisma.wishlistItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          include: {
            images: { where: { isPrimary: true }, take: 1 },
            seller: { select: { id: true, storeName: true, storeSlug: true } },
            _count: { select: { reviews: true } },
          },
        },
      },
    });
  }

  async add(userId: string, productId: string) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.isActive || product.status !== 'ACTIVE') throw new NotFoundError('Product not found');
    return prisma.wishlistItem.upsert({
      where: { userId_productId: { userId, productId } },
      update: {},
      create: { userId, productId },
      include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } } },
    });
  }

  async remove(userId: string, productId: string) {
    const deleted = await prisma.wishlistItem.deleteMany({ where: { userId, productId } });
    if (!deleted.count) throw new NotFoundError('Wishlist item not found');
    return { message: 'Removed from wishlist' };
  }

  async clear(userId: string) {
    await prisma.wishlistItem.deleteMany({ where: { userId } });
    return { message: 'Wishlist cleared' };
  }
}
