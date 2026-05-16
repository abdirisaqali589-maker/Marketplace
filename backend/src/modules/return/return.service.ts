import { prisma } from '../../common/prisma';
import { AppError, NotFoundError } from '../../common/errors';

export class ReturnService {
  async create(userId: string, data: any) {
    const order = await prisma.order.findUnique({ where: { id: data.orderId } });
    if (!order) throw new NotFoundError('Order not found');
    if (order.userId !== userId) throw new AppError(403, 'Not authorized');
    if (order.status !== 'DELIVERED') throw new AppError(400, 'Order must be delivered first');

    const returnRequest = await prisma.returnRequest.create({
      data: {
        orderId: data.orderId,
        userId,
        reason: data.reason,
        description: data.description,
        images: data.images ? JSON.stringify(data.images) : null,
        status: 'PENDING',
        items: {
          create: data.items.map((item: any) => ({
            orderItemId: item.orderItemId,
            quantity: item.quantity,
          })),
        },
      },
      include: { items: true },
    });

    await prisma.order.update({
      where: { id: data.orderId },
      data: { status: 'RETURN_REQUESTED' },
    });

    return returnRequest;
  }

  async findAll(query: any) {
    const { page, limit, status } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;

    const [returns, total] = await Promise.all([
      prisma.returnRequest.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          order: { select: { orderNumber: true, totalAmount: true } },
          items: true,
        },
        orderBy: { createdAt: 'desc' }, skip, take: limit,
      }),
      prisma.returnRequest.count({ where }),
    ]);
    return { data: returns, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findUserReturns(userId: string, query: any) {
    const { page, limit, status } = query;
    const skip = (page - 1) * limit;
    const where: any = { userId };
    if (status) where.status = status;

    const [returns, total] = await Promise.all([
      prisma.returnRequest.findMany({
        where,
        include: { order: { select: { orderNumber: true } }, items: true },
        orderBy: { createdAt: 'desc' }, skip, take: limit,
      }),
      prisma.returnRequest.count({ where }),
    ]);
    return { data: returns, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: string) {
    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        order: { select: { orderNumber: true, totalAmount: true, createdAt: true } },
        items: true,
      },
    });
    if (!returnRequest) throw new NotFoundError('Return request not found');
    return { ...returnRequest, images: returnRequest.images ? JSON.parse(returnRequest.images) : [] };
  }

  async updateStatus(id: string, data: any) {
    const returnRequest = await prisma.returnRequest.findUnique({ where: { id } });
    if (!returnRequest) throw new NotFoundError('Return request not found');

    const updateData: any = { status: data.status };
    if (data.adminNote) updateData.adminNote = data.adminNote;
    if (data.refundAmount) updateData.refundAmount = data.refundAmount;
    if (data.refundMethod) updateData.refundMethod = data.refundMethod;
    if (data.status === 'APPROVED') updateData.approvedAt = new Date();
    if (['REFUNDED', 'COMPLETED'].includes(data.status)) updateData.completedAt = new Date();

    const updated = await prisma.returnRequest.update({ where: { id }, data: updateData });

    if (data.status === 'REFUNDED' || data.status === 'COMPLETED') {
      await prisma.order.update({
        where: { id: returnRequest.orderId },
        data: { status: 'REFUNDED' },
      });
    }

    return updated;
  }
}