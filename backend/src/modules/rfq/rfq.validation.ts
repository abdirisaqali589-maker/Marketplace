import { z } from 'zod';

export const createRfqSchema = z.object({
  sellerId: z.string().uuid(),
  productId: z.string().uuid().optional(),
  subject: z.string().min(1).max(200),
  quantity: z.number().int().positive().optional(),
  targetPrice: z.number().positive().optional(),
  message: z.string().min(1).max(5000),
});

export const messageRfqSchema = z.object({
  body: z.string().min(1).max(5000),
  offer: z.object({
    price: z.number().positive().optional(),
    quantity: z.number().int().positive().optional(),
    validUntil: z.string().optional(),
  }).optional(),
  status: z.enum(['OPEN', 'QUOTED', 'ACCEPTED', 'DECLINED', 'CLOSED']).optional(),
});
