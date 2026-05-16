import { Request, Response } from 'express';
import { asyncHandler } from '../../common/middleware';
import { WorkflowService } from './workflow.service';

const workflowService = new WorkflowService();

export const listTemplates = asyncHandler(async (req: Request, res: Response) => {
  const result = await workflowService.listTemplates(req.query as any);
  res.json({ success: true, ...result });
});

export const createTemplate = asyncHandler(async (req: Request, res: Response) => {
  const template = await workflowService.createTemplate(req.body);
  res.status(201).json({ success: true, data: template });
});

export const updateTemplate = asyncHandler(async (req: Request, res: Response) => {
  const template = await workflowService.updateTemplate(req.params.id, req.body);
  res.json({ success: true, data: template });
});

export const deleteTemplate = asyncHandler(async (req: Request, res: Response) => {
  const result = await workflowService.deleteTemplate(req.params.id);
  res.json(result);
});

export const toggleTemplate = asyncHandler(async (req: Request, res: Response) => {
  const template = await workflowService.toggleTemplate(req.params.id);
  res.json({ success: true, data: template });
});

export const triggerRun = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const result = await workflowService.triggerRun(req.params.slug, req.body.input, userId);
  res.status(201).json({ success: true, data: result });
});

export const getRun = asyncHandler(async (req: Request, res: Response) => {
  const run = await workflowService.getRun(req.params.id);
  res.json({ success: true, data: run });
});

export const listRuns = asyncHandler(async (req: Request, res: Response) => {
  const result = await workflowService.listRuns(req.query as any);
  res.json({ success: true, ...result });
});

export const retryStep = asyncHandler(async (req: Request, res: Response) => {
  const result = await workflowService.retryStep(req.params.runId, parseInt(req.params.stepIndex));
  res.json(result);
});