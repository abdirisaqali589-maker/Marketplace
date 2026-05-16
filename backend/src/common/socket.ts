import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { config } from './config';
import { logger } from './logger';
import jwt from 'jsonwebtoken';

let io: Server | null = null;

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

export function getIO(): Server | null {
  return io;
}

export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: config.frontendUrl,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      // Allow unauthenticated connections for public events
      next();
      return;
    }
    try {
      const decoded = jwt.verify(token as string, config.jwtSecret) as any;
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (rawSocket: Socket) => {
    const socket = rawSocket as AuthenticatedSocket;
    logger.info(`Socket connected: ${socket.id}${socket.userId ? ` (user: ${socket.userId})` : ''}`);

    // Join user-specific room for private messages
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
      socket.join(`role:${socket.userRole}`);
    }

    // Join public rooms
    socket.join('public');

    // Track active users
    socket.on('track-presence', (data: { sellerId?: string }) => {
      if (socket.userId) {
        socket.broadcast.emit('user-online', { userId: socket.userId });
        if (data?.sellerId) {
          socket.join(`seller:${data.sellerId}`);
        }
      }
    });

    // Messaging events
    socket.on('send-message', (data: { to: string; message: string; conversationId: string }) => {
      if (!socket.userId) return;
      io?.to(`user:${data.to}`).emit('new-message', {
        from: socket.userId,
        message: data.message,
        conversationId: data.conversationId,
        timestamp: new Date().toISOString(),
      });
    });

    // Typing indicators
    socket.on('typing', (data: { to: string; conversationId: string; isTyping: boolean }) => {
      io?.to(`user:${data.to}`).emit('user-typing', {
        userId: socket.userId,
        conversationId: data.conversationId,
        isTyping: data.isTyping,
      });
    });

    // Order tracking events
    socket.on('join-order', (orderId: string) => {
      socket.join(`order:${orderId}`);
    });

    socket.on('leave-order', (orderId: string) => {
      socket.leave(`order:${orderId}`);
    });

    // Vendor/Admin notifications
    socket.on('join-seller-room', (sellerId: string) => {
      socket.join(`seller:${sellerId}`);
    });

    // Disconnect
    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
      if (socket.userId) {
        io?.emit('user-offline', { userId: socket.userId });
      }
    });

    // Error handling
    socket.on('error', (err: Error) => {
      logger.error('Socket error', { error: err.message, socketId: socket.id });
    });
  });

  logger.info('WebSocket server initialized');
  return io;
}

// Helper functions to emit events throughout the app
export function emitOrderUpdate(orderId: string, data: any) {
  io?.to(`order:${orderId}`).emit('order-updated', data);
}

export function emitNotification(userId: string, notification: any) {
  io?.to(`user:${userId}`).emit('notification', notification);
}

export function emitSellerNotification(sellerId: string, data: any) {
  io?.to(`seller:${sellerId}`).emit('seller-notification', data);
}

export function emitNewOrderToAdmin(data: any) {
  io?.to('role:ADMIN').emit('new-order', data);
  io?.to('role:SUPER_ADMIN').emit('new-order', data);
}

export function emitTrackingUpdate(orderId: string, status: string, location?: string) {
  io?.to(`order:${orderId}`).emit('tracking-update', {
    orderId,
    status,
    location,
    timestamp: new Date().toISOString(),
  });
}

export function emitChatMessage(conversationId: string, message: any) {
  io?.to(`conversation:${conversationId}`).emit('chat-message', message);
}