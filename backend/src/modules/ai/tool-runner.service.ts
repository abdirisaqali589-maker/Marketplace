import { prisma } from '../../common/prisma';
import { AppError, NotFoundError } from '../../common/errors';
import { logger } from '../../common/logger';
import { AiToolRegistry, ToolCallRequest, ToolCallResult } from './ai-tool-registry.service';
import { AIToolsService } from '../chat/ai-tools.service';
import { knowledgeService } from './knowledge.service';
import { pluginWebhookService } from '../plugin/plugin-webhook.service';
import { WorkflowToolService } from '../workflow/workflow-tool.service';

/**
 * SecureToolRunner
 *
 * Central entry point for AI tool execution with:
 * - Role-based access control (real checks, not just prompt-based)
 * - JSON Schema argument validation
 * - Confirmation gates for high-risk actions
 * - Rate limiting per user per tool
 * - Full audit trail for every call
 * - Knowledge base RAG integration
 * - Plugin webhook dispatch
 * - Workflow-as-tool execution
 *
 * This replaces the old direct `executeTool` call in AIChatService
 * and the hardcoded switch/case dispatch pattern.
 */
export class SecureToolRunner {
  private registry: AiToolRegistry;
  private toolsService: AIToolsService;
  private workflowService: WorkflowToolService;

  constructor(registry: AiToolRegistry, toolsService: AIToolsService) {
    this.registry = registry;
    this.toolsService = toolsService;
    this.workflowService = new WorkflowToolService(registry);

    // Register all built-in tool handlers
    this.registerBuiltinHandlers();
  }

