import { Request, Response } from 'express';
import { CategoryService } from './category.service';
import { asyncHandler } from '../../common/middleware';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryQuerySchema,
} from './category.validation';
import { ValidationError } from '../../common/errors';

const categoryService = new CategoryService();

export const getAll = asyncHandler(async (req: Request, res: Response) => {
  const query = categoryQuerySchema.safeParse(req.query);
  if (!query.success) {
    throw new ValidationError(query.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const result = await categoryService.findAll(query.data);
  res.json({ success: true, ...result });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.findById(req.params.id);
  res.json({ success: true, data: category });
});

export const getBySlug = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.findBySlug(req.params.slug);
  res.json({ success: true, data: category });
});

export const getTree = asyncHandler(async (_req: Request, res: Response) => {
  const tree = await categoryService.getTree();
  res.json({ success: true, data: tree });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const result = createCategorySchema.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const category = await categoryService.create(result.data);
  res.status(201).json({ success: true, data: category });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const result = updateCategorySchema.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const category = await categoryService.update(req.params.id, result.data);
  res.json({ success: true, data: category });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const result = await categoryService.delete(req.params.id);
  res.json({ success: true, ...result });
});

export const reorder = asyncHandler(async (req: Request, res: Response) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) {
    throw new ValidationError({ ids: ['Must be an array of category IDs'] });
  }
  const result = await categoryService.reorder(ids);
  res.json({ success: true, ...result });
});

export const getFilters = asyncHandler(async (req: Request, res: Response) => {
  const filters = await categoryService.getFilters(req.params.id);
  res.json({ success: true, data: filters });
});

export const getAttributes = asyncHandler(async (req: Request, res: Response) => {
  const attributes = await categoryService.getAttributes(req.params.id);
  res.json({ success: true, data: attributes });
});