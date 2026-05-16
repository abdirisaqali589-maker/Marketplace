import { Request, Response } from 'express';
import { AdminService } from './admin.service';
import { asyncHandler } from '../../common/middleware';
import { createRoleSchema, updateRoleSchema, assignRoleSchema, adminQuerySchema } from './admin.validation';
import { ValidationError } from '../../common/errors';

const adminService = new AdminService();

export const getDashboard = asyncHandler(async (_req: Request, res: Response) => {
  const dashboard = await adminService.getDashboard();
  res.json({ success: true, data: dashboard });
});

export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const query = adminQuerySchema.safeParse(req.query);
  if (!query.success) throw new ValidationError(query.error.flatten().fieldErrors as Record<string, string[]>);
  const result = await adminService.getUsers(query.data);
  res.json({ success: true, ...result });
});

export const getUserDetail = asyncHandler(async (req: Request, res: Response) => {
  const user = await adminService.getUserDetail(req.params.id);
  res.json({ success: true, data: user });
});

export const toggleUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const user = await adminService.toggleUserStatus(req.params.id);
  res.json({ success: true, data: user });
});

export const getRoles = asyncHandler(async (_req: Request, res: Response) => {
  const roles = await adminService.getRoles();
  res.json({ success: true, data: roles });
});

export const createRole = asyncHandler(async (req: Request, res: Response) => {
  const result = createRoleSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  const role = await adminService.createRole(result.data);
  res.status(201).json({ success: true, data: role });
});

export const updateRole = asyncHandler(async (req: Request, res: Response) => {
  const result = updateRoleSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  const role = await adminService.updateRole(req.params.id, result.data);
  res.json({ success: true, data: role });
});

export const deleteRole = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.deleteRole(req.params.id);
  res.json({ success: true, ...result });
});

export const assignRole = asyncHandler(async (req: Request, res: Response) => {
  const result = assignRoleSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  const adminUser = await adminService.assignRole(result.data.userId, result.data.roleId);
  res.status(201).json({ success: true, data: adminUser });
});

export const getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const query = adminQuerySchema.safeParse(req.query);
  if (!query.success) throw new ValidationError(query.error.flatten().fieldErrors as Record<string, string[]>);
  const result = await adminService.getAuditLogs(query.data);
  res.json({ success: true, ...result });
});

export const verifySeller = asyncHandler(async (req: Request, res: Response) => {
  const seller = await adminService.verifySeller(req.params.id);
  res.json({ success: true, data: seller });
});

export const rejectSeller = asyncHandler(async (req: Request, res: Response) => {
  const { reason } = req.body;
  const seller = await adminService.rejectSeller(req.params.id, reason);
  res.json({ success: true, data: seller });
});