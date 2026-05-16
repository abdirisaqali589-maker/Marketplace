import { Request, Response } from 'express';
import { ReviewService } from './review.service';
import { asyncHandler } from '../../common/middleware';
import { createReviewSchema, updateReviewSchema, replyToReviewSchema, reviewQuerySchema } from './review.validation';
import { ValidationError } from '../../common/errors';

const reviewService = new ReviewService();

export const getByProduct = asyncHandler(async (req: Request, res: Response) => {
  const query = reviewQuerySchema.safeParse(req.query);
  if (!query.success) throw new ValidationError(query.error.flatten().fieldErrors as Record<string, string[]>);
  const result = await reviewService.findByProduct(req.params.productId, query.data);
  res.json({ success: true, ...result });
});

export const getAll = asyncHandler(async (req: Request, res: Response) => {
  const query = reviewQuerySchema.safeParse(req.query);
  if (!query.success) throw new ValidationError(query.error.flatten().fieldErrors as Record<string, string[]>);
  const result = await reviewService.findAll(query.data);
  res.json({ success: true, ...result });
});

export const getSellerReviews = asyncHandler(async (req: Request, res: Response) => {
  const query = reviewQuerySchema.safeParse(req.query);
  if (!query.success) throw new ValidationError(query.error.flatten().fieldErrors as Record<string, string[]>);
  const result = await reviewService.findBySeller(req.user!.userId, req.user!.role, query.data);
  res.json({ success: true, ...result });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const result = createReviewSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  const review = await reviewService.create(req.user!.userId, result.data);
  res.status(201).json({ success: true, data: review });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const result = updateReviewSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  const review = await reviewService.update(req.params.id, req.user!.userId, result.data);
  res.json({ success: true, data: review });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const result = await reviewService.delete(req.params.id, req.user!.userId);
  res.json({ success: true, ...result });
});

export const reply = asyncHandler(async (req: Request, res: Response) => {
  const result = replyToReviewSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  const reply = await reviewService.replyToReview(req.params.id, req.user!.userId, req.user!.role, result.data.text);
  res.status(201).json({ success: true, data: reply });
});

export const toggleApproval = asyncHandler(async (req: Request, res: Response) => {
  const review = await reviewService.toggleApproval(req.params.id);
  res.json({ success: true, data: review });
});