  private registerBuiltinHandlers() {
    const handlers = new Map<string, (args: any, userId: string) => Promise<any>>();

    // ── Customer Tools ──
    handlers.set('search_products', (args, userId) =>
      this.toolsService.searchProducts(args.query, args.limit));
    handlers.set('get_product', (args, userId) =>
      this.toolsService.getProductBySlug(args.slug));
    handlers.set('list_categories', () =>
      this.toolsService.listCategories());
    handlers.set('get_cart', (args, userId) =>
      this.toolsService.getCart(userId));
    handlers.set('add_to_cart', (args, userId) =>
      this.toolsService.addToCart(userId, args.productId, args.variantId, args.quantity));
    handlers.set('remove_from_cart', (args, userId) =>
      this.toolsService.removeFromCart(userId, args.itemId));
    handlers.set('update_cart_item', (args, userId) =>
      this.toolsService.updateCartItem(userId, args.itemId, args.quantity));
    handlers.set('clear_cart', (args, userId) =>
      this.toolsService.clearCart(userId));
    handlers.set('get_wishlist', (args, userId) =>
      this.toolsService.getWishlist(userId));
    handlers.set('add_to_wishlist', (args, userId) =>
      this.toolsService.addToWishlist(userId, args.productId));
    handlers.set('remove_from_wishlist', (args, userId) =>
      this.toolsService.removeFromWishlist(userId, args.productId));
    handlers.set('get_orders', (args, userId) =>
      this.toolsService.getUserOrders(userId, args.limit, args.status));
    handlers.set('get_order_detail', (args, userId) =>
      this.toolsService.getOrderDetail(userId, args.orderId));
    handlers.set('get_featured', (args) =>
      this.toolsService.getFeaturedProducts(args.limit));
    handlers.set('get_platform_stats', () =>
      this.toolsService.getPlatformStats());
    handlers.set('get_navigation_links', (args, userId) =>
      this.toolsService.getNavigationLinks(args.role));
    handlers.set('list_shipping_methods', async () => {
      // Fallback: return available shipping info from config
      try {
        const flag = await prisma.featureFlag.findUnique({ where: { key: 'shipping.methods' } });
        if (flag) return JSON.parse(flag.value);
        return { message: 'Standard shipping available', estimatedDays: '3-7 business days' };
      } catch {
        return { message: 'Standard shipping available', estimatedDays: '3-7 business days' };
      }
    });
    handlers.set('list_coupons', () =>
      this.toolsService.listCoupons());

    // ── Knowledge Base Tool ──
    handlers.set('search_knowledge', async (args, userId) => {
      const result = await knowledgeService.search(args.query, {
        role: args.role || 'CUSTOMER',
        category: args.category,
        limit: args.limit || 5,
        useEmbeddings: args.useEmbeddings !== false,
      });
      return { results: result.results, searchType: result.searchType };
    });
    handlers.set('get_knowledge_context', async (args, userId) => {
      const ctx = await knowledgeService.getKnowledgeContext(args.query, {
        role: args.role || 'CUSTOMER',
        maxEntries: args.maxEntries || 5,
        category: args.category,
      });
      return ctx;
    });

    // ── Seller Tools ──
    handlers.set('get_seller_profile', (args, userId) =>
      this.toolsService.getSellerProfile(userId));
    handlers.set('update_seller_profile', (args, userId) =>
      this.toolsService.updateSellerProfile(userId, args));
    handlers.set('get_seller_products', (args, userId) =>
      this.toolsService.getSellerProducts(userId, args.query, args.status, args.limit, args.page));
    handlers.set('create_product', (args, userId) =>
      this.toolsService.createProduct(userId, args));
    handlers.set('update_product', (args, userId) =>
      this.toolsService.updateProduct(userId, args.productId, args));
    handlers.set('get_seller_orders', (args, userId) =>
      this.toolsService.getSellerOrders(userId, args.status, args.limit, args.page));
    handlers.set('update_order_status', (args, userId) =>
      this.toolsService.updateOrderStatus(userId, args.orderId, args.status));
    handlers.set('get_seller_analytics', (args, userId) =>
      this.toolsService.getSellerAnalytics(userId, args.period));
    handlers.set('submit_kyc', (args, userId) =>
      this.toolsService.submitKyc(userId, args));
    handlers.set('get_seller_payouts', (args, userId) =>
      this.toolsService.getSellerPayouts(userId, args.limit));

    // ── Admin Tools ──
    handlers.set('get_admin_dashboard', () =>
      this.toolsService.getAdminDashboard());
    handlers.set('list_orders', (args) =>
      this.toolsService.listOrders(args.search, args.status, args.limit, args.page));
    handlers.set('list_users', (args) =>
      this.toolsService.listUsers(args.search, args.role, args.limit, args.page));
    handlers.set('toggle_user_status', (args) =>
      this.toolsService.toggleUserStatus(args.userId));
    handlers.set('verify_seller', (args) =>
      this.toolsService.verifySeller(args.sellerId));
    handlers.set('reject_seller', (args) =>
      this.toolsService.rejectSeller(args.sellerId, args.reason));
    handlers.set('list_roles', () =>
      this.toolsService.listRoles());
    handlers.set('create_role', (args) =>
      this.toolsService.createRole(args));
    handlers.set('delete_role', (args) =>
      this.toolsService.deleteRole(args.roleId));
    handlers.set('get_config', (args) =>
      this.toolsService.getConfig(args.key));
    handlers.set('update_config', (args) =>
      this.toolsService.updateConfig(args.key, args.value));
    handlers.set('get_themes', () =>
      this.toolsService.getThemes());
    handlers.set('set_theme', (args) =>
      this.toolsService.setTheme(args.theme));
    handlers.set('set_theme_mode', (args) =>
      this.toolsService.setThemeMode(args.mode));
    handlers.set('get_promotion_placements', () =>
      this.toolsService.getPromotionPlacements());
    handlers.set('list_pages', (args) =>
      this.toolsService.listPages(args.search));
    handlers.set('update_page', (args) =>
      this.toolsService.updatePage(args.key, args.content));
    handlers.set('get_page_content', (args) =>
      this.toolsService.getPageContent(args.key));
    handlers.set('update_page_section', (args) =>
      this.toolsService.updatePageSection(args.key, args.section, args.content));
    handlers.set('delete_page_section', (args) =>
      this.toolsService.deletePageSection(args.key, args.section));
    handlers.set('search_content', (args) =>
      this.toolsService.searchContent(args.query));
    handlers.set('get_blog_post', (args) =>
      this.toolsService.getBlogPost(args.slug));
    handlers.set('update_blog_post', (args) =>
      this.toolsService.updateBlogPost(args.slug, args));
    handlers.set('generate_content', (args) =>
      this.toolsService.generateContent(args.pageType, args.tone, args.context, args.sections));
    handlers.set('list_plugins', () =>
      this.toolsService.listPlugins());
    handlers.set('toggle_plugin', (args) =>
      this.toolsService.togglePlugin(args.pluginId, args.enabled));
    handlers.set('list_announcements', () =>
      this.toolsService.listAnnouncements());
    handlers.set('create_announcement', (args) =>
      this.toolsService.createAnnouncement(args));
    handlers.set('update_announcement', (args) =>
      this.toolsService.updateAnnouncement(args.announcementId, args));
    handlers.set('toggle_announcement', (args) =>
      this.toolsService.toggleAnnouncement(args.announcementId));
    handlers.set('get_analytics_summary', (args) =>
      this.toolsService.getAnalyticsSummary(args.period));
    handlers.set('generate_orders_report', (args) =>
      this.toolsService.generateOrdersReport(args.format, args.period, args.status));
    handlers.set('generate_users_report', (args) =>
      this.toolsService.generateUsersReport(args.format, args.role));
    handlers.set('get_audit_logs', (args) =>
      this.toolsService.getAuditLogs(args.action, args.entity, args.limit, args.page));
    handlers.set('send_notification', (args) =>
      this.toolsService.sendNotification(args.userId, args.title, args.message, args.type));
    handlers.set('get_return_requests', (args) =>
      this.toolsService.getReturnRequests(args.status, args.limit, args.page));
    handlers.set('process_return', (args) =>
      this.toolsService.processReturn(args.returnId, args.action, args.reason));
    handlers.set('get_workflows', () =>
      this.toolsService.getWorkflows());
    handlers.set('toggle_workflow', (args) =>
      this.toolsService.toggleWorkflow(args.workflowId));
    handlers.set('create_workflow', (args) =>
      this.toolsService.createWorkflow(args));
    handlers.set('get_tickets', (args) =>
      this.toolsService.getTickets(args.status, args.limit));
    handlers.set('update_ticket_status', (args) =>
      this.toolsService.updateTicketStatus(args.ticketId, args.status));

    this.registry.registerBuiltinHandlers(handlers);
  }

