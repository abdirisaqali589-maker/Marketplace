import { Request, Response } from 'express';
import { ProductService } from './product.service';
import { asyncHandler } from '../../common/middleware';
import { createProductSchema, updateProductSchema, productQuerySchema } from './product.validation';
import { answerQuestionSchema, createQuestionSchema } from './product-question.validation';
import { ValidationError } from '../../common/errors';

const productService = new ProductService();

export const getAll = asyncHandler(async (req: Request, res: Response) => {
  const query = productQuerySchema.safeParse(req.query);
  if (!query.success) {
    throw new ValidationError(query.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const result = await productService.findAll(query.data);
  res.json({ success: true, ...result });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.findById(req.params.id);
  res.json({ success: true, data: product });
});

export const getBySlug = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.findBySlug(req.params.slug);
  res.json({ success: true, data: product });
});

export const getFeatured = asyncHandler(async (_req: Request, res: Response) => {
  const products = await productService.getFeatured();
  res.json({ success: true, data: products });
});

export const getAttributeTemplate = asyncHandler(async (req: Request, res: Response) => {
  const template = await productService.getAttributeTemplate(req.query.categoryId as string | undefined, req.query.slug as string | undefined);
  res.json({ success: true, data: template });
});

export const previewImport = asyncHandler(async (req: Request, res: Response) => {
  if (!req.body?.content && !Array.isArray(req.body?.rows)) {
    throw new ValidationError({ content: ['CSV text, XLSX base64 content, or parsed rows are required'] });
  }
  const preview = await productService.previewImport(req.user!.userId, req.body);
  res.status(201).json({ success: true, data: preview });
});

export const runSearchIndex = asyncHandler(async (req: Request, res: Response) => {
  const job = await productService.runSearchIndexJob(req.body || {});
  res.status(201).json({ success: true, data: job });
});

export const runInventoryAutomation = asyncHandler(async (req: Request, res: Response) => {
  const result = await productService.runInventoryAutomation(req.user?.role === 'SELLER' ? req.user.userId : undefined);
  res.json({ success: true, data: result });
});

export const search = asyncHandler(async (req: Request, res: Response) => {
  const { q } = req.query;
  const query = productQuerySchema.safeParse(req.query);
  if (!query.success) {
    throw new ValidationError(query.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const result = await productService.searchProducts(q as string || '', query.data);
  res.json({ success: true, ...result });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const result = createProductSchema.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const product = await productService.create(result.data, req.user!.userId);
  res.status(201).json({ success: true, data: product });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const result = updateProductSchema.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const product = await productService.update(req.params.id, result.data, req.user!);
  res.json({ success: true, data: product });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const result = await productService.delete(req.params.id, req.user!);
  res.json({ success: true, ...result });
});

export const toggleFeatured = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.toggleFeatured(req.params.id);
  res.json({ success: true, data: product });
});

export const toggleActive = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.toggleActive(req.params.id);
  res.json({ success: true, data: product });
});

export const updateStock = asyncHandler(async (req: Request, res: Response) => {
  const { variantId, quantity } = req.body;
  const variant = await productService.updateStock(variantId, quantity, req.user!);
  res.json({ success: true, data: variant });
});

export const approve = asyncHandler(async (req: Request, res: Response) => {
  const status = req.body?.status;
  if (!['ACTIVE', 'REJECTED', 'PENDING_REVIEW'].includes(status)) {
    throw new ValidationError({ status: ['Must be ACTIVE, REJECTED, or PENDING_REVIEW'] });
  }
  const product = await productService.approveProduct(req.params.id, status, req.body?.reason);
  res.json({ success: true, data: product });
});

export const getSellerProducts = asyncHandler(async (req: Request, res: Response) => {
  const query = productQuerySchema.safeParse(req.query);
  if (!query.success) {
    throw new ValidationError(query.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const result = await productService.findSellerProducts(req.user!.userId, query.data);
  res.json({ success: true, ...result });
});

export const getQuestions = asyncHandler(async (req: Request, res: Response) => {
  const questions = await productService.getQuestions(req.params.id);
  res.json({ success: true, data: questions });
});

export const askQuestion = asyncHandler(async (req: Request, res: Response) => {
  const result = createQuestionSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  const question = await productService.askQuestion(req.params.id, req.user!.userId, result.data.question);
  res.status(201).json({ success: true, data: question });
});

export const answerQuestion = asyncHandler(async (req: Request, res: Response) => {
  const result = answerQuestionSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  const question = await productService.answerQuestion(req.params.questionId, req.user!, result.data.answer);
  res.json({ success: true, data: question });
});
