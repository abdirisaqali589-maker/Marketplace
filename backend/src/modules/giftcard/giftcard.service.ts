import crypto from 'crypto';
import { prisma } from '../../common/prisma';
import { AppError, NotFoundError } from '../../common/errors';

export class GiftCardService {
  private generateCode(): string {
    return 'GC-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  async create(data: {
    amount: number;
    buyerId?: string;
    recipientEmail?: string;
    recipientName?: string;
    message?: string;
    currency?: string;
    quantity?: number;
  }) {
    const quantity = data.quantity || 1;
    const cards = [];

    for (let i = 0; i < quantity; i++) {
      const code = this.generateCode();
      const card = await prisma.giftCard.create({
        data: {
          code,
          amount: data.amount,
          balance: data.amount,
          currency: data.currency || 'TZS',
          buyerId: data.buyerId || null,
          recipientEmail: data.recipientEmail || null,
          recipientName: data.recipientName || null,
          message: data.message || null,
          expiresAt: new Date(Date.now() + 365 * 86400000), // 1 year
        },
      });
      cards.push(card);
    }

    return quantity === 1 ? cards[0] : cards;
  }

  async validate(code: string) {
    const card = await prisma.giftCard.findUnique({ where: { code } });
    if (!card) throw new NotFoundError('Gift card not found');
    if (!card.isActive) throw new AppError(400, 'Gift card is deactivated');
    if (card.balance <= 0) throw new AppError(400, 'Gift card has no remaining balance');
    if (card.expiresAt && card.expiresAt < new Date()) throw new AppError(400, 'Gift card has expired');

    return card;
  }

  async redeem(code: string, userId: string, amount: number) {
    const card = await this.validate(code);
    if (amount > card.balance) throw new AppError(400, 'Amount exceeds gift card balance');

    await prisma.giftCard.update({
      where: { id: card.id },
      data: { balance: card.balance - amount },
    });

    return prisma.giftCardUsage.create({
      data: { cardId: card.id, userId, amount },
    });
  }

  async getBalance(code: string) {
    const card = await prisma.giftCard.findUnique({ where: { code } });
    if (!card) throw new NotFoundError('Gift card not found');
    return { code: card.code, balance: card.balance, currency: card.currency, isActive: card.isActive, expiresAt: card.expiresAt };
  }

  async getUserGiftCards(userId: string) {
    return prisma.giftCard.findMany({
      where: { buyerId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(query: { page?: number | string; limit?: number | string; isActive?: string; search?: string }) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const where: any = {};

    if (query.isActive === 'true') where.isActive = true;
    if (query.isActive === 'false') where.isActive = false;
    if (query.search) {
      where.OR = [
        { code: { contains: query.search } },
        { recipientEmail: { contains: query.search } },
        { recipientName: { contains: query.search } },
      ];
    }

    const [cards, total] = await Promise.all([
      prisma.giftCard.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.giftCard.count({ where }),
    ]);

    return { data: cards, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getUsageHistory(cardId: string) {
    return prisma.giftCardUsage.findMany({
      where: { cardId },
      orderBy: { usedAt: 'desc' },
      include: { card: { select: { code: true } } },
    });
  }

  async deactivate(cardId: string) {
    return prisma.giftCard.update({
      where: { id: cardId },
      data: { isActive: false },
    });
  }

  async setActive(cardId: string, isActive: boolean) {
    return prisma.giftCard.update({
      where: { id: cardId },
      data: { isActive },
    });
  }
}
