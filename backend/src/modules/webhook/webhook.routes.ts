import { Router, Request, Response } from 'express';
import { authenticate, authorize, asyncHandler } from '../../common/middleware';
import { WebhookEventBus } from './webhook.service';

const router = Router();
const eventBus = new WebhookEventBus();

router.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req: Request, res: Response) => {
  const result = await eventBus.findAll(req.query as any);
  res.json({ success: true, ...result });
}));

router.post('/emit', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req: Request, res: Response) => {
  const { eventType, source, payload } = req.body;
  if (!eventType || !source || !payload) {
    return res.status(400).json({ success: false, message: 'eventType, source, and payload are required' });
  }
  const event = await eventBus.emit(eventType, source, payload);
  res.status(201).json({ success: true, data: event });
}));

router.post('/process', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req: Request, res: Response) => {
  const result = await eventBus.processPending(req.body.batchSize || 10);
  const stats = await eventBus.getStats();
  res.json({ success: true, data: { ...result, stats } });
}));

router.get('/stats', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (_req: Request, res: Response) => {
  const stats = await eventBus.getStats();
  res.json({ success: true, data: stats });
}));

export default router;