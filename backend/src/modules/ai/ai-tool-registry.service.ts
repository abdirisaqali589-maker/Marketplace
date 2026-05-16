import { prisma } from '../../common/prisma';
import { AppError, NotFoundError } from '../../common/errors';
import { logger } from '../../common/logger';

export interface ToolDefinition {
  name: string;
  description: string;
  category?: string;
  jsonSchema?: Record<string, any>;
  enabled?: boolean;
  roles?: string[];
  scopes?: string[];
  riskLevel?: string;
  requiresConfirmation?: boolean;
  handlerType?: string;
  handlerRef?: string;
  config?: Record<string, any>;
  rateLimit?: Record<string, number>;
  auditLevel?: string;
}

export interface ToolCallRequest {
  name: string;
  arguments: Record<string, any>;
  userId: string;
  userRole: string;
}

export interface ToolCallResult {
  success: boolean;
  result: any;
  error?: string;
  requiresApproval?: boolean;
  auditLogId?: string;
}

export class AiToolRegistry {
  // ── CRUD Operations ──

  async createTool(data: ToolDefinition): Promise<any> {
    const existing = await prisma.aiTool.findUnique({ where: { name: data.name } });
    if (existing) throw new AppError(409, `Tool "${data.name}" already exists`);

    const tool = await prisma.aiTool.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category || 'builtin',
        jsonSchema: data.jsonSchema ? JSON.stringify(data.jsonSchema) : null,
        enabled: data.enabled ?? true,
        roles: data.roles ? JSON.stringify(data.roles) : null,
        scopes: data.scopes ? JSON.stringify(data.scopes) : null,
        riskLevel: data.riskLevel || 'low',
        requiresConfirmation: data.requiresConfirmation ?? false,
        handlerType: data.handlerType || 'builtin',
        handlerRef: data.handlerRef || null,
        config: data.config ? JSON.stringify(data.config) : null,
        rateLimit: data.rateLimit ? JSON.stringify(data.rateLimit) : null,
        auditLevel: data.auditLevel || 'standard',
      },
    });

    return this.sanitize(tool);
  }

  async getToolById(id: string): Promise<any> {
    const tool = await prisma.aiTool.findUnique({ where: { id } });
    if (!tool) throw new NotFoundError('AI tool not found');
    return this.sanitize(tool);
  }

  async getToolByName(name: string): Promise<any> {
    const tool = await prisma.aiTool.findUnique({ where: { name } });
    if (!tool) throw new NotFoundError(`AI tool "${name}" not found`);
    return this.sanitize(tool);
  }

  async updateTool(id: string, data: Partial<ToolDefinition>): Promise<any> {
    const existing = await prisma.aiTool.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('AI tool not found');

    const updateData: Record<string, any> = {};
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.jsonSchema !== undefined) updateData.jsonSchema = JSON.stringify(data.jsonSchema);
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.roles !== undefined) updateData.roles = JSON.stringify(data.roles);
    if (data.scopes !== undefined) updateData.scopes = JSON.stringify(data.scopes);
    if (data.riskLevel !== undefined) updateData.riskLevel = data.riskLevel;
    if (data.requiresConfirmation !== undefined) updateData.requiresConfirmation = data.requiresConfirmation;
    if (data.handlerType !== undefined) updateData.handlerType = data.handlerType;
    if (data.handlerRef !== undefined) updateData.handlerRef = data.handlerRef;
    if (data.config !== undefined) updateData.config = JSON.stringify(data.config);
    if (data.rateLimit !== undefined) updateData.rateLimit = JSON.stringify(data.rateLimit);
    if (data.auditLevel !== undefined) updateData.auditLevel = data.auditLevel;

    const updated = await prisma.aiTool.update({ where: { id }, data: updateData });
    return this.sanitize(updated);
  }

  async deleteTool(id: string): Promise<any> {
    const tool = await prisma.aiTool.findUnique({ where: { id } });
    if (!tool) throw new NotFoundError('AI tool not found');
    if (tool.category === 'builtin') {
      throw new AppError(400, 'Cannot delete built-in tools. Disable them instead.');
    }
    await prisma.aiTool.delete({ where: { id } });
    return { success: true, message: 'Tool deleted' };
  }

  async listTools(query: {
    category?: string;
    enabled?: boolean;
    role?: string;
    riskLevel?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {};
    if (query.category) where.category = query.category;
    if (query.enabled !== undefined) where.enabled = query.enabled;
    if (query.riskLevel) where.riskLevel = query.riskLevel;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // If a role is specified, prefer explicit permission rows. Fall back to the
    // role list stored on the tool for older seeded data.
    if (query.role) {
      const tools = await prisma.aiTool.findMany({
        where,
        include: { permissions: true },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      });

      const filtered = tools.filter(t => {
        const permission = t.permissions.find(p => p.role === query.role);
        if (permission) return permission.canExecute;

        const defaultPermission = t.permissions.find(p => p.role === 'DEFAULT');
        if (defaultPermission && !t.roles) return defaultPermission.canExecute;

        if (!t.roles) return true;
        const roles = JSON.parse(t.roles as string);
        return roles.includes(query.role!);
      });

      return {
        data: filtered.map(t => this.sanitize(t)),
        pagination: { page, limit, total: filtered.length, totalPages: Math.ceil(filtered.length / limit) },
      };
    }

    const [tools, total] = await Promise.all([
      prisma.aiTool.findMany({ where, orderBy: { name: 'asc' }, skip, take: limit }),
      prisma.aiTool.count({ where }),
    ]);

    return {
      data: tools.map(t => this.sanitize(t)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Permission Management ──

  async setToolPermission(toolId: string, role: string, permissions: { canExecute?: boolean; canApprove?: boolean }): Promise<any> {
    const tool = await prisma.aiTool.findUnique({ where: { id: toolId } });
    if (!tool) throw new NotFoundError('AI tool not found');

    const existing = await prisma.aiToolPermission.findFirst({ where: { toolId, role } });

    if (existing) {
      const updated = await prisma.aiToolPermission.update({
        where: { id: existing.id },
        data: {
          canExecute: permissions.canExecute ?? existing.canExecute,
          canApprove: permissions.canApprove ?? existing.canApprove,
        },
      });
      return updated;
    }

    const created = await prisma.aiToolPermission.create({
      data: {
        toolId,
        role,
        canExecute: permissions.canExecute ?? true,
        canApprove: permissions.canApprove ?? false,
      },
    });
    return created;
  }

  async getToolPermissions(toolId: string): Promise<any[]> {
    const permissions = await prisma.aiToolPermission.findMany({ where: { toolId } });
    return permissions;
  }

  // ── Tool Execution (Secure Runner) ──

  async executeTool(request: ToolCallRequest): Promise<ToolCallResult> {
    const { name, arguments: args, userId, userRole } = request;

    // 1. Load tool by name
    const tool = await prisma.aiTool.findUnique({
      where: { name },
      include: { permissions: true },
    });

    if (!tool) {
      await this.auditLog({ toolName: name, userId, userRole, status: 'error', arguments: args, error: 'Tool not found' });
      throw new NotFoundError(`Tool "${name}" not found`);
    }

    // 2. Check enabled status
    if (!tool.enabled) {
      await this.auditLog({ toolName: name, userId, userRole, status: 'denied', arguments: args, error: 'Tool is disabled' });
      throw new AppError(403, `Tool "${name}" is currently disabled`);
    }

    // 3. Check user role permission
    const rolePermission = tool.permissions.find(p => p.role === userRole);
    const defaultPermission = tool.permissions.find(p => p.role === 'DEFAULT');

    const canExecute = rolePermission?.canExecute ?? defaultPermission?.canExecute ?? true;

    if (!canExecute) {
      await this.auditLog({
        toolName: name, userId, userRole, status: 'denied',
        arguments: args, error: `Role "${userRole}" is not allowed to execute this tool`,
      });
      throw new AppError(403, `Your role (${userRole}) does not have permission to use "${name}"`);
    }

    // 4. Validate args against JSON Schema if present
    if (tool.jsonSchema) {
      const validationError = this.validateArgs(args, tool.jsonSchema);
      if (validationError) {
        await this.auditLog({
          toolName: name, userId, userRole, status: 'error',
          arguments: args, error: `Validation failed: ${validationError}`,
        });
        throw new AppError(400, `Invalid arguments: ${validationError}`);
      }
    }

    // 5. Risk check — require confirmation for high/critical risk tools
    if (tool.requiresConfirmation && ['high', 'critical'].includes(tool.riskLevel)) {
      await this.auditLog({
        toolName: name, userId, userRole, status: 'pending',
        arguments: args, riskLevel: tool.riskLevel,
      });
      const auditId = await this.getLatestAuditId();
      return { success: false, result: null, requiresApproval: true, auditLogId: auditId };
    }

    // 6. Check rate limits
    if (tool.rateLimit) {
      const rateOk = await this.checkRateLimit(tool.id, userId, typeof tool.rateLimit === 'string' ? {} : tool.rateLimit || {});
      if (!rateOk) {
        throw new AppError(429, `Rate limit exceeded for tool "${name}"`);
      }
    }

    // 7. Execute based on handler type
    let result: any;
    try {
      switch (tool.handlerType) {
        case 'builtin':
          result = await this.executeBuiltin(tool, args, userId);
          break;
        case 'plugin':
          result = await this.executePlugin(tool, args, userId);
          break;
        case 'workflow':
          result = await this.executeWorkflow(tool, args, userId);
          break;
        case 'webhook':
          result = await this.executeWebhook(tool, args, userId);
          break;
        default:
          throw new AppError(500, `Unknown handler type: ${tool.handlerType}`);
      }

      await this.auditLog({
        toolName: name, userId, userRole, toolId: tool.id,
        status: 'executed', arguments: args, result: result, riskLevel: tool.riskLevel,
      });

      const auditId2 = await this.getLatestAuditId();
      return { success: true, result, auditLogId: auditId2 };
    } catch (error: any) {
      await this.auditLog({
        toolName: name, userId, userRole, toolId: tool.id,
        status: 'error', arguments: args, error: error.message,
      });
      logger.error('Tool execution failed', { tool: name, error: error.message, userId });
      return { success: false, result: null, error: error.message };
    }
  }

  async approveToolCall(auditLogId: string, approvedBy: string): Promise<any> {
    const auditLog = await prisma.aiToolAuditLog.findUnique({ where: { id: auditLogId } });
    if (!auditLog) throw new NotFoundError('Audit log not found');
    if (auditLog.status !== 'pending') throw new AppError(400, 'Tool call is not pending approval');

    const args = auditLog.arguments ? JSON.parse(auditLog.arguments) : {};

    // Verify approver has canApprove permission
    const tool = await prisma.aiTool.findUnique({
      where: { name: auditLog.toolName },
      include: { permissions: true },
    });
    if (!tool) throw new NotFoundError('Tool not found');
    const approverPerm = tool.permissions.find(p => p.role === 'ADMIN' || p.role === 'SUPER_ADMIN');
    if (!approverPerm?.canApprove) {
      throw new AppError(403, 'Approver does not have approval permissions');
    }

    // Execute the handler directly (bypass approval check since already approved)
    let result: any;
    try {
      const handler = this.builtinHandlers.get(tool.name);
      if (!handler) throw new AppError(500, `No handler registered for tool "${tool.name}"`);
      result = await handler(args, auditLog.userId!);

      await prisma.aiToolAuditLog.update({
        where: { id: auditLogId },
        data: { approvedBy, status: 'executed', result: JSON.stringify(result) },
      });

      return { success: true, result };
    } catch (error: any) {
      await prisma.aiToolAuditLog.update({
        where: { id: auditLogId },
        data: { approvedBy, status: 'error', result: JSON.stringify({ error: error.message }) },
      });
      logger.error('Approved tool execution failed', { tool: tool.name, error: error.message });
      return { success: false, result: null, error: error.message };
    }
  }

  // ── Built-in Handler Registry ──

  private builtinHandlers: Map<string, (args: any, userId: string) => Promise<any>> = new Map();

  registerBuiltinHandler(name: string, handler: (args: any, userId: string) => Promise<any>) {
    this.builtinHandlers.set(name, handler);
  }

  registerBuiltinHandlers(handlers: Map<string, (args: any, userId: string) => Promise<any>>) {
    handlers.forEach((handler, name) => this.builtinHandlers.set(name, handler));
  }

  private async executeBuiltin(tool: any, args: any, userId: string): Promise<any> {
    const handler = this.builtinHandlers.get(tool.name);
    if (!handler) throw new AppError(500, `No handler registered for built-in tool "${tool.name}"`);
    return handler(args, userId);
  }

  private async executePlugin(tool: any, args: any, userId: string): Promise<any> {
    if (!tool.handlerRef) throw new AppError(500, 'Plugin handler reference not configured');
    // Load plugin by slug
    const plugin = await prisma.plugin.findUnique({ where: { slug: tool.handlerRef } });
    if (!plugin || !plugin.isEnabled) throw new AppError(500, `Plugin "${tool.handlerRef}" not found or disabled`);

    // Execute via webhook if configured
    if (plugin.webhookUrls && plugin.webhookUrls.length > 0) {
      return this.executeWebhookUrl(plugin.webhookUrls[0], { tool: tool.name, args, userId });
    }

    throw new AppError(500, `Plugin "${tool.handlerRef}" has no executable handler`);
  }

  private async executeWorkflow(tool: any, args: any, userId: string): Promise<any> {
    if (!tool.handlerRef) throw new AppError(500, 'Workflow handler reference not configured');
    // Trigger workflow by slug
    const workflow = await prisma.workflowTemplate.findUnique({ where: { slug: tool.handlerRef } });
    if (!workflow || !workflow.isEnabled) throw new AppError(500, `Workflow "${tool.handlerRef}" not found or disabled`);

    // Create a workflow run
    const run = await prisma.workflowRun.create({
      data: {
        templateId: workflow.id,
        triggeredBy: `ai-tool:${userId}`,
        input: JSON.stringify({ toolArgs: args, triggeredBy: userId }),
        status: 'PENDING',
      },
    });

    // Note: actual workflow execution happens asynchronously via the automation worker
    return { workflowRunId: run.id, status: 'queued', message: 'Workflow execution queued' };
  }

  private async executeWebhook(tool: any, args: any, userId: string): Promise<any> {
    if (!tool.handlerRef) throw new AppError(500, 'Webhook URL not configured');
    return this.executeWebhookUrl(tool.handlerRef, { tool: tool.name, args, userId });
  }

  private async executeWebhookUrl(url: string, body: any): Promise<any> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': process.env.WEBHOOK_SECRET || '',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new AppError(response.status, `Webhook error: ${errorText}`);
      }

      return await response.json();
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(502, `Webhook call failed: ${error.message}`);
    }
  }

  // ── Validation ──

  private validateArgs(args: any, schema: any): string | null {
    try {
      // Basic JSON Schema validation without external deps
      const parsedSchema = typeof schema === 'string' ? JSON.parse(schema) : schema;

      if (parsedSchema.type === 'object' && parsedSchema.properties) {
        const required = parsedSchema.required || [];
        for (const req of required) {
          if (args[req] === undefined || args[req] === null || args[req] === '') {
            return `Missing required parameter: ${req}`;
          }
        }

        for (const [key, value] of Object.entries(args)) {
          const propSchema = parsedSchema.properties[key];
          if (propSchema) {
            if (propSchema.type === 'string' && typeof value !== 'string') {
              return `Parameter "${key}" must be a string`;
            }
            if (propSchema.type === 'number' && typeof value !== 'number') {
              return `Parameter "${key}" must be a number`;
            }
            if (propSchema.type === 'boolean' && typeof value !== 'boolean') {
              return `Parameter "${key}" must be a boolean`;
            }
            if (propSchema.type === 'array' && !Array.isArray(value)) {
              return `Parameter "${key}" must be an array`;
            }
            if (propSchema.enum && !propSchema.enum.includes(value)) {
              return `Parameter "${key}" must be one of: ${propSchema.enum.join(', ')}`;
            }
          }
        }
      }

      return null;
    } catch {
      return 'Invalid schema format';
    }
  }

  // ── Rate Limiting ──

  private async checkRateLimit(toolId: string, userId: string, limits: Record<string, number>): Promise<boolean> {
    const now = new Date();
    const minuteAgo = new Date(now.getTime() - 60000);
    const hourAgo = new Date(now.getTime() - 3600000);

    if (limits.perMinute) {
      const recentMinute = await prisma.aiToolAuditLog.count({
        where: { toolId, userId, createdAt: { gte: minuteAgo } },
      });
      if (recentMinute >= limits.perMinute) return false;
    }

    if (limits.perHour) {
      const recentHour = await prisma.aiToolAuditLog.count({
        where: { toolId, userId, createdAt: { gte: hourAgo } },
      });
      if (recentHour >= limits.perHour) return false;
    }

    return true;
  }

  // ── Audit Logging ──

  private async auditLog(data: {
    toolName: string;
    userId?: string;
    userRole?: string;
    toolId?: string;
    arguments?: Record<string, any>;
    result?: any;
    error?: string;
    status: string;
    riskLevel?: string;
  }): Promise<string> {
    const entry = await prisma.aiToolAuditLog.create({
      data: {
        toolName: data.toolName,
        userId: data.userId,
        userRole: data.userRole,
        toolId: data.toolId,
        arguments: data.arguments ? JSON.stringify(data.arguments) : null,
        result: data.result ? JSON.stringify(data.result) : (data.error ? JSON.stringify({ error: data.error }) : null),
        status: data.status,
        riskLevel: data.riskLevel || 'low',
        ipAddress: '',
      },
    });
    return entry.id;
  }

  private async getLatestAuditId(): Promise<string | undefined> {
    try {
      const lastLog = await prisma.aiToolAuditLog.findFirst({ orderBy: { createdAt: 'desc' } });
      return lastLog?.id;
    } catch {
      return undefined;
    }
  }

  // ── Sanitization ──

  private sanitize(tool: any) {
    return {
      id: tool.id,
      name: tool.name,
      description: tool.description,
      category: tool.category,
      jsonSchema: tool.jsonSchema ? JSON.parse(tool.jsonSchema) : null,
      enabled: tool.enabled,
      roles: tool.roles ? JSON.parse(tool.roles) : null,
      scopes: tool.scopes ? JSON.parse(tool.scopes) : null,
      riskLevel: tool.riskLevel,
      requiresConfirmation: tool.requiresConfirmation,
      handlerType: tool.handlerType,
      handlerRef: tool.handlerRef,
      config: tool.config ? JSON.parse(tool.config) : null,
      rateLimit: tool.rateLimit ? JSON.parse(tool.rateLimit) : null,
      auditLevel: tool.auditLevel,
      createdAt: tool.createdAt,
      updatedAt: tool.updatedAt,
    };
  }
}

export const aiToolRegistry = new AiToolRegistry();
