import { Request, Response } from 'express';
import { OrderService } from './order.service';
import { asyncHandler } from '../../common/middleware';
import { createOrderSchema, updateOrderStatusSchema, orderQuerySchema } from './order.validation';
import { ValidationError } from '../../common/errors';

const orderService = new OrderService();

export const create = asyncHandler(async (req: Request, res: Response) => {
  const result = createOrderSchema.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const orders = await orderService.create(req.user!.userId, result.data);
  res.status(201).json({ success: true, data: orders });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.findById(req.params.id, req.user!);
  res.json({ success: true, data: order });
});

export const getByOrderNumber = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.findByOrderNumber(req.params.orderNumber, req.user!);
  res.json({ success: true, data: order });
});

export const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const query = orderQuerySchema.safeParse(req.query);
  if (!query.success) {
    throw new ValidationError(query.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const result = await orderService.findUserOrders(req.user!.userId, query.data);
  res.json({ success: true, ...result });
});

export const getSellerOrders = asyncHandler(async (req: Request, res: Response) => {
  const query = orderQuerySchema.safeParse(req.query);
  if (!query.success) {
    throw new ValidationError(query.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const result = await orderService.findSellerOrders(req.user!.userId, query.data);
  res.json({ success: true, ...result });
});

export const getAll = asyncHandler(async (req: Request, res: Response) => {
  const query = orderQuerySchema.safeParse(req.query);
  if (!query.success) {
    throw new ValidationError(query.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const result = await orderService.findAll(query.data);
  res.json({ success: true, ...result });
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const result = updateOrderStatusSchema.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const order = await orderService.updateStatus(req.params.id, result.data.status, req.user!, result.data.notes);
  res.json({ success: true, data: order });
});

export const cancelOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.cancelOrder(req.params.id, req.user!.userId);
  res.json({ success: true, data: order });
});
