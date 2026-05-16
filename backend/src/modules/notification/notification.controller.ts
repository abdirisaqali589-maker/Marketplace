import { Request, Response } from 'express';
import { NotificationService } from './notification.service';
import { asyncHandler } from '../../common/middleware';
import { notificationQuerySchema } from './notification.validation';
import { ValidationError } from '../../common/errors';

const notificationService = new NotificationService();

export const getAll = asyncHandler(async (req: Request, res: Response) => {
  const query = notificationQuerySchema.safeParse(req.query);
  if (!query.success) throw new ValidationError(query.error.flatten().fieldErrors as Record<string, string[]>);
  const result = await notificationService.findAll(req.user!.userId, query.data);
  res.json({ success: true, ...result });
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const notification = await notificationService.markAsRead(req.params.id, req.user!.userId);
  res.json({ success: true, data: notification });
});

export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  const result = await notificationService.markAllAsRead(req.user!.userId);
  res.json({ success: true, ...result });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const result = await notificationService.delete(req.params.id, req.user!.userId);
  res.json({ success: true, ...result });
});