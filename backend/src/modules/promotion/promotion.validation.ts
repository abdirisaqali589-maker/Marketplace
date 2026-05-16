import { z } from 'zod';

export const createCouponSchema = z.object({
  sellerId: z.string().uuid().optional().nullable(),
  code: z.string().min(1).max(50).transform(v => v.toUpperCase()),
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING']),
  value: z.number().positive(),
  minSpend: z.number().min(0).default(0),
  maxDiscount: z.number().positive().optional().nullable(),
  usageLimit: z.number().int().positive().optional().nullable(),
  userLimit: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().default(true),
  startsAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export const updateCouponSchema = createCouponSchema.partial();

export const createCampaignSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().optional(),
  description: z.string().max(1000).optional(),
  banner: z.string().optional(),
  type: z.enum(['FLASH_SALE', 'SEASONAL', 'VENDOR_DRIVEN']),
  discountType: z.string(),
  discountValue: z.number().positive(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  productIds: z.array(z.string().uuid()).optional(),
});

export const campaignQuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
  isActive: z.string().optional(),
  type: z.string().optional(),
});