import { Request, Response } from 'express';
import { SellerService } from './seller.service';
import { asyncHandler } from '../../common/middleware';
import { createSellerSchema, updateSellerSchema, payoutRequestSchema, kycSubmissionSchema } from './seller.validation';
import { ValidationError } from '../../common/errors';

const sellerService = new SellerService();

export const getPublicSellers = asyncHandler(async (req: Request, res: Response) => {
  const result = await sellerService.findPublic(req.query);
  res.json({ success: true, ...result });
});

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await sellerService.getProfile(req.user!.userId);
  res.json({ success: true, data: profile });
});

export const getByStoreSlug = asyncHandler(async (req: Request, res: Response) => {
  const seller = await sellerService.getByStoreSlug(req.params.slug);
  res.json({ success: true, data: seller });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const result = createSellerSchema.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const seller = await sellerService.create(req.user!.userId, result.data);
  res.status(201).json({ success: true, data: seller });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const result = updateSellerSchema.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const seller = await sellerService.update(req.user!.userId, result.data);
  res.json({ success: true, data: seller });
});

export const updateStorefront = asyncHandler(async (req: Request, res: Response) => {
  const result = updateSellerSchema.pick({ storefrontLayout: true, storefrontSections: true }).safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const seller = await sellerService.updateStorefront(req.user!.userId, result.data);
  res.json({ success: true, data: seller });
});

export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  const dashboard = await sellerService.getDashboard(req.user!.userId);
  res.json({ success: true, data: dashboard });
});

export const requestPayout = asyncHandler(async (req: Request, res: Response) => {
  const result = payoutRequestSchema.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const payout = await sellerService.requestPayout(req.user!.userId, result.data);
  res.status(201).json({ success: true, data: payout });
});

export const getPayouts = asyncHandler(async (req: Request, res: Response) => {
  const payouts = await sellerService.getPayouts(req.user!.userId);
  res.json({ success: true, data: payouts });
});

export const getAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const period = req.query.period as string || '30d';
  const analytics = await sellerService.getAnalytics(req.user!.userId, period);
  res.json({ success: true, data: analytics });
});

export const submitKyc = asyncHandler(async (req: Request, res: Response) => {
  const result = kycSubmissionSchema.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const seller = await sellerService.submitKyc(req.user!.userId, result.data);
  res.json({ success: true, data: seller });
});
