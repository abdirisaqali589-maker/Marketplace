import { z } from 'zod';

export const processPaymentSchema = z.object({
  orderId: z.string().uuid(),
  method: z.enum(['CARD', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CASH_ON_DELIVERY']),
  provider: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const paymentQuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
  status: z.string().optional(),
});

export const providerSessionSchema = z.object({
  orderId: z.string().uuid(),
  provider: z.enum(['stripe', 'paypal', 'mpesa']),
  returnUrl: z.string().url().optional(),
  phone: z.string().optional(),
});
