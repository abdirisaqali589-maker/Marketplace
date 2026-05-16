import { prisma } from '../../common/prisma';
import { NotFoundError } from '../../common/errors';

export class ChatService {
  async createConversation(userId: string, title?: string) {
    const conversation = await prisma.chatConversation.create({
      data: {
        userId,
        title: title || 'New Conversation',
        status: 'ACTIVE',
      },
    });
    return conversation;
  }

  async listConversations(userId: string, query: { page?: number; limit?: number }) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;

    const [conversations, total] = await Promise.all([
      prisma.chatConversation.findMany({
        where: { userId, status: 'ACTIVE' },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.chatConversation.count({ where: { userId, status: 'ACTIVE' } }),
    ]);

    return {
      data: conversations,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getConversation(id: string) {
    const conversation = await prisma.chatConversation.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversation) throw new NotFoundError('Conversation not found');
    return conversation;
  }

  async sendMessage(conversationId: string, data: {
    role: string;
    content: string;
    toolCalls?: any[];
    toolResults?: any[];
    tokens?: number;
    model?: string;
  }) {
    const conversation = await prisma.chatConversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw new NotFoundError('Conversation not found');

    const message = await prisma.chatMessage.create({
      data: {
        conversationId,
        role: data.role,
        content: data.content,
        toolCalls: data.toolCalls ? JSON.stringify(data.toolCalls) : null,
        toolResults: data.toolResults ? JSON.stringify(data.toolResults) : null,
        tokens: data.tokens || null,
        model: data.model || null,
      },
    });

    await prisma.chatConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  async listMessages(conversationId: string, query: { page?: number; limit?: number }) {
    const conversation = await prisma.chatConversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw new NotFoundError('Conversation not found');

    const page = Number(query.page || 1);
    const limit = Number(query.limit || 50);
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      prisma.chatMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.chatMessage.count({ where: { conversationId } }),
    ]);

    return {
      data: messages.map(m => ({
        ...m,
        toolCalls: m.toolCalls ? JSON.parse(m.toolCalls) : null,
        toolResults: m.toolResults ? JSON.parse(m.toolResults) : null,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async archiveConversation(id: string) {
    const conversation = await prisma.chatConversation.findUnique({ where: { id } });
    if (!conversation) throw new NotFoundError('Conversation not found');

    const updated = await prisma.chatConversation.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
    return updated;
  }
}