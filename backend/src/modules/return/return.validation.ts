import { z } from 'zod';

export const createReturnSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  images: z.array(z.string()).optional(),
  items: z.array(z.object({
    orderItemId: z.string().uuid(),
    quantity: z.number().int().min(1),
  })).min(1),
});

export const updateReturnStatusSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'PICKED_UP', 'INSPECTING', 'REFUNDED', 'COMPLETED', 'CANCELLED']),
  adminNote: z.string().max(1000).optional(),
  refundAmount: z.number().positive().optional(),
  refundMethod: z.string().optional(),
});

export const returnQuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
  status: z.string().optional(),
});