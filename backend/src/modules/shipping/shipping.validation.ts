import { z } from 'zod';

export const createShipmentSchema = z.object({
  orderId: z.string().uuid(),
  courierCode: z.string().min(1),
  trackingNumber: z.string().optional(),
  origin: z.string().optional(),
  destination: z.string().optional(),
  weight: z.number().positive().optional(),
  estimatedDays: z.number().int().positive().optional(),
});

export const updateShipmentSchema = z.object({
  courierCode: z.string().optional(),
  trackingNumber: z.string().optional(),
  status: z.enum(['PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED']).optional(),
  estimatedDays: z.number().int().positive().optional(),
  events: z.array(z.object({
    status: z.string(),
    location: z.string().optional(),
    description: z.string().optional(),
    timestamp: z.string(),
  })).optional(),
});

export const shipmentEventSchema = z.object({
  status: z.string().min(1),
  location: z.string().optional(),
  description: z.string().optional(),
});

export const labelRequestSchema = z.object({
  provider: z.string().default('local'),
  serviceLevel: z.string().optional(),
  package: z.object({
    weight: z.number().positive().optional(),
    length: z.number().positive().optional(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
  }).optional(),
});
