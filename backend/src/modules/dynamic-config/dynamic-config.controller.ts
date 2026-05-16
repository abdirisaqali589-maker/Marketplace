import { Request, Response } from 'express';
import { DynamicConfigService } from './dynamic-config.service';
import { asyncHandler } from '../../common/middleware';

const configService = new DynamicConfigService();

export const getAll = asyncHandler(async (_req: Request, res: Response) => {
  const configs = await configService.getAll();
  res.json({ success: true, data: configs });
});

export const getByKey = asyncHandler(async (req: Request, res: Response) => {
  const config = await configService.getByKey(req.params.key);
  res.json({ success: true, data: config });
});

export const getPublic = asyncHandler(async (_req: Request, res: Response) => {
  const configs = await configService.getPublic();
  res.json({ success: true, data: configs });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const config = await configService.create(req.body);
  res.status(201).json({ success: true, data: config });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const config = await configService.update(req.params.key, req.body);
  res.json({ success: true, data: config });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const result = await configService.delete(req.params.key);
  res.json({ success: true, ...result });
});