import { Request, Response } from 'express';
import { asyncHandler } from '../../common/middleware';
import { ValidationError } from '../../common/errors';
import { RfqService } from './rfq.service';
import { createRfqSchema, messageRfqSchema } from './rfq.validation';

const rfqService = new RfqService();

export const create = asyncHandler(async (req: Request, res: Response) => {
  const result = createRfqSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  const thread = await rfqService.create(req.user!.userId, result.data);
  res.status(201).json({ success: true, data: thread });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await rfqService.list(req.user!, req.query);
  res.json({ success: true, ...result });
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const thread = await rfqService.get(req.params.id, req.user!);
  res.json({ success: true, data: thread });
});

export const message = asyncHandler(async (req: Request, res: Response) => {
  const result = messageRfqSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  const thread = await rfqService.message(req.params.id, req.user!, result.data);
  res.json({ success: true, data: thread });
});
