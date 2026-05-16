import { Request, Response } from 'express';
import { BrandService } from './brand.service';
import { DynamicConfigService } from '../dynamic-config/dynamic-config.service';
import { asyncHandler } from '../../common/middleware';
import { createBrandSchema, updateBrandSchema, brandQuerySchema } from './brand.validation';
import { ValidationError } from '../../common/errors';

const brandService = new BrandService();
const configService = new DynamicConfigService();

export const getAll = asyncHandler(async (req: Request, res: Response) => {
  const query = brandQuerySchema.safeParse(req.query);
  if (!query.success) throw new ValidationError(query.error.flatten().fieldErrors as Record<string, string[]>);
  const result = await brandService.findAll(query.data);
  res.json({ success: true, ...result });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const brand = await brandService.findById(req.params.id);
  res.json({ success: true, data: brand });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const result = createBrandSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  const catalog = await configService.getValue('marketplace.catalog', {});
  const isSeller = req.user?.role === 'SELLER';
  if (isSeller && catalog.sellerBrandCreationEnabled === false) {
    throw new ValidationError({ brand: ['Seller brand creation is disabled'] });
  }
  const brand = await brandService.create({
    ...result.data,
    isApproved: isSeller ? !catalog.brandApprovalRequired : result.data.isApproved,
  });
  res.status(201).json({ success: true, data: brand });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const result = updateBrandSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  const brand = await brandService.update(req.params.id, result.data);
  res.json({ success: true, data: brand });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const result = await brandService.delete(req.params.id);
  res.json({ success: true, ...result });
});
