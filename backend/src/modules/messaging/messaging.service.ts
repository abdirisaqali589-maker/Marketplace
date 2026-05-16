import { prisma } from '../../common/prisma';
import { AppError, NotFoundError } from '../../common/errors';
import { AuthPayload } from '../../common/middleware';
import { emitChatMessage } from '../../common/socket';

export class MessagingService {
  async getOrCreateConversation(userId1: string, userId2: string, orderId?: string) {
    // Check if conversation already exists
    let conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { buyerId: userId1, sellerId: userId2 },
          { buyerId: userId2, sellerId: userId1 },
        ],
      },
      include: {
        buyer: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        _count: { select: { messages: true } },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          buyerId: userId1,
          sellerId: userId2,
          orderId: orderId || null,
        },
        include: {
          buyer: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          _count: { select: { messages: true } },
        },
      });
    }

    return conversation;
  }

  async sendMessage(conversationId: string, senderId: string, content: string, attachments?: string[]) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundError('Conversation not found');

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId,
        content,
        attachments: attachments ? JSON.stringify(attachments) : null,
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
    });

    // Update conversation
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        lastMessage: content.substring(0, 200),
      },
    });

    // Emit via WebSocket
    emitChatMessage(conversationId, {
      id: message.id,
      content: message.content,
      senderId,
      sender: message.sender,
      attachments: message.attachments ? JSON.parse(message.attachments) : [],
      createdAt: message.createdAt,
    });

    // Determine recipient for notification
    const recipientId = conversation.buyerId === senderId ? conversation.sellerId : conversation.buyerId;
    await prisma.notification.create({
      data: {
        userId: recipientId,
        type: 'NEW_MESSAGE',
        title: 'New message',
        body: content.substring(0, 100),
        data: JSON.stringify({ conversationId, senderId }),
      },
    });

    return message;
  }

  async getConversations(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { buyerId: userId },
          { sellerId: userId },
        ],
      },
      include: {
        buyer: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { lastMessageAt: 'desc' },
      skip,
      take: limit,
    });

    const total = await prisma.conversation.count({
      where: {
        OR: [
          { buyerId: userId },
          { sellerId: userId },
        ],
      },
    });

    const data = conversations.map(c => ({
      id: c.id,
      buyerId: c.buyerId,
      sellerId: c.sellerId,
      orderId: c.orderId,
      lastMessage: c.lastMessage,
      lastMessageAt: c.lastMessageAt,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      buyer: c.buyer,
      _count: c._count,
      unreadCount: 0,
    }));

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getMessages(conversationId: string, userId: string, page = 1, limit = 50) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundError('Conversation not found');

    // Verify user is part of conversation
    if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
      throw new AppError(403, 'Not authorized');
    }

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.message.count({ where: { conversationId } }),
    ]);

    return {
      data: messages.reverse(),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async markAsRead(conversationId: string, userId: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundError('Conversation not found');
    if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
      throw new AppError(403, 'Not authorized');
    }

    // Mark unread messages as read
    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return { success: true };
  }

  async getUnreadCount(userId: string): Promise<number> {
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { buyerId: userId },
          { sellerId: userId },
        ],
      },
      select: { id: true },
    });

    const conversationIds = conversations.map(c => c.id);
    if (conversationIds.length === 0) return 0;

    return prisma.message.count({
      where: {
        conversationId: { in: conversationIds },
        senderId: { not: userId },
        readAt: null,
      },
    });
  }
}