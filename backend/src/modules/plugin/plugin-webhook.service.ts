import { prisma } from '../../common/prisma';
import { AppError } from '../../common/errors';
import { logger } from '../../common/logger';

/**
 * PluginWebhookService
 *
 * Dispatches tool calls to plugin webhooks and handles responses.
 * Each plugin can register webhook URLs capable of handling tool requests.
 */

interface WebhookPayload {
  toolName: string;
  arguments: Record<string, any>;
  userId: string;
  userRole: string;
  conversationId?: string;
  requestId: string;
  timestamp: string;
  signature: string;
}

interface WebhookResponse {
  success: boolean;
  result?: any;
  error?: string;
}

export class PluginWebhookService {
  /**
   * Execute a tool via a plugin's registered webhook URL.
   */
  async executeWebhookTool(toolName: string, args: Record<string, any>, userId: string, userRole: string): Promise<WebhookResponse> {
    // Find plugins that have webhook URLs and are enabled
    const plugins = await prisma.plugin.findMany({
      where: {
        isEnabled: true,
        webhookUrls: { not: '[]' },
      },
    });

    // Check if any plugin manifest declares this tool
    for (const plugin of plugins) {
      const manifest = plugin.manifest as any;
      const aiTools = manifest?.aiTools || [];
      const toolDef = aiTools.find((t: any) => t.name === toolName);

      if (toolDef && plugin.webhookUrls) {
        const urls: string[] = JSON.parse(plugin.webhookUrls as string);

        if (urls.length === 0) {
          continue;
        }

        // Try each webhook URL until one succeeds
        let lastError: string = 'No webhook URLs configured';

        for (const webhookUrl of urls) {
          try {
            const requestId = `wbr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const timestamp = new Date().toISOString();

            // Build signed payload
            const payload: WebhookPayload = {
              toolName,
              arguments: args,
              userId,
              userRole,
              requestId,
              timestamp,
              signature: this.signPayload(requestId, timestamp, webhookUrl),
            };

            const response = await this.callWebhook(webhookUrl, payload);

            if (response.success) {
              // Log the webhook invocation
              await this.logWebhookCall(plugin.id, toolName, args, response, userId);
              return response;
            }

            lastError = response.error || 'Webhook returned error';
          } catch (error: any) {
            lastError = error.message;
            logger.warn('Webhook call failed, trying next URL', { url: webhookUrl, error: error.message });
            continue; // Try next URL
          }
        }

        return { success: false, error: `All webhook URLs failed: ${lastError}` };
      }
    }

    // No plugin claimed this tool
    return { success: false, error: `No plugin webhook registered for tool "${toolName}"` };
  }

  /**
   * Make HTTP request to a plugin webhook endpoint.
   */
  private async callWebhook(url: string, payload: WebhookPayload): Promise<WebhookResponse> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Request-Id': payload.requestId,
          'X-Webhook-Timestamp': payload.timestamp,
          'X-Webhook-Signature': payload.signature,
          'X-Plugin-Name': 'marketplace-plugin',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000), // 30-second timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      const data = await response.json() as Record<string, any>;
      return {
        success: data.success ?? true,
        result: data.result ?? data.data,
        error: data.error ?? data.message,
      };
    } catch (error: any) {
      logger.error('Webhook call error', { url, error: error.message });
      return {
        success: false,
        error: `Webhook call failed: ${error.message}`,
      };
    }
  }

  /**
   * Generate HMAC signature for webhook payload to ensure authenticity.
   */
  private signPayload(requestId: string, timestamp: string, webhookUrl: string): string {
    // In production, use crypto module with a shared secret
    // This is a placeholder implementation
    const crypto = require('crypto');
    const secret = process.env.WEBHOOK_SIGNING_SECRET || 'development-secret';
    const message = `${requestId}|${timestamp}|${webhookUrl}`;
    return crypto.createHmac('sha256', secret).update(message).digest('hex');
  }

  /**
   * Log webhook calls for debugging and auditing.
   */
  private async logWebhookCall(pluginId: string, toolName: string, args: any, response: any, userId: string) {
    try {
      await prisma.webhookEvent.create({
        data: {
          eventType: `ai_tool:${toolName}`,
          source: `plugin:${pluginId}`,
          payload: JSON.stringify({ args, userId, response }),
          status: response.success ? 'DELIVERED' : 'FAILED',
          lastError: response.error || null,
        },
      });
    } catch (error: any) {
      logger.warn('Failed to log webhook event', { error: error.message });
    }
  }

  /**
   * Get all registered plugin webhook tools.
   * Returns tools declared in plugin manifests under `aiTools`.
   */
  async getPluginWebhookTools(): Promise<any[]> {
    const plugins = await prisma.plugin.findMany({
      where: { isEnabled: true, webhookUrls: { not: '[]' } },
    });

    const tools: any[] = [];

    for (const plugin of plugins) {
      const manifest = plugin.manifest as any;
      const aiTools = manifest?.aiTools || [];

      for (const tool of aiTools) {
        tools.push({
          name: tool.name,
          description: tool.description,
          handlerType: 'webhook',
          handlerRef: plugin.slug,
          roles: tool.roles || ['CUSTOMER', 'SELLER', 'ADMIN', 'SUPER_ADMIN'],
          jsonSchema: tool.parameters || { type: 'object', properties: {} },
          requiresConfirmation: tool.requiresConfirmation || false,
          riskLevel: tool.riskLevel || 'low',
          category: 'plugin',
          enabled: true,
        });
      }
    }

    return tools;
  }
}

export const pluginWebhookService = new PluginWebhookService();