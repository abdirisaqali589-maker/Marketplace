import { Request, Response } from 'express';
import { CartService } from './cart.service';
import { asyncHandler } from '../../common/middleware';
import { addToCartSchema, updateCartItemSchema, mergeCartSchema } from './cart.validation';
import { ValidationError } from '../../common/errors';

const cartService = new CartService();

export const getCart = asyncHandler(async (req: Request, res: Response) => {
  const cart = await cartService.getCart(req.user!.userId);
  res.json({ success: true, data: cart });
});

export const addItem = asyncHandler(async (req: Request, res: Response) => {
  const result = addToCartSchema.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const item = await cartService.addItem(req.user!.userId, result.data);
  res.status(201).json({ success: true, data: item });
});

export const updateItem = asyncHandler(async (req: Request, res: Response) => {
  const result = updateCartItemSchema.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const item = await cartService.updateItem(req.user!.userId, req.params.itemId, result.data);
  res.json({ success: true, data: item });
});

export const removeItem = asyncHandler(async (req: Request, res: Response) => {
  const result = await cartService.removeItem(req.user!.userId, req.params.itemId);
  res.json({ success: true, ...result });
});

export const clearCart = asyncHandler(async (req: Request, res: Response) => {
  const result = await cartService.clearCart(req.user!.userId);
  res.json({ success: true, ...result });
});

export const mergeCart = asyncHandler(async (req: Request, res: Response) => {
  const result = mergeCartSchema.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const cart = await cartService.mergeGuestCart(req.user!.userId, result.data.items);
  res.json({ success: true, data: cart });
});