import { Request, Response } from 'express';
import { asyncHandler } from '../../common/middleware';
import { AutomationService } from './automation.service';
import { automationWorker } from './automation.worker';

const automationService = new AutomationService();

export const runMarketplace = asyncHandler(async (_req: Request, res: Response) => {
  const result = await automationService.runMarketplaceAutomation();
  res.json({ success: true, data: result });
});

export const getWorkerStatus = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ success: true, data: { running: automationWorker['isRunning'], interval: automationWorker['intervalId'] !== null } });
});

export const triggerQueue = asyncHandler(async (_req: Request, res: Response) => {
  await automationWorker.processQueue();
  res.json({ success: true, message: 'Queue processing triggered' });
});
