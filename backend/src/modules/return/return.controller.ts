import { Request, Response } from 'express';
import { ReturnService } from './return.service';
import { asyncHandler } from '../../common/middleware';
import { createReturnSchema, updateReturnStatusSchema, returnQuerySchema } from './return.validation';
import { ValidationError } from '../../common/errors';

const returnService = new ReturnService();

export const create = asyncHandler(async (req: Request, res: Response) => {
  const result = createReturnSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  const returnRequest = await returnService.create(req.user!.userId, result.data);
  res.status(201).json({ success: true, data: returnRequest });
});

export const getMyReturns = asyncHandler(async (req: Request, res: Response) => {
  const query = returnQuerySchema.safeParse(req.query);
  if (!query.success) throw new ValidationError(query.error.flatten().fieldErrors as Record<string, string[]>);
  const result = await returnService.findUserReturns(req.user!.userId, query.data);
  res.json({ success: true, ...result });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const returnRequest = await returnService.findById(req.params.id);
  res.json({ success: true, data: returnRequest });
});

export const getAll = asyncHandler(async (req: Request, res: Response) => {
  const query = returnQuerySchema.safeParse(req.query);
  if (!query.success) throw new ValidationError(query.error.flatten().fieldErrors as Record<string, string[]>);
  const result = await returnService.findAll(query.data);
  res.json({ success: true, ...result });
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const result = updateReturnStatusSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  const returnRequest = await returnService.updateStatus(req.params.id, result.data);
  res.json({ success: true, data: returnRequest });
});