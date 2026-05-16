import { z } from 'zod';

export const createSellerSchema = z.object({
  storeName: z.string().min(1).max(100),
  storeSlug: z.string().min(1).max(100).optional(),
  storeLogo: z.string().optional(),
  storeBanner: z.string().optional(),
  storeDescription: z.string().max(1000).optional(),
  storeLocation: z.string().max(200).optional(),
  storefrontLayout: z.record(z.string(), z.any()).optional(),
  storefrontSections: z.array(z.object({
    id: z.string().uuid().optional(),
    title: z.string().min(1).max(120),
    type: z.enum(['FEATURED_PRODUCTS', 'COLLECTION', 'TEXT', 'BANNER']).default('FEATURED_PRODUCTS'),
    sortOrder: z.number().int().min(0).default(0),
    isActive: z.boolean().default(true),
    featuredProductIds: z.array(z.string().uuid()).default([]),
    metadata: z.record(z.string(), z.any()).optional(),
  })).optional(),
  sellerType: z.enum(['INDIVIDUAL', 'BUSINESS']).default('INDIVIDUAL'),
  shippingPolicy: z.string().max(2000).optional(),
  returnPolicy: z.string().max(2000).optional(),
  warrantyPolicy: z.string().max(2000).optional(),
});

export const updateSellerSchema = createSellerSchema.partial();

export const payoutRequestSchema = z.object({
  amount: z.number().positive(),
  method: z.string().min(1),
  accountRef: z.string().min(1),
});

export const kycSubmissionSchema = z.object({
  businessName: z.string().max(200).optional(),
  registrationNumber: z.string().max(100).optional(),
  taxId: z.string().max(100).optional(),
  ownerIdNumber: z.string().max(100).optional(),
  documents: z.array(z.object({
    type: z.string().min(1),
    url: z.string().min(1),
  })).min(1),
});
