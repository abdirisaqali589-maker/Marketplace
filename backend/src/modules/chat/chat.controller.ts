import { Request, Response } from 'express';
import { asyncHandler } from '../../common/middleware';
import { ChatService } from './chat.service';

const chatService = new ChatService();

export const listConversations = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });
  const result = await chatService.listConversations(userId, req.query as any);
  res.json({ success: true, ...result });
});

export const createConversation = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });
  const conversation = await chatService.createConversation(userId, req.body.title);
  res.status(201).json({ success: true, data: conversation });
});

export const getConversation = asyncHandler(async (req: Request, res: Response) => {
  const conversation = await chatService.getConversation(req.params.id);
  res.json({ success: true, data: conversation });
});

export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  const message = await chatService.sendMessage(req.params.id, req.body);
  res.status(201).json({ success: true, data: message });
});

export const listMessages = asyncHandler(async (req: Request, res: Response) => {
  const result = await chatService.listMessages(req.params.id, req.query as any);
  res.json({ success: true, ...result });
});

export const archiveConversation = asyncHandler(async (req: Request, res: Response) => {
  const conversation = await chatService.archiveConversation(req.params.id);
  res.json({ success: true, data: conversation });
});