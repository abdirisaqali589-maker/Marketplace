import { Request, Response } from 'express';
import { asyncHandler } from '../../common/middleware';
import { PluginService } from './plugin.service';

const pluginService = new PluginService();

export const listPlugins = asyncHandler(async (req: Request, res: Response) => {
  const result = await pluginService.findAll(req.query as any);
  res.json({ success: true, ...result });
});

export const getPlugin = asyncHandler(async (req: Request, res: Response) => {
  const plugin = await pluginService.findById(req.params.id);
  res.json({ success: true, data: plugin });
});

export const createPlugin = asyncHandler(async (req: Request, res: Response) => {
  const plugin = await pluginService.create(req.body);
  res.status(201).json({ success: true, data: plugin });
});

export const updatePlugin = asyncHandler(async (req: Request, res: Response) => {
  const plugin = await pluginService.update(req.params.id, req.body);
  res.json({ success: true, data: plugin });
});

export const deletePlugin = asyncHandler(async (req: Request, res: Response) => {
  const result = await pluginService.remove(req.params.id);
  res.json(result);
});

export const togglePlugin = asyncHandler(async (req: Request, res: Response) => {
  const plugin = await pluginService.toggleEnabled(req.params.id);
  res.json({ success: true, data: plugin });
});

export const getPluginWebhooks = asyncHandler(async (req: Request, res: Response) => {
  const webhooks = await pluginService.getWebhookUrls(req.params.eventType);
  res.json({ success: true, data: webhooks });
});