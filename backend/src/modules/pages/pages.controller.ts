import { Request, Response } from 'express';
import { asyncHandler } from '../../common/middleware';
import { PagesService } from './pages.service';

const pagesService = new PagesService();

export const listPages = asyncHandler(async (req: Request, res: Response) => {
  const result = await pagesService.findAll(req.query);
  res.json({ success: true, ...result });
});

export const getPage = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const page = await pagesService.findBySlug(slug);
  res.json({ success: true, data: page });
});

export const getPageById = asyncHandler(async (req: Request, res: Response) => {
  const page = await pagesService.findById(req.params.id);
  res.json({ success: true, data: page });
});

export const getPagesByCategory = asyncHandler(async (req: Request, res: Response) => {
  const pages = await pagesService.findByCategory(req.params.category);
  res.json({ success: true, data: pages });
});

export const createPage = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const data = {
    ...req.body,
    authorId: user?.userId || req.body.authorId,
    authorName: user?.firstName || req.body.authorName || 'Admin',
  };
  const page = await pagesService.create(data);
  res.status(201).json({ success: true, data: page });
});

export const updatePage = asyncHandler(async (req: Request, res: Response) => {
  const page = await pagesService.update(req.params.id, req.body);
  res.json({ success: true, data: page });
});

export const publishPage = asyncHandler(async (req: Request, res: Response) => {
  const page = await pagesService.publish(req.params.id);
  res.json({ success: true, data: page });
});

export const unpublishPage = asyncHandler(async (req: Request, res: Response) => {
  const page = await pagesService.unpublish(req.params.id);
  res.json({ success: true, data: page });
});

export const deletePage = asyncHandler(async (req: Request, res: Response) => {
  const result = await pagesService.delete(req.params.id);
  res.json(result);
});