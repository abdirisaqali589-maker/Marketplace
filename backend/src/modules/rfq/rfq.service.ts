import { prisma } from '../../common/prisma';
import { AppError, NotFoundError } from '../../common/errors';
import { AuthPayload } from '../../common/middleware';

export class RfqService {
  private isAdmin(user: AuthPayload) {
    return ['ADMIN', 'SUPER_ADMIN'].includes(user.role);
  }

  private async getSellerId(userId: string) {
    const seller = await prisma.seller.findUnique({ where: { userId }, select: { id: true } });
    return seller?.id;
  }

  private async canAccess(thread: { buyerId: string; sellerId: string }, user: AuthPayload) {
    if (this.isAdmin(user) || thread.buyerId === user.userId) return true;
    const sellerId = await this.getSellerId(user.userId);
    return sellerId === thread.sellerId;
  }

  async create(userId: string, data: any) {
    const seller = await prisma.seller.findUnique({ where: { id: data.sellerId }, select: { id: true, userId: true } });
    if (!seller) throw new NotFoundError('Seller not found');
    const thread = await prisma.rfqThread.create({
      data: {
        buyerId: userId,
        sellerId: data.sellerId,
        productId: data.productId || null,
        subject: data.subject,
        quantity: data.quantity,
        targetPrice: data.targetPrice,
        messages: { create: { senderId: userId, body: data.message } },
      },
      include: { messages: true, product: { select: { id: true, title: true, slug: true } }, seller: { select: { id: true, storeName: true, storeSlug: true } } },
    });
    await prisma.notification.create({
      data: {
        userId: seller.userId,
        type: 'RFQ_RECEIVED',
        title: `New RFQ: ${data.subject}`,
        body: data.message,
        data: JSON.stringify({ threadId: thread.id, productId: data.productId }),
      },
    });
    return thread;
  }

  async list(user: AuthPayload, query: any) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const where: any = {};
    if (!this.isAdmin(user)) {
      const sellerId = await this.getSellerId(user.userId);
      where.OR = [{ buyerId: user.userId }, ...(sellerId ? [{ sellerId }] : [])];
    }
    if (query.status) where.status = query.status;
    const [data, total] = await Promise.all([
      prisma.rfqThread.findMany({
        where,
        include: { seller: { select: { id: true, storeName: true, storeSlug: true } }, product: { select: { id: true, title: true, slug: true } }, messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.rfqThread.count({ where }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async get(id: string, user: AuthPayload) {
    const thread = await prisma.rfqThread.findUnique({
      where: { id },
      include: { seller: { select: { id: true, storeName: true, storeSlug: true } }, product: { select: { id: true, title: true, slug: true } }, messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!thread) throw new NotFoundError('RFQ thread not found');
    if (!(await this.canAccess(thread, user))) throw new AppError(403, 'Not authorized');
    return thread;
  }

  async message(id: string, user: AuthPayload, data: any) {
    const thread = await prisma.rfqThread.findUnique({ where: { id } });
    if (!thread) throw new NotFoundError('RFQ thread not found');
    if (!(await this.canAccess(thread, user))) throw new AppError(403, 'Not authorized');
    await prisma.rfqMessage.create({
      data: {
        threadId: id,
        senderId: user.userId,
        body: data.body,
        offer: data.offer ? JSON.stringify(data.offer) : null,
      },
    });
    return prisma.rfqThread.update({
      where: { id },
      data: { status: data.status || thread.status },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  }
}
