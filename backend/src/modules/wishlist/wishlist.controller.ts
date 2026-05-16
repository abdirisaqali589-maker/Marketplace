import { Request, Response } from 'express';
import { asyncHandler } from '../../common/middleware';
import { ValidationError } from '../../common/errors';
import { WishlistService } from './wishlist.service';
import { wishlistItemSchema } from './wishlist.validation';

const wishlistService = new WishlistService();

export const list = asyncHandler(async (req: Request, res: Response) => {
  const items = await wishlistService.list(req.user!.userId);
  res.json({ success: true, data: items });
});

export const add = asyncHandler(async (req: Request, res: Response) => {
  const result = wishlistItemSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  const item = await wishlistService.add(req.user!.userId, result.data.productId);
  res.status(201).json({ success: true, data: item });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const result = await wishlistService.remove(req.user!.userId, req.params.productId);
  res.json({ success: true, ...result });
});

export const clear = asyncHandler(async (req: Request, res: Response) => {
  const result = await wishlistService.clear(req.user!.userId);
  res.json({ success: true, ...result });
});
