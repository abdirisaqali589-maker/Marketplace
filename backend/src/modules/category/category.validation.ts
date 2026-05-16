import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  image: z.string().optional(),
  parentId: z.string().uuid().optional().nullable(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  filters: z.array(z.object({
    key: z.string(),
    label: z.string(),
    type: z.enum(['text', 'number', 'select', 'range', 'boolean', 'color']),
    options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
    required: z.boolean().default(false),
  })).optional(),
  attributes: z.array(z.object({
    name: z.string(),
    label: z.string(),
    type: z.enum(['text', 'number', 'select', 'color', 'size', 'material']),
    required: z.boolean().default(false),
    options: z.array(z.string()).optional(),
  })).optional(),
  commissionRate: z.number().min(0).max(100).optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const categoryQuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
  search: z.string().optional(),
  isActive: z.string().optional(),
  parentId: z.string().optional(),
  sortBy: z.enum(['name', 'sortOrder', 'createdAt', 'level']).default('sortOrder'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});