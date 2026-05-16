import express from 'express';
import cors from 'cors';
import http from 'http';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import fs from 'fs/promises';
import { config } from './common/config';
import { errorHandler } from './common/middleware';
import { logger } from './common/logger';
import { prisma } from './common/prisma';
import { initSocketServer } from './common/socket';

// Import routes
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/user/user.routes';
import categoryRoutes from './modules/category/category.routes';
import productRoutes from './modules/product/product.routes';
import cartRoutes from './modules/cart/cart.routes';
import orderRoutes from './modules/order/order.routes';
import sellerRoutes from './modules/seller/seller.routes';
import brandRoutes from './modules/brand/brand.routes';
import reviewRoutes from './modules/review/review.routes';
import paymentRoutes from './modules/payment/payment.routes';
import shippingRoutes from './modules/shipping/shipping.routes';
import promotionRoutes from './modules/promotion/promotion.routes';
import notificationRoutes from './modules/notification/notification.routes';
import returnRoutes from './modules/return/return.routes';
import adminRoutes from './modules/admin/admin.routes';
import configRoutes from './modules/dynamic-config/dynamic-config.routes';
import wishlistRoutes from './modules/wishlist/wishlist.routes';
import uploadRoutes from './modules/upload/upload.routes';
import rfqRoutes from './modules/rfq/rfq.routes';
import automationRoutes from './modules/automation/automation.routes';
import messagingRoutes from './modules/messaging/messaging.routes';
import ticketRoutes from './modules/ticket/ticket.routes';
import blogRoutes from './modules/blog/blog.routes';
import giftcardRoutes from './modules/giftcard/giftcard.routes';
import announcementRoutes from './modules/announcement/announcement.routes';
import apiKeyRoutes from './modules/api-key/api-key.routes';
import openapiRoutes from './modules/openapi/openapi.routes';
import pluginRoutes from './modules/plugin/plugin.routes';
import webhookRoutes from './modules/webhook/webhook.routes';
import aiRoutes from './modules/ai/ai.routes';
import chatRoutes from './modules/chat/chat.routes';
import workflowRoutes from './modules/workflow/workflow.routes';
import voiceRoutes from './modules/voice/voice.routes';
import aiToolRegistryRoutes from './modules/ai/ai-tool-registry.routes';
import { automationWorker } from './modules/automation/automation.worker';

const app = express();

// ── Middleware ──
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev', {
  stream: { write: (message: string) => logger.info(message.trim()) },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.nodeEnv === 'development' ? 2000 : 100,
  skip: (req) => config.nodeEnv === 'development' && req.method === 'GET',
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' },
});
app.use('/api', limiter);

// Static files (uploads)
app.get(['/uploads', '/uploads/'], async (_req, res, next) => {
  try {
    const entries = await fs.readdir(config.uploadDir, { withFileTypes: true }).catch(() => []);
    res.json({
      success: true,
      message: 'Upload storage is available',
      basePath: '/uploads',
      uploadEndpoint: '/api/upload/images',
      files: entries
        .filter((entry) => entry.isFile())
        .map((entry) => ({ name: entry.name, url: `/uploads/${entry.name}` })),
      folders: entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => ({ name: entry.name, url: `/uploads/${entry.name}/` })),
    });
  } catch (error) {
    next(error);
  }
});
app.use('/uploads', express.static(config.uploadDir));
app.get('/uploads/products/:filename', (req, res) => {
  const label = req.params.filename
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

  res.type('svg').send(`
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fff7ed"/>
          <stop offset="100%" stop-color="#fed7aa"/>
        </linearGradient>
      </defs>
      <rect width="800" height="800" fill="url(#bg)"/>
      <rect x="120" y="120" width="560" height="560" rx="36" fill="#ffffff" opacity="0.86"/>
      <circle cx="400" cy="330" r="96" fill="#ea580c" opacity="0.16"/>
      <path d="M310 450h180l-28-92h-124l-28 92zm42-126h96l-18-44h-60l-18 44z" fill="#ea580c"/>
      <text x="400" y="550" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#7c2d12">${label}</text>
      <text x="400" y="595" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#9a3412">Product image placeholder</text>
    </svg>
  `);
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'MarketPlace API is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// ── Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/config', configRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/rfq', rfqRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/messaging', messagingRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/giftcards', giftcardRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/openapi', openapiRoutes);
app.use('/api/plugins', pluginRoutes);
app.use('/api/webhook-events', webhookRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/ai-tools', aiToolRegistryRoutes);

// ── 404 Handler ──
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Error Handler ──
app.use(errorHandler);

// ── Start Server ──
let server: http.Server;

async function start() {
  try {
    // Connect to database
    await prisma.$connect();
    logger.info('Connected to PostgreSQL database');

    // Create HTTP server and attach Express
    server = http.createServer(app);

    // Initialize WebSocket server
    initSocketServer(server);

    // Start listening
    server.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
      logger.info(`Health check: http://localhost:${config.port}/api/health`);
      logger.info(`API Docs: http://localhost:${config.port}/api/openapi/docs`);
    });

    // Start automation worker (queue-backed scheduled engine)
    automationWorker.start(60000); // Run every 60 seconds
    logger.info('Automation worker started with 60s interval');
  } catch (error) {
    logger.error('Failed to start server', { error: (error as Error).message });
    process.exit(1);
  }
}

start();

// Handle graceful shutdown
let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received. Shutting down gracefully...`);
  
  try {
    // Close the HTTP server first to stop accepting new requests
    if (server) {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          logger.warn('Forced shutdown after timeout');
          resolve();
        }, 10000);
        server.close((err) => {
          clearTimeout(timeout);
          if (err) reject(err);
          else resolve();
        });
      });
    }
  } catch (err) {
    logger.error('Error closing HTTP server', { error: (err as Error).message });
  }
  
  await prisma.$disconnect();
  logger.info('Shutdown complete');
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
