import { Request, Response } from 'express';
import { ShippingService } from './shipping.service';
import { asyncHandler } from '../../common/middleware';
import { createShipmentSchema, labelRequestSchema, shipmentEventSchema, updateShipmentSchema } from './shipping.validation';
import { ValidationError } from '../../common/errors';

const shippingService = new ShippingService();

export const create = asyncHandler(async (req: Request, res: Response) => {
  const result = createShipmentSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  const shipment = await shippingService.create(result.data);
  res.status(201).json({ success: true, data: shipment });
});

export const getByOrder = asyncHandler(async (req: Request, res: Response) => {
  const shipments = await shippingService.findByOrder(req.params.orderId);
  res.json({ success: true, data: shipments });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const shipment = await shippingService.findById(req.params.id);
  res.json({ success: true, data: shipment });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const result = updateShipmentSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  const shipment = await shippingService.update(req.params.id, result.data);
  res.json({ success: true, data: shipment });
});

export const track = asyncHandler(async (req: Request, res: Response) => {
  const shipment = await shippingService.trackByTrackingNumber(req.params.trackingNumber);
  res.json({ success: true, data: shipment });
});

export const appendEvent = asyncHandler(async (req: Request, res: Response) => {
  const result = shipmentEventSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  const shipment = await shippingService.appendEvent(req.params.id, result.data);
  res.json({ success: true, data: shipment });
});

export const generateLabel = asyncHandler(async (req: Request, res: Response) => {
  const result = labelRequestSchema.safeParse(req.body || {});
  if (!result.success) throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  const label = await shippingService.generateLabel(req.params.orderId, result.data);
  res.status(201).json({ success: true, data: label });
});
