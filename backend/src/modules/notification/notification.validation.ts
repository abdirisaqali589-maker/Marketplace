import { z } from 'zod';

export const createNotificationSchema = z.object({
  userId: z.string().uuid(),
  type: z.string().min(1),
  title: z.string().min(1).max(200),
  body: z.string().max(1000).optional(),
  data: z.record(z.string(), z.any()).optional(),
});

export const notificationQuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
  type: z.string().optional(),
  isRead: z.string().optional(),
});