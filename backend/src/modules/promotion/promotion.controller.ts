import { Request, Response } from 'express';
import { PromotionService } from './promotion.service';
import { asyncHandler } from '../../common/middleware';
import { createCouponSchema, updateCouponSchema, createCampaignSchema, campaignQuerySchema } from './promotion.validation';
import { ValidationError } from '../../common/errors';

const promotionService = new PromotionService();

export const createCoupon = asyncHandler(async (req: Request, res: Response) => {
  const result = createCouponSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  const coupon = await promotionService.createCoupon(result.data);
  res.status(201).json({ success: true, data: coupon });
});

export const updateCoupon = asyncHandler(async (req: Request, res: Response) => {
  const result = updateCouponSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  const coupon = await promotionService.updateCoupon(req.params.id, result.data);
  res.json({ success: true, data: coupon });
});

export const getCoupons = asyncHandler(async (req: Request, res: Response) => {
  const result = await promotionService.getCoupons(req.query);
  res.json({ success: true, ...result });
});

export const validateCoupon = asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.params;
  const { subtotal } = req.query;
  const result = await promotionService.validateCoupon(code, req.user!.userId, Number(subtotal) || 0);
  res.json({ success: true, data: result });
});

export const deleteCoupon = asyncHandler(async (req: Request, res: Response) => {
  const result = await promotionService.deleteCoupon(req.params.id);
  res.json({ success: true, ...result });
});

export const createCampaign = asyncHandler(async (req: Request, res: Response) => {
  const result = createCampaignSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  const campaign = await promotionService.createCampaign(result.data);
  res.status(201).json({ success: true, data: campaign });
});

export const getCampaigns = asyncHandler(async (req: Request, res: Response) => {
  const query = campaignQuerySchema.safeParse(req.query);
  if (!query.success) throw new ValidationError(query.error.flatten().fieldErrors as Record<string, string[]>);
  const result = await promotionService.getCampaigns(query.data);
  res.json({ success: true, ...result });
});

export const getActiveCampaigns = asyncHandler(async (_req: Request, res: Response) => {
  const campaigns = await promotionService.getActiveCampaigns();
  res.json({ success: true, data: campaigns });
});

export const deleteCampaign = asyncHandler(async (req: Request, res: Response) => {
  const result = await promotionService.deleteCampaign(req.params.id);
  res.json({ success: true, ...result });
});