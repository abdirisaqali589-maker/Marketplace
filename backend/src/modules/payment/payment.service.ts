import { prisma } from '../../common/prisma';
import { AppError, NotFoundError } from '../../common/errors';
import { AuthPayload } from '../../common/middleware';
import { createHmac, timingSafeEqual } from 'crypto';
import { config } from '../../common/config';
import { DynamicConfigService } from '../dynamic-config/dynamic-config.service';

export class PaymentService {
  private configService = new DynamicConfigService();

  private isAdmin(user: AuthPayload): boolean {
    return ['ADMIN', 'SUPER_ADMIN'].includes(user.role);
  }

  private async getSellerIdForUser(userId: string): Promise<string> {
    const seller = await prisma.seller.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!seller) throw new NotFoundError('Seller profile not found');
    return seller.id;
  }

  async process(userId: string, data: any) {
    const order = await prisma.order.findUnique({ where: { id: data.orderId } });
    if (!order) throw new NotFoundError('Order not found');
    if (order.userId !== userId) throw new AppError(403, 'Not authorized');
    if (order.paymentStatus !== 'PENDING') throw new AppError(400, 'Payment already processed');
    const paymentConfig = await this.configService.getValue('marketplace.payments', {});
    const providers = Array.isArray(paymentConfig.providers) ? paymentConfig.providers : [];
    const enabledProvider = data.provider ? providers.find((provider: any) => provider.id === data.provider && provider.enabled) : null;
    if (data.provider && !enabledProvider) throw new AppError(400, 'Payment provider is not enabled');
    if (paymentConfig.requireConfiguredProvider && !enabledProvider && data.method !== 'CASH_ON_DELIVERY') {
      throw new AppError(400, 'A configured payment provider is required for this method');
    }

    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const payment = await prisma.payment.create({
      data: {
        orderId: data.orderId,
        method: data.method,
        provider: data.provider || data.method,
        transactionId,
        amount: order.totalAmount,
        currency: 'TZS',
        status: 'COMPLETED',
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        paidAt: new Date(),
      },
    });

    await prisma.order.update({
      where: { id: data.orderId },
      data: { paymentStatus: 'PAID', status: 'PAYMENT_CONFIRMED' },
    });

    return payment;
  }

  async createProviderSession(userId: string, data: any) {
    const order = await prisma.order.findUnique({ where: { id: data.orderId } });
    if (!order) throw new NotFoundError('Order not found');
    if (order.userId !== userId) throw new AppError(403, 'Not authorized');
    const provider = data.provider || data.method?.toLowerCase();
    if (!['stripe', 'paypal', 'mpesa'].includes(provider)) {
      throw new AppError(400, 'Provider must be stripe, paypal, or mpesa');
    }
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        method: provider === 'mpesa' ? 'MOBILE_MONEY' : 'CARD',
        provider,
        transactionId: `${provider.toUpperCase()}-SESSION-${Date.now()}`,
        amount: order.totalAmount,
        currency: 'TZS',
        status: 'PENDING',
        metadata: JSON.stringify({
          providerSession: true,
          returnUrl: data.returnUrl,
          phone: data.phone,
        }),
      },
    });
    return {
      payment,
      provider,
      checkoutUrl: provider === 'mpesa' ? null : `/checkout/${provider}/${payment.transactionId}`,
      clientSecret: provider === 'stripe' ? `pi_${payment.id}_secret_local` : undefined,
      approvalUrl: provider === 'paypal' ? `/paypal/approve/${payment.transactionId}` : undefined,
      mpesaCheckoutRequestId: provider === 'mpesa' ? payment.transactionId : undefined,
      simulated: true,
    };
  }

  async testProvider(providerId: string) {
    const paymentConfig = await this.configService.getValue('marketplace.payments', {});
    const providers = Array.isArray(paymentConfig.providers) ? paymentConfig.providers : [];
    const provider = providers.find((item: any) => item.id === providerId);
    if (!provider) throw new NotFoundError('Payment provider not found');

    const requiredByProvider: Record<string, string[]> = {
      stripe: ['publishableKey', 'secretKey'],
      paypal: ['clientId', 'clientSecret'],
      mpesa: ['consumerKey', 'consumerSecret', 'passkey', 'shortcode'],
      flutterwave: ['publicKey', 'secretKey'],
    };
    const required = requiredByProvider[provider.id] || [];
    const missing = required.filter((field) => !provider[field]);

    if (provider.mode === 'live' && missing.length) {
      throw new AppError(422, `Missing required live credentials: ${missing.join(', ')}`);
    }

    if (provider.mode !== 'live' || paymentConfig.localMockEnabled) {
      return {
        providerId,
        mode: provider.mode || 'test',
        status: 'CONNECTED',
        simulated: true,
        message: 'Local mock connection succeeded',
        checkedAt: new Date().toISOString(),
      };
    }

    return {
      providerId,
      mode: provider.mode,
      status: 'READY',
      simulated: false,
      message: 'Credentials are present. Add the provider SDK call here for production verification.',
      checkedAt: new Date().toISOString(),
    };
  }

  async findByOrder(orderId: string, user: AuthPayload) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { userId: true, sellerId: true },
    });
    if (!order) throw new NotFoundError('Order not found');
    if (!this.isAdmin(user) && order.userId !== user.userId) {
      if (user.role !== 'SELLER') throw new AppError(403, 'Not authorized');
      const sellerId = await this.getSellerIdForUser(user.userId);
      if (order.sellerId !== sellerId) throw new AppError(403, 'Not authorized');
    }

    return prisma.payment.findMany({ where: { orderId }, orderBy: { createdAt: 'desc' } });
  }

  async findAll(query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const { status } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: { order: { select: { orderNumber: true, totalAmount: true, userId: true } } },
        orderBy: { createdAt: 'desc' }, skip, take: limit,
      }),
      prisma.payment.count({ where }),
    ]);
    return { data: payments, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async handleWebhook(payload: any, signature?: string, provider?: string, rawBody?: string) {
    // --- Provider-specific signature verification ---
    if (provider === 'stripe') {
      this.verifyStripeSignature(payload, signature);
    } else if (provider === 'paypal') {
      this.verifyPaypalSignature(payload, signature);
    } else if (provider === 'mpesa') {
      this.verifyMpesaSignature(payload, signature);
    } else {
      // Generic HMAC-SHA256 verification fallback
      this.verifyGenericSignature(payload, signature);
    }

    const normalized = this.normalizeWebhookPayload(payload, provider);
    if (normalized.orderId && normalized.status) {
      const paymentStatus = normalized.status === 'COMPLETED' ? 'PAID' : normalized.status;
      await prisma.order.updateMany({
        where: { id: normalized.orderId },
        data: {
          paymentStatus,
          ...(paymentStatus === 'PAID' && { status: 'PAYMENT_CONFIRMED' }),
        },
      });
      if (normalized.transactionId) {
        await prisma.payment.updateMany({
          where: { transactionId: normalized.transactionId },
          data: { status: normalized.status, paidAt: normalized.status === 'COMPLETED' ? new Date() : undefined },
        });
      }
    }
    return { received: true, provider: provider || payload.provider || 'generic' };
  }

  private verifyGenericSignature(payload: any, signature?: string) {
    if (!config.paymentWebhookSecret) return; // No secret configured, skip
    if (!signature) throw new AppError(401, 'Missing webhook signature');

    // Support both sha256=... and raw hex signature formats
    const received = signature.replace(/^sha256=/, '');
    const expected = createHmac('sha256', config.paymentWebhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(received);
    if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
      throw new AppError(401, 'Invalid webhook signature: payload integrity check failed');
    }
  }

  private verifyStripeSignature(payload: any, signature?: string) {
    if (!config.paymentWebhookSecret) return;
    if (!signature) throw new AppError(401, 'Missing Stripe webhook signature');

    // Stripe format: t=timestamp,v1=signature,v0=legacy
    const parts = signature.split(',').reduce<Record<string, string>>((acc, part) => {
      const [key, value] = part.split('=');
      acc[key] = value;
      return acc;
    }, {});

    const timestamp = parseInt(parts.t || '0', 10);
    const providedSig = parts.v1;
    if (!providedSig) throw new AppError(401, 'Missing v1 signature in Stripe webhook');

    // Reject signatures older than 5 minutes
    const now = Math.floor(Date.now() / 1000);
    if (now - timestamp > 300) {
      throw new AppError(401, 'Stripe webhook timestamp expired');
    }

    const signedPayload = `${timestamp}.${typeof payload === 'string' ? payload : JSON.stringify(payload)}`;
    const expected = createHmac('sha256', config.paymentWebhookSecret)
      .update(signedPayload)
      .digest('hex');

    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(providedSig);
    if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
      throw new AppError(401, 'Invalid Stripe webhook signature');
    }
  }

  private verifyPaypalSignature(payload: any, signature?: string) {
    if (!config.paymentWebhookSecret) return;
    if (!signature) throw new AppError(401, 'Missing PayPal webhook signature');

    // PayPal uses transmission-id + transmission-sig with JWT-based verification
    // For local verification we validate HMAC of the payload
    const expected = createHmac('sha256', config.paymentWebhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(signature);
    if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
      throw new AppError(401, 'Invalid PayPal webhook signature');
    }
  }

  private verifyMpesaSignature(payload: any, signature?: string) {
    if (!config.paymentWebhookSecret) return;
    if (!signature) throw new AppError(401, 'Missing M-Pesa webhook signature');

    // M-Pesa uses SecurityCredential for validation
    // For local testing, validate the payload body with HMAC
    const expected = createHmac('sha256', config.paymentWebhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(signature);
    if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
      throw new AppError(401, 'Invalid M-Pesa webhook signature');
    }
  }

  private normalizeWebhookPayload(payload: any, provider?: string) {
    if (provider === 'stripe') {
      const object = payload.data?.object || payload;
      return {
        orderId: object.metadata?.orderId || payload.orderId,
        status: object.status === 'succeeded' ? 'COMPLETED' : String(object.status || payload.status || '').toUpperCase(),
        transactionId: object.metadata?.transactionId || object.id,
      };
    }
    if (provider === 'paypal') {
      const resource = payload.resource || payload;
      return {
        orderId: resource.custom_id || payload.orderId,
        status: payload.event_type?.includes('COMPLETED') || resource.status === 'COMPLETED' ? 'COMPLETED' : resource.status,
        transactionId: resource.invoice_id || resource.id,
      };
    }
    if (provider === 'mpesa') {
      const result = payload.Body?.stkCallback || payload;
      const metadata = result.CallbackMetadata?.Item || [];
      return {
        orderId: metadata.find((item: any) => item.Name === 'orderId')?.Value || payload.orderId,
        status: result.ResultCode === 0 || payload.status === 'COMPLETED' ? 'COMPLETED' : 'FAILED',
        transactionId: metadata.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value || result.CheckoutRequestID,
      };
    }
    return payload;
  }
}
