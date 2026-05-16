import { prisma } from '../../common/prisma';
import { logger } from '../../common/logger';

/**
 * Scheduled automation worker that runs marketplace tasks on a queue-backed engine.
 * Designed to be called periodically via cron or setInterval.
 */
export class AutomationWorker {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  start(intervalMs = 60000) {
    if (this.intervalId) return;
    logger.info(`AutomationWorker started with interval ${intervalMs}ms`);
    this.intervalId = setInterval(() => this.processQueue(), intervalMs);
    // Run immediately on start
    this.processQueue();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('AutomationWorker stopped');
    }
  }

  async processQueue() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      // Step 1: Process pending workflow runs triggered by events
      await this.processPendingWorkflows();

      // Step 2: Run scheduled marketplace automations
      await this.runMarketplaceTasks();

      // Step 3: Process pending webhook events
      await this.processWebhookQueue();

      // Step 4: Clean up stale records
      await this.cleanupStaleRecords();
    } catch (error) {
      logger.error('AutomationWorker queue processing failed', { error: (error as Error).message });
    } finally {
      this.isRunning = false;
    }
  }

private async processPendingWorkflows() {
     const pendingRuns = await prisma.workflowRun.findMany({
       where: { status: 'PENDING' },
       take: 10,
       include: { template: true },
     });

     for (const run of pendingRuns) {
       try {
         await prisma.workflowRun.update({
           where: { id: run.id },
           data: { status: 'RUNNING', startedAt: new Date() },
         });

         // Execute workflow steps
         const steps = run.template?.steps ? JSON.parse(run.template.steps as string) : [];
         let runOutput: any = null;
         let runError: string | null = null;
         let runStatus = 'COMPLETED';

         for (let i = 0; i < steps.length; i++) {
           const stepRun = await prisma.workflowStepRun.findFirst({
             where: { runId: run.id, stepIndex: i },
           });

           if (!stepRun) continue;

           try {
             // Execute the step based on its type
             const stepResult = await this.executeStep(steps[i], run.input ? JSON.parse(run.input) : {});
             await prisma.workflowStepRun.update({
               where: { id: stepRun.id },
               data: { status: 'COMPLETED', output: JSON.stringify(stepResult) },
             });
             runOutput = stepResult;
           } catch (stepError: any) {
             await prisma.workflowStepRun.update({
               where: { id: stepRun.id },
               data: { status: 'FAILED', error: stepError.message },
             });
             runError = stepError.message;
             runStatus = 'FAILED';
             break;
           }
         }

         await prisma.workflowRun.update({
           where: { id: run.id },
           data: {
             status: runStatus,
             output: runOutput ? JSON.stringify(runOutput) : null,
             error: runError,
             completedAt: new Date(),
           },
         });

         logger.info(`Workflow run ${run.id} completed with status ${runStatus}`);
       } catch (error) {
         logger.error(`Failed to process workflow run ${run.id}`, { error: (error as Error).message });
         await prisma.workflowRun.update({
           where: { id: run.id },
           data: { status: 'FAILED', error: (error as Error).message },
         });
       }
     }
   }

   private async executeStep(stepDef: any, inputData: any): Promise<any> {
     // Support different step types
     switch (stepDef.type) {
       case 'notification':
         return this.executeNotificationStep(stepDef, inputData);
       case 'webhook':
         return this.executeWebhookStep(stepDef, inputData);
       case 'delay':
         return this.executeDelayStep(stepDef);
       case 'condition':
         return this.executeConditionStep(stepDef, inputData);
       default:
         // Default: treat as a no-op passthrough
         return { input: inputData, stepType: stepDef.type || 'unknown' };
     }
   }

   private async executeNotificationStep(stepDef: any, inputData: any) {
     // Notification step: sends a notification
     const userId = stepDef.userId || inputData.userId;
     const title = stepDef.title || 'Notification';
     const body = stepDef.body || '';
     const type = stepDef.type || 'INFO';
     
     const notification = await prisma.notification.create({
       data: { userId, type, title, body },
     });
     return { sent: true, userId, title, notificationId: notification.id };
   }

   private async executeWebhookStep(stepDef: any, inputData: any) {
     // Webhook step: calls an external URL
     if (!stepDef.url) return { error: 'No webhook URL configured' };
     const response = await fetch(stepDef.url, {
       method: stepDef.method || 'POST',
       headers: { 'Content-Type': 'application/json', ...(stepDef.headers || {}) },
       body: JSON.stringify(inputData),
       signal: AbortSignal.timeout(stepDef.timeout || 10000),
     });
     const text = await response.text();
     return { status: response.status, body: text };
   }

   private async executeDelayStep(stepDef: any) {
     const ms = stepDef.milliseconds || 1000;
     await new Promise(resolve => setTimeout(resolve, ms));
     return { delayed: true, milliseconds: ms };
   }

   private async executeConditionStep(stepDef: any, inputData: any) {
     // Simple condition evaluator
     const { field, operator, value, trueStep, falseStep } = stepDef;
      const fieldValue = field.split('.').reduce((obj: any, key: string) => obj?.[key], inputData);
     let result = false;
     switch (operator) {
       case 'equals': result = fieldValue == value; break;
       case 'not_equals': result = fieldValue != value; break;
       case 'greater_than': result = Number(fieldValue) > Number(value); break;
       case 'less_than': result = Number(fieldValue) < Number(value); break;
       case 'contains': result = String(fieldValue).includes(String(value)); break;
       case 'exists': result = fieldValue !== undefined && fieldValue !== null; break;
     }
     return { condition: result, matchedStep: result ? trueStep : falseStep };
   }

  private async runMarketplaceTasks() {
    const now = Date.now();
    const abandonedSince = new Date(now - 24 * 60 * 60 * 1000); // 24 hours
    const staleOrderSince = new Date(now - 48 * 60 * 60 * 1000); // 48 hours
    const oldUnpaidSince = new Date(now - 72 * 60 * 60 * 1000); // 72 hours

    // Abandoned cart notifications
    const abandonedCarts = await prisma.cart.findMany({
      where: {
        updatedAt: { lte: abandonedSince },
        items: { some: {} },
      },
      include: { user: true, items: { take: 3, include: { product: { select: { title: true } } } } },
      take: 50,
    });

    if (abandonedCarts.length > 0) {
      await prisma.notification.createMany({
        data: abandonedCarts.map(cart => ({
          userId: cart.userId,
          type: 'ABANDONED_CART',
          title: 'Your cart is waiting!',
          body: `You left ${cart.items.length} item(s) in your cart. Complete your purchase now.`,
          data: JSON.stringify({ cartId: cart.id, itemCount: cart.items.length }),
        })),
      });
    }

    // Stale order reminders for sellers
    const staleOrders = await prisma.order.findMany({
      where: {
        createdAt: { lte: staleOrderSince },
        status: { in: ['PAYMENT_CONFIRMED', 'PROCESSING', 'READY_TO_SHIP'] },
      },
      include: { seller: true },
      take: 50,
    });

    if (staleOrders.length > 0) {
      await prisma.notification.createMany({
        data: staleOrders.map(order => ({
          userId: order.seller.userId,
          type: 'SELLER_SLA_REMINDER',
          title: `Order ${order.orderNumber} needs attention`,
          body: `This order has been ${order.status} for over 48 hours. Please update the status.`,
          data: JSON.stringify({ orderId: order.id, status: order.status }),
        })),
      });
    }

    // Auto-cancel unpaid orders older than 72 hours
    const oldUnpaidOrders = await prisma.order.findMany({
      where: {
        paymentStatus: 'PENDING',
        createdAt: { lte: oldUnpaidSince },
        status: 'PENDING_PAYMENT',
      },
      take: 50,
    });

    if (oldUnpaidOrders.length > 0) {
      await prisma.order.updateMany({
        where: { id: { in: oldUnpaidOrders.map(o => o.id) } },
        data: { status: 'CANCELLED', paymentStatus: 'FAILED' },
      });

      await prisma.notification.createMany({
        data: oldUnpaidOrders.map(order => ({
          userId: order.userId,
          type: 'ORDER_CANCELLED',
          title: `Order ${order.orderNumber} cancelled`,
          body: 'Your order was cancelled due to non-payment within 72 hours.',
          data: JSON.stringify({ orderId: order.id }),
        })),
      });
    }

    // Risk assessments for pending payments
    const pendingPayments = await prisma.payment.findMany({
      where: { status: 'PENDING', createdAt: { lte: new Date(now - 24 * 60 * 60 * 1000) } },
      include: { order: true },
      take: 50,
    });

    for (const payment of pendingPayments) {
      const score = Math.min(100, 20 + (payment.amount > 1000000 ? 30 : 0));
      await prisma.riskAssessment.upsert({
        where: { id: `risk-${payment.id}` },
        create: {
          entity: 'PAYMENT',
          entityId: payment.id,
          score,
          level: score >= 60 ? 'HIGH' : score >= 35 ? 'MEDIUM' : 'LOW',
          reasons: JSON.stringify(['Payment pending for over 24 hours', ...(payment.amount > 1000000 ? ['High value'] : [])]),
        },
        update: { score, level: score >= 60 ? 'HIGH' : score >= 35 ? 'MEDIUM' : 'LOW' },
      });
    }

    if (abandonedCarts.length > 0 || staleOrders.length > 0 || oldUnpaidOrders.length > 0 || pendingPayments.length > 0) {
      logger.info('Marketplace tasks completed', {
        abandonedCarts: abandonedCarts.length,
        staleOrderReminders: staleOrders.length,
        autoCancelled: oldUnpaidOrders.length,
        riskAssessments: pendingPayments.length,
      });
    }
  }

  private async processWebhookQueue() {
    const pendingEvents = await prisma.webhookEvent.findMany({
      where: { status: 'PENDING', attempts: { lt: 3 } },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    for (const event of pendingEvents) {
      try {
        const enabledPlugins = await prisma.plugin.findMany({
          where: { isEnabled: true },
        });

        let delivered = false;
        for (const plugin of enabledPlugins) {
          const urls: string[] = JSON.parse(plugin.webhookUrls || '[]');
          for (const url of urls) {
            try {
              const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Webhook-Event': event.eventType, 'X-Webhook-Source': event.source },
                body: event.payload,
                signal: AbortSignal.timeout(10000),
              });
              if (response.ok) delivered = true;
            } catch {
              // Individual webhook failure is non-fatal
            }
          }
        }

        await prisma.webhookEvent.update({
          where: { id: event.id },
          data: {
            status: delivered ? 'DELIVERED' : 'FAILED',
            processedAt: new Date(),
            attempts: { increment: 1 },
            lastError: delivered ? null : 'Delivery failed',
          },
        });
      } catch (error) {
        await prisma.webhookEvent.update({
          where: { id: event.id },
          data: {
            attempts: { increment: 1 },
            lastError: (error as Error).message,
            status: event.attempts + 1 >= 3 ? 'FAILED' : 'PENDING',
          },
        });
      }
    }
  }

  private async cleanupStaleRecords() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Delete old completed webhook events
    const deletedWebhooks = await prisma.webhookEvent.deleteMany({
      where: {
        status: 'DELIVERED',
        createdAt: { lte: thirtyDaysAgo },
      },
    });

    // Archive old completed workflow runs
    const archivedRuns = await prisma.workflowRun.updateMany({
      where: {
        status: { in: ['COMPLETED', 'FAILED', 'CANCELLED'] },
        createdAt: { lte: thirtyDaysAgo },
      },
      data: { status: 'CANCELLED' },
    });

    if (deletedWebhooks.count > 0 || archivedRuns.count > 0) {
      logger.info('Cleanup completed', {
        deletedWebhooks: deletedWebhooks.count,
        archivedRuns: archivedRuns.count,
      });
    }
  }
}

// Singleton instance
export const automationWorker = new AutomationWorker();