import { prisma } from '../../common/prisma';
import { logger } from '../../common/logger';

export class WebhookEventBus {
  async emit(eventType: string, source: string, payload: Record<string, any>) {
    const event = await prisma.webhookEvent.create({
      data: {
        eventType,
        source,
        payload: JSON.stringify(payload),
        status: 'PENDING',
        attempts: 0,
        maxAttempts: 3,
      },
    });

    logger.info(`Webhook event emitted: ${eventType} from ${source}`, { eventId: event.id });
    return event;
  }

  async findAll(query: { page?: number; limit?: number; status?: string; eventType?: string }) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const where: Record<string, any> = {};

    if (query.status) where.status = query.status;
    if (query.eventType) where.eventType = query.eventType;

    const [events, total] = await Promise.all([
      prisma.webhookEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.webhookEvent.count({ where }),
    ]);

    return {
      data: events.map(e => ({
        ...e,
        payload: JSON.parse(e.payload),
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async processPending(batchSize = 10) {
    const pendingEvents = await prisma.webhookEvent.findMany({
      where: { status: 'PENDING', attempts: { lt: prisma.webhookEvent.fields?.maxAttempts ? undefined : 3 } },
      orderBy: { createdAt: 'asc' },
      take: batchSize,
    });

    const results: { eventId: string; status: string; error?: string }[] = [];

    for (const event of pendingEvents) {
      try {
        await prisma.webhookEvent.update({
          where: { id: event.id },
          data: { status: 'PROCESSING', attempts: { increment: 1 } },
        });

        const enabledPlugins = await prisma.plugin.findMany({
          where: { isEnabled: true },
        });

        let delivered = false;
        for (const plugin of enabledPlugins) {
          const urls: string[] = JSON.parse(plugin.webhookUrls || '[]');
          if (urls.length > 0) {
            for (const url of urls) {
              try {
                const response = await fetch(url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'X-Webhook-Event': event.eventType, 'X-Webhook-Source': event.source },
                  body: event.payload,
                  signal: AbortSignal.timeout(10000),
                });
                if (response.ok) delivered = true;
              } catch (err) {
                logger.warn(`Failed to deliver webhook ${event.id} to ${url}`, { error: (err as Error).message });
              }
            }
          }
        }

        await prisma.webhookEvent.update({
          where: { id: event.id },
          data: {
            status: delivered ? 'DELIVERED' : 'FAILED',
            processedAt: new Date(),
            lastError: delivered ? null : 'No enabled plugin webhooks to deliver to',
          },
        });

        results.push({ eventId: event.id, status: 'DELIVERED' });
      } catch (error) {
        const errMsg = (error as Error).message;
        const maxAttempts = event.maxAttempts;
        const newAttempts = event.attempts + 1;
        const shouldRetry = newAttempts < maxAttempts;

        await prisma.webhookEvent.update({
          where: { id: event.id },
          data: {
            status: shouldRetry ? 'PENDING' : 'FAILED',
            lastError: errMsg,
            processedAt: shouldRetry ? null : new Date(),
          },
        });

        results.push({ eventId: event.id, status: shouldRetry ? 'PENDING' : 'FAILED' });
        logger.error(`Webhook ${event.id} processing failed`, { error: errMsg, retry: shouldRetry });
      }
    }

    return { processed: results.length, results };
  }

  async getStats() {
    const [total, pending, processing, delivered, failed] = await Promise.all([
      prisma.webhookEvent.count(),
      prisma.webhookEvent.count({ where: { status: 'PENDING' } }),
      prisma.webhookEvent.count({ where: { status: 'PROCESSING' } }),
      prisma.webhookEvent.count({ where: { status: 'DELIVERED' } }),
      prisma.webhookEvent.count({ where: { status: 'FAILED' } }),
    ]);

    return { total, pending, processing, delivered, failed };
  }
}