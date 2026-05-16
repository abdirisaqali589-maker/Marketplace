import { prisma } from '../../common/prisma';
import { AppError, NotFoundError } from '../../common/errors';

export class TicketService {
  async create(userId: string, data: { subject: string; description: string; category?: string; orderId?: string; priority?: string }) {
    return prisma.supportTicket.create({
      data: {
        userId,
        subject: data.subject,
        description: data.description,
        category: data.category || null,
        orderId: data.orderId || null,
        priority: data.priority || 'MEDIUM',
      },
    });
  }

  async findAll(query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const { status, priority, userId } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (userId) where.userId = userId;

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: {
          messages: { take: 1, orderBy: { createdAt: 'desc' }, select: { body: true, createdAt: true, isStaff: true, userId: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.supportTicket.count({ where }),
    ]);

    return {
      data: tickets,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!ticket) throw new NotFoundError('Ticket not found');
    return ticket;
  }

  async addMessage(ticketId: string, userId: string, body: string, isStaff = false, attachments?: string[]) {
    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundError('Ticket not found');

    const message = await prisma.supportTicketMessage.create({
      data: {
        ticketId,
        userId,
        body,
        isStaff,
        attachments: attachments ? JSON.stringify(attachments) : null,
      },
    });

    // Reopen ticket if user adds a message to closed ticket
    if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: 'OPEN', updatedAt: new Date() },
      });
    } else {
      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { updatedAt: new Date() },
      });
    }

    return message;
  }

  async updateStatus(ticketId: string, status: string, assignedTo?: string) {
    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundError('Ticket not found');

    return prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status,
        ...(assignedTo && { assignedTo }),
        updatedAt: new Date(),
      },
    });
  }

  async getStats() {
    const [open, pending, resolved, closed] = await Promise.all([
      prisma.supportTicket.count({ where: { status: 'OPEN' } }),
      prisma.supportTicket.count({ where: { status: 'PENDING' } }),
      prisma.supportTicket.count({ where: { status: 'RESOLVED' } }),
      prisma.supportTicket.count({ where: { status: 'CLOSED' } }),
    ]);

    return {
      open,
      pending,
      resolved,
      closed,
      total: open + pending + resolved + closed,
    };
  }
}