import { z } from 'zod';

const imageUrlSchema = z.string().refine((value) => {
  if (value.startsWith('/uploads/')) return true;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}, 'Image URL must be an http(s) URL or a local upload path');

export const createProductSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).optional(),
  description: z.string().min(1),
  categoryId: z.string().uuid().optional().nullable(),
  brandId: z.string().uuid().optional().nullable(),
  basePrice: z.number().positive(),
  discountPrice: z.number().positive().optional().nullable(),
  costPrice: z.number().positive().optional().nullable(),
  currency: z.string().default('TZS'),
  status: z.enum(['DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'INACTIVE', 'REJECTED', 'ARCHIVED']).default('DRAFT'),
  isFeatured: z.boolean().default(false),
  specifications: z.record(z.string(), z.string()).optional(),
  images: z.array(z.object({
    url: imageUrlSchema,
    alt: z.string().optional(),
    isPrimary: z.boolean().default(false),
    sortOrder: z.number().int().min(0).default(0),
  })).optional(),
  variants: z.array(z.object({
    sku: z.string().min(1),
    barcode: z.string().optional(),
    attributes: z.record(z.string(), z.string()).optional(),
    price: z.number().positive(),
    discountPrice: z.number().positive().optional().nullable(),
    stock: z.number().int().min(0).default(0),
    lowStockThreshold: z.number().int().min(0).default(5),
    weight: z.number().positive().optional().nullable(),
    dimensions: z.object({
      length: z.number().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      unit: z.string().default('cm'),
    }).optional(),
    isActive: z.boolean().default(true),
  })).optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const productQuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
  search: z.string().optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  sellerId: z.string().optional(),
  minPrice: z.string().transform(Number).optional(),
  maxPrice: z.string().transform(Number).optional(),
  status: z.string().optional(),
  isActive: z.string().optional(),
  isFeatured: z.string().optional(),
  shipping: z.string().optional(),
  sortBy: z.enum(['title', 'basePrice', 'createdAt', 'updatedAt', 'rating', 'totalSales', 'discountPrice', 'soldCount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  inStock: z.string().optional(),
  rating: z.string().transform(Number).optional(),
});
