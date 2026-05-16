import { z } from 'zod';

export const createReviewSchema = z.object({
  productId: z.string().uuid(),
  orderId: z.string().uuid().optional().nullable(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  text: z.string().max(2000).optional(),
  images: z.array(z.object({
    url: z.string(),
    sortOrder: z.number().int().min(0).default(0),
  })).optional(),
});

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().max(200).optional(),
  text: z.string().max(2000).optional(),
  images: z.array(z.object({
    url: z.string(),
    sortOrder: z.number().int().min(0).default(0),
  })).optional(),
});

export const replyToReviewSchema = z.object({
  text: z.string().min(1).max(2000),
});

export const reviewQuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('10'),
  sortBy: z.enum(['createdAt', 'rating']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  rating: z.string().transform(Number).optional(),
  isApproved: z.string().optional(),
});