  /**
   * Main entry point for AI tool execution.
   * Now includes knowledge base context injection for relevant queries.
   */
  async run(request: ToolCallRequest): Promise<ToolCallResult> {
    // Check for workflow: prefixed tools
    if (request.name.startsWith('workflow:')) {
      const slug = request.name.replace('workflow:', '');
      try {
        const result = await this.workflowService.executeWorkflowTool(slug, request.arguments, request.userId);
        // Audit is logged by executeWorkflowTool internally via registry
        return { success: true, result };
      } catch (error: any) {
        return { success: false, result: null, error: error.message };
      }
    }

    // Check for plugin webhook tools
    if (request.name.startsWith('plugin:')) {
      const toolName = request.name.startsWith('plugin:') ? request.name.replace('plugin:', '') : request.name;
      try {
        const result = await pluginWebhookService.executeWebhookTool(toolName, request.arguments, request.userId, request.userRole);
        return { success: result.success, result: result.result, error: result.error };
      } catch (error: any) {
        return { success: false, result: null, error: error.message };
      }
    }

    // Standard execution through registry
    return this.registry.executeTool(request);
  }

  /**
   * Approve a pending tool call that requires confirmation.
   */
  async approve(auditLogId: string, approvedBy: string): Promise<any> {
    return this.registry.approveToolCall(auditLogId, approvedBy);
  }

  /**
   * Get all tools available to a specific role, including plugin webhook tools
   * and workflow tools (prefixed with 'workflow:').
   */
  async getToolsForRole(role: string, options?: {
    category?: string;
    enabledOnly?: boolean;
    includePlugins?: boolean;
    includeWorkflows?: boolean;
  }): Promise<any[]> {
    const includePlugins = options?.includePlugins ?? true;
    const includeWorkflows = options?.includeWorkflows ?? true;

    // Get registry tools
    const registryTools = await this.registry.listTools({
      category: options?.category,
      enabled: options?.enabledOnly,
      role,
    });

    let tools = (registryTools.data || []).map((t: any) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.jsonSchema || { type: 'object', properties: {} },
      },
    }));

    // Optionally include plugin webhook tools
    if (includePlugins) {
      try {
        const pluginTools = await pluginWebhookService.getPluginWebhookTools();
        const rolePluginTools = pluginTools.filter((pt: any) =>
          !pt.roles || pt.roles.includes(role)
        );
        tools.push(...rolePluginTools.map((pt: any) => ({
          type: 'function',
          function: {
            name: pt.name,
            description: pt.description,
            parameters: pt.jsonSchema || { type: 'object', properties: {} },
          },
        })));
      } catch { /* skip plugin errors */ }
    }

    // Optionally include workflow tools
    if (includeWorkflows) {
      try {
        const workflowTools = await this.workflowService.listWorkflowTools();
        tools.push(...workflowTools.map((wt: any) => ({
          type: 'function',
          function: {
            name: wt.name,
            description: wt.description,
            parameters: wt.jsonSchema || { type: 'object', properties: {} },
          },
        })));
      } catch { /* skip workflow errors */ }
    }

    return tools;
  }

  /**
   * Injected knowledge base context into system messages.
   */
  async getKnowledgeContext(query: string, options?: { role?: string; maxEntries?: number }): Promise<string> {
    const ctx = await knowledgeService.getKnowledgeContext(query, {
      role: options?.role,
      maxEntries: options?.maxEntries,
    });
    if (!ctx.text) return '';
    return `Knowledge Base Context (use to answer questions accurately):\n${ctx.text}\n\nSources: ${ctx.sources.join(', ')}`;
  }
}

// Singleton instance
let runnerInstance: SecureToolRunner | null = null;

export function getToolRunner(): SecureToolRunner {
  if (!runnerInstance) {
    const registry = new AiToolRegistry();
    const toolsService = new AIToolsService();
    runnerInstance = new SecureToolRunner(registry, toolsService);
  }
  return runnerInstance;
}
