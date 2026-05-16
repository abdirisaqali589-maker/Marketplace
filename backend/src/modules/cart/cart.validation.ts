import { z } from 'zod';

export const addToCartSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional().nullable(),
  quantity: z.number().int().min(1).default(1),
  note: z.string().max(200).optional(),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0).max(100),
  note: z.string().max(200).optional(),
});

export const mergeCartSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    variantId: z.string().uuid().optional().nullable(),
    quantity: z.number().int().min(1),
    note: z.string().optional(),
  })),
});