import { prisma } from '../../common/prisma';
import { AppError, NotFoundError } from '../../common/errors';
import { logger } from '../../common/logger';
import { AiToolRegistry } from '../ai/ai-tool-registry.service';

/**
 * WorkflowToolService
 *
 * Allows AI workflows to be invoked as tools. When the AI calls a workflow-as-tool,
 * this service creates a workflow run and returns the result (or queues async execution).
 */

export class WorkflowToolService {
  private registry: AiToolRegistry;

  constructor(registry: AiToolRegistry) {
    this.registry = registry;
  }

  /**
   * List all workflow templates available as tools.
   */
  async listWorkflowTools(): Promise<any[]> {
    const templates = await prisma.workflowTemplate.findMany({
      where: { isEnabled: true },
      orderBy: { name: 'asc' },
    });

    return templates.map(t => ({
      name: `workflow:${t.slug}`,
      description: `[Workflow] ${t.description || t.name}`,
      category: 'workflow',
      handlerType: 'workflow',
      handlerRef: t.slug,
      jsonSchema: this.getWorkflowInputSchema(t),
      roles: ['CUSTOMER', 'SELLER', 'ADMIN', 'SUPER_ADMIN'],
      riskLevel: 'medium',
      requiresConfirmation: false,
      enabled: true,
    }));
  }

  /**
   * Execute a workflow by slug as a tool call.
   */
  async executeWorkflowTool(slug: string, args: Record<string, any>, userId: string): Promise<any> {
    const template = await prisma.workflowTemplate.findUnique({
      where: { slug, isEnabled: true },
    });

    if (!template) {
      throw new NotFoundError(`Workflow "${slug}" not found or disabled`);
    }

    // Validate required inputs from workflow trigger config
    const triggers = template.triggers ? JSON.parse(template.triggers as string) : [];
    const steps = template.steps ? JSON.parse(template.steps as string) : [];

    // Create workflow run
    const run = await prisma.workflowRun.create({
      data: {
        templateId: template.id,
        triggeredBy: `ai-tool:${userId}`,
        input: JSON.stringify(args),
        status: 'PENDING',
      },
    });

    // Create step runs for each step (they'll be picked up by the automation worker)
    for (let i = 0; i < steps.length; i++) {
      await prisma.workflowStepRun.create({
        data: {
          runId: run.id,
          stepIndex: i,
          stepDef: JSON.stringify(steps[i]),
          status: 'PENDING',
        },
      });
    }

    logger.info('Workflow tool execution started', { workflowSlug: slug, runId: run.id, userId });

    return {
      workflowRunId: run.id,
      workflowName: template.name,
      status: 'queued',
      message: `Workflow "${template.name}" execution started. Run ID: ${run.id}`,
    };
  }

  /**
   * Generate a JSON Schema from workflow input/triggers for AI tool discovery.
   */
  private getWorkflowInputSchema(template: any): Record<string, any> {
    const triggers = template.triggers ? JSON.parse(template.triggers as string) : [];
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const trigger of triggers) {
      if (trigger.event && trigger.params) {
        for (const [key, config] of Object.entries(trigger.params)) {
          properties[key] = {
            type: (config as any).type || 'string',
            description: (config as any).description || key,
          };
          if ((config as any).required) required.push(key);
        }
      }
    }

    // If no triggers defined, provide a generic input schema
    if (Object.keys(properties).length === 0) {
      properties.input = {
        type: 'object',
        description: 'Input data for the workflow',
      };
    }

    return {
      type: 'object',
      properties,
      ...(required.length > 0 && { required }),
    };
  }

  /**
   * Get the result of a workflow run (for synchronous workflows).
   */
  async getWorkflowResult(runId: string): Promise<any> {
    const run = await prisma.workflowRun.findUnique({
      where: { id: runId },
      include: { steps: { orderBy: { stepIndex: 'asc' } } },
    });

    if (!run) throw new NotFoundError('Workflow run not found');

    return {
      id: run.id,
      status: run.status,
      output: run.output ? JSON.parse(run.output) : null,
      error: run.error,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      steps: run.steps.map((s: any) => ({
        stepIndex: s.stepIndex,
        status: s.status,
        output: s.output ? JSON.parse(s.output) : null,
        error: s.error,
      })),
    };
  }

  /**
   * Synchronous workflow execution with polling for result.
   * Only suitable for short workflows with timeout.
   */
  async executeWorkflowSync(slug: string, args: Record<string, any>, userId: string, timeoutMs: number = 30000): Promise<any> {
    const run = await this.executeWorkflowTool(slug, args, userId);

    if (!run.workflowRunId) return run;

    // Poll for completion
    const startTime = Date.now();
    const pollInterval = 1000;

    while (Date.now() - startTime < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      const result = await this.getWorkflowResult(run.workflowRunId);

      if (result.status === 'COMPLETED') {
        return { ...run, status: 'completed', output: result.output };
      }
      if (result.status === 'FAILED') {
        return { ...run, status: 'failed', error: result.error };
      }
    }

    return { ...run, status: 'timeout', message: `Workflow timed out after ${timeoutMs}ms` };
  }
}