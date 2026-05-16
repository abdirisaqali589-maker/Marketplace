import { z } from 'zod';

export const createBrandSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).optional(),
  logo: z.string().optional(),
  description: z.string().max(1000).optional(),
  isApproved: z.boolean().default(false),
});

export const updateBrandSchema = createBrandSchema.partial();

export const brandQuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('50'),
  search: z.string().optional(),
  isApproved: z.string().optional(),
});