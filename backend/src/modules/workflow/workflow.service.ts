import { prisma } from '../../common/prisma';
import { NotFoundError, AppError } from '../../common/errors';
import { logger } from '../../common/logger';

export class WorkflowService {
  // ── Template CRUD ──

  async createTemplate(data: {
    name: string;
    slug: string;
    description?: string;
    category?: string;
    steps: any[];
    triggers?: string[];
    config?: Record<string, any>;
  }) {
    const existing = await prisma.workflowTemplate.findUnique({ where: { slug: data.slug } });
    if (existing) throw new AppError(409, 'Workflow template with this slug already exists');

    const template = await prisma.workflowTemplate.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        category: data.category || 'automation',
        steps: JSON.stringify(data.steps),
        triggers: JSON.stringify(data.triggers || []),
        config: data.config ? JSON.stringify(data.config) : null,
      },
    });
    return this.sanitizeTemplate(template);
  }

  async updateTemplate(id: string, data: {
    name?: string;
    description?: string;
    steps?: any[];
    triggers?: string[];
    config?: Record<string, any>;
    isEnabled?: boolean;
  }) {
    const existing = await prisma.workflowTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Workflow template not found');

    const updateData: Record<string, any> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.steps !== undefined) updateData.steps = JSON.stringify(data.steps);
    if (data.triggers !== undefined) updateData.triggers = JSON.stringify(data.triggers);
    if (data.config !== undefined) updateData.config = JSON.stringify(data.config);
    if (data.isEnabled !== undefined) updateData.isEnabled = data.isEnabled;

    const updated = await prisma.workflowTemplate.update({ where: { id }, data: updateData });
    return this.sanitizeTemplate(updated);
  }

  async listTemplates(query: { page?: number; limit?: number; category?: string; isEnabled?: string }) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const where: Record<string, any> = {};

    if (query.category) where.category = query.category;
    if (query.isEnabled === 'true') where.isEnabled = true;
    if (query.isEnabled === 'false') where.isEnabled = false;

    const [templates, total] = await Promise.all([
      prisma.workflowTemplate.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.workflowTemplate.count({ where }),
    ]);

    return {
      data: templates.map(t => this.sanitizeTemplate(t)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async deleteTemplate(id: string) {
    const existing = await prisma.workflowTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Workflow template not found');
    await prisma.workflowTemplate.delete({ where: { id } });
    return { success: true, message: 'Workflow template deleted' };
  }

  async toggleTemplate(id: string) {
    const existing = await prisma.workflowTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Workflow template not found');
    const updated = await prisma.workflowTemplate.update({
      where: { id },
      data: { isEnabled: !existing.isEnabled },
    });
    return this.sanitizeTemplate(updated);
  }

  // ── Run Management ──

  async triggerRun(templateSlug: string, input?: Record<string, any>, triggeredBy?: string) {
    const template = await prisma.workflowTemplate.findUnique({ where: { slug: templateSlug } });
    if (!template) throw new NotFoundError('Workflow template not found');
    if (!template.isEnabled) throw new AppError(400, 'Workflow template is disabled');

    const steps: any[] = JSON.parse(template.steps || '[]');
    if (steps.length === 0) throw new AppError(400, 'Workflow template has no steps');

    const run = await prisma.workflowRun.create({
      data: {
        templateId: template.id,
        triggeredBy: triggeredBy || null,
        input: input ? JSON.stringify(input) : null,
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    // Create step runs
    const stepRuns = steps.map((step, index) => ({
      runId: run.id,
      stepIndex: index,
      stepDef: JSON.stringify(step),
      status: index === 0 ? 'RUNNING' : 'PENDING',
    }));

    for (const sr of stepRuns) {
      await prisma.workflowStepRun.create({ data: sr });
    }

    // Execute steps asynchronously (in background)
    this.executeWorkflow(run.id, steps).catch(err => {
      logger.error(`Workflow ${run.id} execution failed`, { error: err.message });
    });

    return {
      id: run.id,
      status: run.status,
      templateSlug,
      totalSteps: steps.length,
    };
  }

  private async executeWorkflow(runId: string, steps: any[]) {
    let currentOutput: any = null;
    let failed = false;

    for (let i = 0; i < steps.length; i++) {
      if (failed) break;

      const step = steps[i];
      const stepRun = await prisma.workflowStepRun.findFirst({
        where: { runId, stepIndex: i },
      });
      if (!stepRun) continue;

      try {
        await prisma.workflowStepRun.update({
          where: { id: stepRun.id },
          data: { status: 'RUNNING', startedAt: new Date(), input: currentOutput ? JSON.stringify(currentOutput) : null },
        });

        // Execute step based on type
        const result = await this.executeStep(step, currentOutput);

        await prisma.workflowStepRun.update({
          where: { id: stepRun.id },
          data: { status: 'COMPLETED', output: JSON.stringify(result), completedAt: new Date() },
        });

        currentOutput = result;

        // Mark next step as ready
        const nextStep = await prisma.workflowStepRun.findFirst({
          where: { runId, stepIndex: i + 1 },
        });
        if (nextStep) {
          await prisma.workflowStepRun.update({
            where: { id: nextStep.id },
            data: { status: 'RUNNING' },
          });
        }
      } catch (error) {
        const errMsg = (error as Error).message;
        const shouldRetry = stepRun.retryCount < stepRun.maxRetries;

        await prisma.workflowStepRun.update({
          where: { id: stepRun.id },
          data: {
            status: shouldRetry ? 'PENDING' : 'FAILED',
            error: errMsg,
            retryCount: { increment: 1 },
          },
        });

        if (!shouldRetry) {
          failed = true;
        } else {
          // Retry after delay
          setTimeout(() => {
            this.retryStep(runId, i).catch(err => {
              logger.error(`Retry failed for step ${i} of run ${runId}`, { error: err.message });
            });
          }, 5000);
        }
      }
    }

    const finalStatus = failed ? 'FAILED' : 'COMPLETED';
    await prisma.workflowRun.update({
      where: { id: runId },
      data: {
        status: finalStatus,
        output: currentOutput ? JSON.stringify(currentOutput) : null,
        completedAt: new Date(),
        error: failed ? 'One or more steps failed' : null,
      },
    });
  }

  private async executeStep(step: any, input: any): Promise<any> {
    const { type, config } = step;

    switch (type) {
      case 'http_request':
        return await this.executeHttpRequest(config, input);
      case 'notification':
        return await this.executeNotification(config, input);
      case 'condition':
        return this.executeCondition(config, input);
      case 'transformation':
        return this.executeTransformation(config, input);
      case 'delay':
        return await this.executeDelay(config);
      case 'log':
        logger.info('Workflow log step', { message: config?.message, input });
        return { logged: true, message: config?.message };
      default:
        throw new Error(`Unknown step type: ${type}`);
    }
  }

  private async executeHttpRequest(config: any, input: any) {
    const { url, method = 'POST', headers = {}, body } = config;
    const resolvedBody = body ? this.resolveTemplate(body, input) : undefined;

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: resolvedBody ? JSON.stringify(resolvedBody) : undefined,
    });

    return { status: response.status, body: await response.json().catch(() => null) };
  }

  private async executeNotification(config: any, input: any) {
    const { userId, type = 'WORKFLOW', title, body } = config;
    await prisma.notification.create({
      data: {
        userId,
        type,
        title: this.resolveTemplateString(title, input),
        body: this.resolveTemplateString(body, input),
      },
    });
    return { notified: true };
  }

  private executeCondition(config: any, input: any): any {
    const { field, operator, value } = config;
    const actualValue = input?.[field];

    let result = false;
    switch (operator) {
      case 'equals': result = actualValue === value; break;
      case 'greater_than': result = Number(actualValue) > Number(value); break;
      case 'less_than': result = Number(actualValue) < Number(value); break;
      case 'contains': result = String(actualValue).includes(String(value)); break;
      case 'exists': result = actualValue !== null && actualValue !== undefined; break;
      default: result = false;
    }

    return { condition: `${field} ${operator} ${value}`, result };
  }

  private executeTransformation(config: any, input: any): any {
    const { mappings } = config;
    if (!mappings) return input;

    const output: Record<string, any> = {};
    for (const [key, value] of Object.entries(mappings)) {
      output[key] = this.resolveTemplateString(value as string, input);
    }
    return output;
  }

  private async executeDelay(config: any) {
    const ms = config?.milliseconds || 1000;
    await new Promise(resolve => setTimeout(resolve, ms));
    return { delayed: ms };
  }

  private resolveTemplate(template: any, input: any): any {
    if (typeof template === 'string') {
      return this.resolveTemplateString(template, input);
    }
    if (Array.isArray(template)) {
      return template.map(item => this.resolveTemplate(item, input));
    }
    if (typeof template === 'object' && template !== null) {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(template)) {
        result[key] = this.resolveTemplate(value, input);
      }
      return result;
    }
    return template;
  }

  private resolveTemplateString(template: string, input: any): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_match, path) => {
      const value = path.split('.').reduce((obj: any, key: string) => obj?.[key], input);
      return value !== undefined ? String(value) : _match;
    });
  }

  // ── Run Queries ──

  async getRun(id: string) {
    const run = await prisma.workflowRun.findUnique({
      where: { id },
      include: {
        template: true,
        steps: { orderBy: { stepIndex: 'asc' } },
      },
    });
    if (!run) throw new NotFoundError('Workflow run not found');
    return {
      ...run,
      input: run.input ? JSON.parse(run.input) : null,
      output: run.output ? JSON.parse(run.output) : null,
      steps: run.steps.map(s => ({
        ...s,
        stepDef: JSON.parse(s.stepDef),
        input: s.input ? JSON.parse(s.input) : null,
        output: s.output ? JSON.parse(s.output) : null,
      })),
    };
  }

  async listRuns(query: { page?: number; limit?: number; status?: string; templateId?: string }) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    const where: Record<string, any> = {};

    if (query.status) where.status = query.status;
    if (query.templateId) where.templateId = query.templateId;

    const [runs, total] = await Promise.all([
      prisma.workflowRun.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { template: true, steps: true },
      }),
      prisma.workflowRun.count({ where }),
    ]);

    return {
      data: runs.map(r => ({
        ...r,
        input: r.input ? JSON.parse(r.input) : null,
        output: r.output ? JSON.parse(r.output) : null,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async retryStep(runId: string, stepIndex: number) {
    const run = await prisma.workflowRun.findUnique({ where: { id: runId } });
    if (!run) throw new NotFoundError('Workflow run not found');

    const stepRun = await prisma.workflowStepRun.findFirst({
      where: { runId, stepIndex },
    });
    if (!stepRun) throw new NotFoundError('Step run not found');

    await prisma.workflowStepRun.update({
      where: { id: stepRun.id },
      data: { status: 'RUNNING', error: null, startedAt: new Date(), retryCount: { increment: 1 } },
    });

    await prisma.workflowRun.update({
      where: { id: runId },
      data: { status: 'RUNNING', error: null },
    });

    // Re-trigger execution from this step
    const template = await prisma.workflowTemplate.findUnique({ where: { id: run.templateId } });
    if (!template) throw new NotFoundError('Workflow template not found');

    const steps: any[] = JSON.parse(template.steps || '[]');
    const remainingSteps = steps.slice(stepIndex);

    this.executeWorkflow(runId, remainingSteps).catch(err => {
      logger.error(`Retry execution failed for run ${runId}`, { error: err.message });
    });

    return { success: true, message: `Retrying step ${stepIndex} of run ${runId}` };
  }

  private sanitizeTemplate(template: any) {
    return {
      id: template.id,
      name: template.name,
      slug: template.slug,
      description: template.description,
      category: template.category,
      steps: JSON.parse(template.steps || '[]'),
      triggers: JSON.parse(template.triggers || '[]'),
      config: template.config ? JSON.parse(template.config) : null,
      isEnabled: template.isEnabled,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }
}