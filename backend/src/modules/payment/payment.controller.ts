import { Request, Response } from 'express';
import { PaymentService } from './payment.service';
import { asyncHandler } from '../../common/middleware';
import { processPaymentSchema, paymentQuerySchema, providerSessionSchema } from './payment.validation';
import { ValidationError } from '../../common/errors';

const paymentService = new PaymentService();

export const process = asyncHandler(async (req: Request, res: Response) => {
  const result = processPaymentSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  const payment = await paymentService.process(req.user!.userId, result.data);
  res.status(201).json({ success: true, data: payment });
});

export const getByOrder = asyncHandler(async (req: Request, res: Response) => {
  const payments = await paymentService.findByOrder(req.params.orderId, req.user!);
  res.json({ success: true, data: payments });
});

export const getAll = asyncHandler(async (req: Request, res: Response) => {
  const query = paymentQuerySchema.safeParse(req.query);
  if (!query.success) throw new ValidationError(query.error.flatten().fieldErrors as Record<string, string[]>);
  const result = await paymentService.findAll(query.data);
  res.json({ success: true, ...result });
});

export const testProvider = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentService.testProvider(req.params.providerId);
  res.json({ success: true, data: result });
});

export const createProviderSession = asyncHandler(async (req: Request, res: Response) => {
  const result = providerSessionSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.flatten().fieldErrors as Record<string, string[]>);
  const session = await paymentService.createProviderSession(req.user!.userId, result.data);
  res.status(201).json({ success: true, data: session });
});

export const webhook = asyncHandler(async (req: Request, res: Response) => {
  // Determine signature from provider-specific headers
  const provider = req.params.provider;
  let signature: string | undefined;

  if (provider === 'stripe') {
    signature = req.headers['stripe-signature'] as string | undefined;
  } else if (provider === 'paypal') {
    signature = req.headers['paypal-transmission-sig'] as string | undefined;
  } else if (provider === 'mpesa') {
    signature = req.headers['x-mpesa-signature'] as string | undefined;
  } else {
    signature = req.headers['x-marketplace-signature'] as string | undefined;
  }

  const result = await paymentService.handleWebhook(req.body, signature, provider);
  res.json({ success: true, ...result });
});
