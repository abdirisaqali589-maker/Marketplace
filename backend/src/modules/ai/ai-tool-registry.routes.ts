import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '../../common/middleware';
import { asyncHandler } from '../../common/middleware';
import { prisma } from '../../common/prisma';
import { AiToolRegistry, ToolDefinition } from '../ai/ai-tool-registry.service';

const router = Router();
const registry = new AiToolRegistry();

// ── Tool Registry CRUD ──

router.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req: Request, res: Response) => {
  const { category, enabled, role, riskLevel, search, page, limit } = req.query;
  const result = await registry.listTools({
    category: category as string,
    enabled: enabled === 'true' ? true : enabled === 'false' ? false : undefined,
    role: role as string,
    riskLevel: riskLevel as string,
    search: search as string,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });
  res.json({ success: true, ...result });
}));

// ── Audit Logs ──

router.get('/audit-logs', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req: Request, res: Response) => {
  const { toolName, userId, limit, page } = req.query;
  const where: any = {};
  if (toolName) where.toolName = toolName;
  if (userId) where.userId = userId;

  const [logs, total] = await Promise.all([
    prisma.aiToolAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: page ? (Number(page) - 1) * Number(limit || 20) : 0,
      take: Number(limit || 20),
    }),
    prisma.aiToolAuditLog.count({ where }),
  ]);

  res.json({
    success: true,
    data: logs,
    pagination: {
      page: Number(page || 1),
      limit: Number(limit || 20),
      total,
      totalPages: Math.ceil(total / Number(limit || 20)),
    },
  });
}));

router.get('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req: Request, res: Response) => {
  const tool = await registry.getToolById(req.params.id);
  res.json({ success: true, data: tool });
}));

router.get('/name/:name', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req: Request, res: Response) => {
  const tool = await registry.getToolByName(req.params.name);
  res.json({ success: true, data: tool });
}));

router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req: Request, res: Response) => {
  const tool = await registry.createTool(req.body as ToolDefinition);
  res.status(201).json({ success: true, data: tool });
}));

router.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req: Request, res: Response) => {
  const tool = await registry.updateTool(req.params.id, req.body);
  res.json({ success: true, data: tool });
}));

router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req: Request, res: Response) => {
  const result = await registry.deleteTool(req.params.id);
  res.json({ success: true, ...result });
}));

// ── Tool Permissions ──

router.post('/:id/permissions', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req: Request, res: Response) => {
  const { role, canExecute, canApprove } = req.body;
  const permission = await registry.setToolPermission(req.params.id, role, { canExecute, canApprove });
  res.status(201).json({ success: true, data: permission });
}));

router.get('/:id/permissions', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req: Request, res: Response) => {
  const permissions = await registry.getToolPermissions(req.params.id);
  res.json({ success: true, data: permissions });
}));

// ── Tool Approval ──

router.post('/:id/approve', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const result = await registry.approveToolCall(req.params.id, userId);
  res.json({ success: true, data: result });
}));

export default router;
