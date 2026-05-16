import { Request, Response } from 'express';
import { asyncHandler } from '../../common/middleware';
import { AiService } from './ai.service';

const aiService = new AiService();

export const listProviders = asyncHandler(async (req: Request, res: Response) => {
  const result = await aiService.listProviders(req.query as any);
  res.json({ success: true, ...result });
});

export const createProvider = asyncHandler(async (req: Request, res: Response) => {
  const provider = await aiService.createProvider(req.body);
  res.status(201).json({ success: true, data: provider });
});

export const updateProvider = asyncHandler(async (req: Request, res: Response) => {
  const provider = await aiService.updateProvider(req.params.id, req.body);
  res.json({ success: true, data: provider });
});

export const deleteProvider = asyncHandler(async (req: Request, res: Response) => {
  const result = await aiService.deleteProvider(req.params.id);
  res.json(result);
});

export const toggleProvider = asyncHandler(async (req: Request, res: Response) => {
  const provider = await aiService.toggleProvider(req.params.id);
  res.json({ success: true, data: provider });
});

export const listModels = asyncHandler(async (req: Request, res: Response) => {
  const result = await aiService.listModels(req.query as any);
  res.json({ success: true, ...result });
});

export const createModel = asyncHandler(async (req: Request, res: Response) => {
  const model = await aiService.createModel(req.body);
  res.status(201).json({ success: true, data: model });
});

export const updateModel = asyncHandler(async (req: Request, res: Response) => {
  const model = await aiService.updateModel(req.params.id, req.body);
  res.json({ success: true, data: model });
});

export const deleteModel = asyncHandler(async (req: Request, res: Response) => {
  const result = await aiService.deleteModel(req.params.id);
  res.json(result);
});

export const chatCompletion = asyncHandler(async (req: Request, res: Response) => {
  const { provider, model } = req.params;
  const { messages } = req.body;
  const result = await aiService.chatCompletion(provider, model, messages);
  res.json({ success: true, data: result });
});

export const getModelsByProvider = asyncHandler(async (req: Request, res: Response) => {
  const models = await aiService.getModelsByProvider(req.params.slug);
  res.json({ success: true, data: models });
});

export const testProviderConnection = asyncHandler(async (req: Request, res: Response) => {
  const result = await aiService.testConnection(req.params.id);
  res.json({ success: true, data: result });
});

export const fetchModels = asyncHandler(async (req: Request, res: Response) => {
  const result = await aiService.fetchProviderModels(req.params.id);
  res.json({ success: true, data: result });
});
