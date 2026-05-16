import { prisma } from '../../common/prisma';
import { AiService } from '../ai/ai.service';
import { SecureToolRunner, getToolRunner } from '../ai/tool-runner.service';
import { NotFoundError, AppError } from '../../common/errors';
import { logger } from '../../common/logger';

export interface AIChatConfig {
  enabled?: boolean;
  defaultModel?: string;
  defaultProvider?: string;
  systemPrompt?: string;
  maxContextMessages?: number;
  temperature?: number;
  maxTokens?: number;
  usageLimitDaily?: number;
  usageLimitMonthly?: number;
  enableProductSearch?: boolean;
  enableCartOperations?: boolean;
  enableOrderLookup?: boolean;
  enableContentWriting?: boolean;
  enablePageManagement?: boolean;
  enableUserManagement?: boolean;
  enableAnalytics?: boolean;
  enableKnowledgeBase?: boolean;
  enableSellerTools?: boolean;
  enableAdminTools?: boolean;
  enableWishlist?: boolean;
  enablePromotions?: boolean;
  enableReturns?: boolean;
  enableWorkflows?: boolean;
  enablePlugins?: boolean;
  enableNotifications?: boolean;
  enableSupportTickets?: boolean;
  skills?: any[];
  customTools?: any[];
  knowledgeBase?: any[];
  rolePrompts?: any[];
  workspaces?: any[];
  maxSearchResults?: number;
  maxFeaturedResults?: number;
  maxOrderHistory?: number;
}

interface StreamCallbacks {
  onThinking: (text: string) => void;
  onContent: (text: string) => void;
  onDone: (result: { content: string; thinking: string; model?: string; tokens?: number }) => void;
  onError: (error: string) => void;
}

// ── Built-in tool definitions used as fallback & for initial seed ──
// These are also stored in the AiTool registry after migration.
const TOOL_DEFINITIONS = [
  // ─────────────────────────────────────────────────
  // CUSTOMER-FACING TOOLS
  // ─────────────────────────────────────────────────
  {
    name: 'search_products',
    description: 'Search for products on the marketplace by title or description. Returns price, store, rating, stock, and image.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query for product title or description' },
        limit: { type: 'number', description: 'Max results (default 5, max 20)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_product',
    description: 'Get detailed information about a specific product including variants, images, store info, and questions/answers.',
    parameters: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'The product slug (URL-friendly identifier)' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'list_categories',
    description: 'List all product categories with their subcategories available on the marketplace.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_cart',
    description: 'View the current user shopping cart contents with item details, quantities, and totals.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'add_to_cart',
    description: 'Add a product to the user shopping cart. Automatically checks stock availability. Use when a user confirms they want to purchase a product.',
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'The product ID to add' },
        variantId: { type: 'string', description: 'Optional variant ID (size/color/etc)' },
        quantity: { type: 'number', description: 'Quantity to add (default 1)' },
      },
      required: ['productId'],
    },
  },
  {
    name: 'remove_from_cart',
    description: 'Remove an item from the user shopping cart by its cart item ID.',
    parameters: {
      type: 'object',
      properties: { itemId: { type: 'string', description: 'The cart item ID to remove' } },
      required: ['itemId'],
    },
  },
  {
    name: 'update_cart_item',
    description: 'Update the quantity of an item in the cart. Set to 0 or use remove_from_cart to delete.',
    parameters: {
      type: 'object',
      properties: {
        itemId: { type: 'string', description: 'The cart item ID' },
        quantity: { type: 'number', description: 'New quantity (must be at least 1)' },
      },
      required: ['itemId', 'quantity'],
    },
  },
  {
    name: 'clear_cart',
    description: 'Remove all items from the user shopping cart.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_wishlist',
    description: 'View the current user wishlist items with product details.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'add_to_wishlist',
    description: 'Add a product to the user wishlist for later reference.',
    parameters: {
      type: 'object',
      properties: { productId: { type: 'string', description: 'The product ID to add to wishlist' } },
      required: ['productId'],
    },
  },
  {
    name: 'remove_from_wishlist',
    description: 'Remove a product from the user wishlist.',
    parameters: {
      type: 'object',
      properties: { productId: { type: 'string', description: 'The product ID to remove from wishlist' } },
      required: ['productId'],
    },
  },
  {
    name: 'get_orders',
    description: 'View the current user order history with status, payment info, and shipping details.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max orders to return (default 5)' },
        status: { type: 'string', description: 'Filter by status: PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED' },
      },
    },
  },
  {
    name: 'get_order_detail',
    description: 'Get detailed information about a specific order including items, payments, and shipping address.',
    parameters: {
      type: 'object',
      properties: { orderId: { type: 'string', description: 'The order ID' } },
      required: ['orderId'],
    },
  },
  {
    name: 'get_featured',
    description: 'Get featured/promoted products for recommendations.',
    parameters: {
      type: 'object',
      properties: { limit: { type: 'number', description: 'Max results (default 4)' } },
    },
  },
  {
    name: 'get_platform_stats',
    description: 'Get general marketplace statistics (product count, seller count, categories, brands, orders).',
    parameters: { type: 'object', properties: {} },
  },

  // ─────────────────────────────────────────────────
  // SELLER-FACING TOOLS
  // ─────────────────────────────────────────────────
  {
    name: 'get_seller_profile',
    description: 'Get the seller profile including store info, KYC status, rating, and product/order counts. Seller only.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'update_seller_profile',
    description: 'Update the seller profile information like store name, description, phone, address, logo, banner. Seller only.',
    parameters: {
      type: 'object',
      properties: {
        storeName: { type: 'string', description: 'Store display name' },
        description: { type: 'string', description: 'Store description' },
        phone: { type: 'string', description: 'Contact phone number' },
        address: { type: 'string', description: 'Store address' },
        logo: { type: 'string', description: 'Logo image URL' },
        banner: { type: 'string', description: 'Banner image URL' },
      },
    },
  },
  {
    name: 'get_seller_products',
    description: 'Get the seller own products with pagination, search, and status filter. Seller only.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search by title or description' },
        status: { type: 'string', description: 'Filter by status: DRAFT, ACTIVE, INACTIVE' },
        limit: { type: 'number', description: 'Results per page (default 20)' },
        page: { type: 'number', description: 'Page number (default 1)' },
      },
    },
  },
  {
    name: 'create_product',
    description: 'Create a new product listing as DRAFT. The product will need to be activated after creation. Seller only.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Product title' },
        description: { type: 'string', description: 'Product description' },
        price: { type: 'number', description: 'Base price' },
        discountPrice: { type: 'number', description: 'Discounted price (optional)' },
        currency: { type: 'string', description: 'Currency code (default TZS)' },
        stock: { type: 'number', description: 'Initial stock quantity' },
        sku: { type: 'string', description: 'SKU identifier' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Product tags' },
        categoryId: { type: 'string', description: 'Category ID' },
        brandId: { type: 'string', description: 'Brand ID' },
        minOrder: { type: 'number', description: 'Minimum order quantity' },
        weight: { type: 'number', description: 'Product weight' },
        weightUnit: { type: 'string', description: 'Weight unit (kg, g, lb)' },
      },
      required: ['title', 'price'],
    },
  },
  {
    name: 'update_product',
    description: 'Update an existing product listing. Can modify title, description, price, stock, status, etc. Seller only.',
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'The product ID to update' },
        title: { type: 'string', description: 'New title' },
        description: { type: 'string', description: 'New description' },
        price: { type: 'number', description: 'New base price' },
        discountPrice: { type: 'number', description: 'New discounted price' },
        stock: { type: 'number', description: 'New stock quantity' },
        sku: { type: 'string', description: 'New SKU' },
        tags: { type: 'array', items: { type: 'string' }, description: 'New tags' },
        categoryId: { type: 'string', description: 'New category ID' },
        brandId: { type: 'string', description: 'New brand ID' },
        isActive: { type: 'boolean', description: 'Whether the product is active/visible' },
        status: { type: 'string', description: 'Product status: DRAFT, ACTIVE, INACTIVE' },
      },
      required: ['productId'],
    },
  },
  {
    name: 'get_seller_orders',
    description: 'Get orders received by the seller with optional status filter and pagination. Seller only.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by status: PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED' },
        limit: { type: 'number', description: 'Results per page (default 10)' },
        page: { type: 'number', description: 'Page number (default 1)' },
      },
    },
  },
  {
    name: 'update_order_status',
    description: 'Update the status of an order. Follows valid status transitions: PENDING→CONFIRMED→PROCESSING→SHIPPED→DELIVERED. CANCELLED is allowed from PENDING, CONFIRMED, PROCESSING. Seller only.',
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'The order ID to update' },
        status: { type: 'string', description: 'New status: CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED' },
      },
      required: ['orderId', 'status'],
    },
  },
  {
    name: 'get_seller_analytics',
    description: 'Get seller analytics including total orders, revenue, products, and items sold for a given period. Seller only.',
    parameters: {
      type: 'object',
      properties: {
        period: { type: 'string', description: 'Period: today, this_week, this_month, this_year' },
      },
    },
  },
  {
    name: 'submit_kyc',
    description: 'Submit KYC (Know Your Customer) documents for seller verification. Seller only.',
    parameters: {
      type: 'object',
      properties: {
        documents: { type: 'array', items: { type: 'string' }, description: 'Array of document URLs or IDs' },
        businessLicense: { type: 'string', description: 'Business license number or document' },
        taxId: { type: 'string', description: 'Tax ID number' },
        idDocument: { type: 'string', description: 'Government ID document URL' },
        addressProof: { type: 'string', description: 'Proof of address document URL' },
      },
    },
  },
  {
    name: 'get_seller_payouts',
    description: 'View seller payout history including amounts, status, and payment methods. Seller only.',
    parameters: {
      type: 'object',
      properties: { limit: { type: 'number', description: 'Max results (default 10)' } },
    },
  },

  // ─────────────────────────────────────────────────
  // ADMIN-FACING TOOLS
  // ─────────────────────────────────────────────────
  {
    name: 'get_admin_dashboard',
    description: 'Get the admin dashboard overview with key metrics: users, sellers, orders, products, revenue, pending verifications. Admin only.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'list_users',
    description: 'Search and list platform users with optional filters for role and status. Admin only.',
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Search by name or email' },
        role: { type: 'string', description: 'Filter by role: USER, SELLER, ADMIN' },
        limit: { type: 'number', description: 'Results per page (default 20)' },
        page: { type: 'number', description: 'Page number (default 1)' },
      },
    },
  },
  {
    name: 'toggle_user_status',
    description: 'Activate or deactivate a user account. Admin only.',
    parameters: {
      type: 'object',
      properties: { userId: { type: 'string', description: 'The user ID to toggle' } },
      required: ['userId'],
    },
  },
  {
    name: 'verify_seller',
    description: 'Approve and verify a seller KYC application. Admin only.',
    parameters: {
      type: 'object',
      properties: { sellerId: { type: 'string', description: 'The seller ID to verify' } },
      required: ['sellerId'],
    },
  },
  {
    name: 'reject_seller',
    description: 'Reject a seller KYC application with a reason. Admin only.',
    parameters: {
      type: 'object',
      properties: {
        sellerId: { type: 'string', description: 'The seller ID to reject' },
        reason: { type: 'string', description: 'Rejection reason' },
      },
      required: ['sellerId'],
    },
  },
  {
    name: 'list_roles',
    description: 'List all admin roles with their permissions and user counts. Admin only.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'create_role',
    description: 'Create a new admin role with specific permissions. Admin only.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Role name' },
        description: { type: 'string', description: 'Role description' },
        permissions: { type: 'array', items: { type: 'string' }, description: 'Permission strings array' },
      },
      required: ['name'],
    },
  },
  {
    name: 'delete_role',
    description: 'Delete an admin role. Cannot delete system roles or roles with assigned users. Admin only.',
    parameters: {
      type: 'object',
      properties: { roleId: { type: 'string', description: 'The role ID to delete' } },
      required: ['roleId'],
    },
  },
  {
    name: 'get_config',
    description: 'Get platform configuration settings. Optionally pass a key to get a specific setting. Admin only.',
    parameters: {
      type: 'object',
      properties: { key: { type: 'string', description: 'Optional config key to retrieve' } },
    },
  },
  {
    name: 'update_config',
    description: 'Update a platform configuration setting. Admin only.',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Configuration key to update' },
        value: { type: 'string', description: 'New value (will be JSON stringified)' },
      },
      required: ['key', 'value'],
    },
  },
  {
    name: 'get_themes',
    description: 'List all available themes and show the currently active theme. Admin only.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'set_theme',
    description: 'Change the active theme for the marketplace. Admin only.',
    parameters: {
      type: 'object',
      properties: { theme: { type: 'string', description: 'The theme name to apply' } },
      required: ['theme'],
    },
  },
  {
    name: 'list_pages',
    description: 'Search through all custom pages, blog posts, and platform content. Admin only.',
    parameters: {
      type: 'object',
      properties: { search: { type: 'string', description: 'Search query' } },
    },
  },
  {
    name: 'update_page',
    description: 'Create or update a platform page content. Use this to modify About Us, Policies, Terms, etc. Admin only.',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Page key (e.g., about_us, privacy_policy, terms_of_service)' },
        content: { type: 'object', description: 'Page content object with title and sections' },
      },
      required: ['key', 'content'],
    },
  },
  {
    name: 'generate_content',
    description: 'Generate content templates for pages like About Us, Policies, Terms, Privacy, etc. Provides structured templates that can then be populated with actual content. Admin only.',
    parameters: {
      type: 'object',
      properties: {
        pageType: { type: 'string', enum: ['about_us', 'privacy_policy', 'terms_of_service', 'return_policy', 'shipping_policy', 'faq', 'blog_post', 'landing_page', 'product_description', 'email_template'], description: 'Type of page content to generate' },
        tone: { type: 'string', description: 'Writing tone: professional, friendly, formal, casual, persuasive, informative' },
        context: { type: 'string', description: 'Additional context about your business or requirements' },
        sections: { type: 'array', items: { type: 'string' }, description: 'Specific sections to include' },
      },
      required: ['pageType'],
    },
  },
  {
    name: 'list_plugins',
    description: 'List all installed plugins with their configuration and enabled status. Admin only.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'toggle_plugin',
    description: 'Enable or disable a plugin. Admin only.',
    parameters: {
      type: 'object',
      properties: {
        pluginId: { type: 'string', description: 'The plugin ID' },
        enabled: { type: 'boolean', description: 'Whether to enable (true) or disable (false)' },
      },
      required: ['pluginId', 'enabled'],
    },
  },
  {
    name: 'list_announcements',
    description: 'List all platform announcements. Admin only.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'create_announcement',
    description: 'Create a new platform announcement that users will see. Admin only.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Announcement title' },
        content: { type: 'string', description: 'Announcement content/message' },
        type: { type: 'string', enum: ['info', 'warning', 'success', 'danger'], description: 'Announcement type (default info)' },
        expiresAt: { type: 'string', description: 'Expiration date (ISO format, optional)' },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'get_analytics_summary',
    description: 'Get a summary of platform analytics (revenue, orders, users, products). Supports different time periods. Admin only.',
    parameters: {
      type: 'object',
      properties: {
        period: { type: 'string', enum: ['today', 'this_week', 'this_month', 'this_year', 'all'], description: 'Time period for analytics (default all)' },
      },
    },
  },
  {
    name: 'get_audit_logs',
    description: 'View platform audit logs for tracking admin actions. Admin only.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', description: 'Filter by action type' },
        entity: { type: 'string', description: 'Filter by entity type' },
        limit: { type: 'number', description: 'Results per page (default 20)' },
        page: { type: 'number', description: 'Page number (default 1)' },
      },
    },
  },
  {
    name: 'send_notification',
    description: 'Send a notification to a specific user. Admin only.',
    parameters: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'Recipient user ID' },
        title: { type: 'string', description: 'Notification title' },
        message: { type: 'string', description: 'Notification message' },
        type: { type: 'string', enum: ['info', 'warning', 'success', 'error'], description: 'Notification type' },
      },
      required: ['userId', 'title', 'message'],
    },
  },
  {
    name: 'get_return_requests',
    description: 'List all return/refund requests with optional status filter. Admin only.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by status: PENDING, APPROVED, REJECTED, REFUNDED' },
        limit: { type: 'number', description: 'Results per page (default 20)' },
        page: { type: 'number', description: 'Page number (default 1)' },
      },
    },
  },
  {
    name: 'process_return',
    description: 'Approve or reject a return/refund request. Admin only.',
    parameters: {
      type: 'object',
      properties: {
        returnId: { type: 'string', description: 'The return request ID' },
        action: { type: 'string', enum: ['approve', 'reject'], description: 'Action to take' },
        reason: { type: 'string', description: 'Reason for rejection (required if rejecting)' },
      },
      required: ['returnId', 'action'],
    },
  },
  {
    name: 'get_workflows',
    description: 'List all automation workflow templates. Admin only.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'toggle_workflow',
    description: 'Enable or disable an automation workflow. Admin only.',
    parameters: {
      type: 'object',
      properties: { workflowId: { type: 'string', description: 'The workflow template ID' } },
      required: ['workflowId'],
    },
  },
  {
    name: 'create_workflow',
    description: 'Create a new automation workflow template with steps and triggers. Admin only.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Workflow name' },
        slug: { type: 'string', description: 'Unique URL-friendly slug' },
        description: { type: 'string', description: 'Workflow description' },
        category: { type: 'string', description: 'Category like order, notification, email' },
        steps: { type: 'array', items: { type: 'object' }, description: 'Array of workflow step objects' },
        triggers: { type: 'array', items: { type: 'object' }, description: 'Array of trigger event objects' },
        config: { type: 'object', description: 'Additional configuration' },
      },
      required: ['name', 'slug'],
    },
  },
  {
    name: 'get_tickets',
    description: 'List support tickets with optional status filter. Admin only.',
    parameters: {
      type: 'object',
      properties: { status: { type: 'string', description: 'Filter by status: OPEN, IN_PROGRESS, RESOLVED, CLOSED' }, limit: { type: 'number', description: 'Max results (default 10)' } },
    },
  },
  {
    name: 'update_ticket_status',
    description: 'Update a support ticket status. Admin only.',
    parameters: {
      type: 'object',
      properties: {
        ticketId: { type: 'string', description: 'The ticket ID' },
        status: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'], description: 'New status' },
      },
      required: ['ticketId', 'status'],
    },
  },
  {
    name: 'list_shipping_methods',
    description: 'List all available shipping methods with pricing and estimated delivery times.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'list_coupons',
    description: 'List all promotional coupons. Admin only.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'create_coupon',
    description: 'Create a new promotional coupon or discount code. Admin only.',
    parameters: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Unique promo code' },
        type: { type: 'string', enum: ['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING'], description: 'Discount type' },
        value: { type: 'number', description: 'Discount value (percentage or fixed amount)' },
        minOrder: { type: 'number', description: 'Minimum order amount required' },
        usageLimit: { type: 'number', description: 'Maximum number of uses' },
        startDate: { type: 'string', description: 'Start date (ISO format)' },
        endDate: { type: 'string', description: 'End date (ISO format)' },
      },
      required: ['code', 'type', 'value'],
    },
  },
  {
    name: 'toggle_coupon',
    description: 'Enable or disable a promotional coupon. Admin only.',
    parameters: {
      type: 'object',
      properties: { couponId: { type: 'string', description: 'The coupon ID' } },
      required: ['couponId'],
    },
  },

  // ─────────────────────────────────────────────────
  // CONTENT READ/WRITE TOOLS — Full page content management
  // ─────────────────────────────────────────────────
  {
    name: 'get_page_content',
    description: 'Get the FULL content of a platform page (About Us, Privacy Policy, Terms, Return Policy, Shipping Policy, FAQ, etc). Returns all sections and their content. Use this FIRST to read existing page content before editing. Admin only.',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'The page key (e.g., about_us, privacy_policy, terms_of_service, return_policy, shipping_policy, faq)' },
      },
      required: ['key'],
    },
  },
  {
    name: 'update_page',
    description: 'Update or replace the ENTIRE content of a platform page. Provide the full page content object including title and sections. This OVERWRITES the whole page. Admin only.',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'The page key (e.g., about_us, privacy_policy, terms_of_service)' },
        content: { type: 'object', description: 'The full page content object with title and sections array' },
      },
      required: ['key', 'content'],
    },
  },
  {
    name: 'update_page_section',
    description: 'Update or add a SPECIFIC section on a platform page without touching other sections. Use this to modify part of a page while keeping the rest intact. Admin only.',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'The page key' },
        section: { type: 'string', description: 'The section heading/ID to update' },
        content: { type: 'object', description: 'The new content for this section (can include heading, content, and any other properties)' },
      },
      required: ['key', 'section', 'content'],
    },
  },
  {
    name: 'delete_page_section',
    description: 'Remove a SPECIFIC section from a platform page while keeping the rest of the page intact. Admin only.',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'The page key' },
        section: { type: 'string', description: 'The section heading/ID to remove' },
      },
      required: ['key', 'section'],
    },
  },
  {
    name: 'search_content',
    description: 'SEARCH across ALL platform content including pages, blog posts, and configuration settings. Finds matching text in titles and full content. Returns results with context snippets. Admin only.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The text to search for across all content' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_blog_post',
    description: 'Get the FULL content of a blog post including title, content body, excerpt, status, tags. Admin only.',
    parameters: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'The blog post slug or ID' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'update_blog_post',
    description: 'Update a blog post content, title, status, excerpt, or tags. Admin only.',
    parameters: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'The blog post slug or ID' },
        title: { type: 'string', description: 'New title' },
        content: { type: 'string', description: 'New content body' },
        status: { type: 'string', description: 'New status: DRAFT, PUBLISHED, ARCHIVED' },
        excerpt: { type: 'string', description: 'New short excerpt/summary' },
        tags: { type: 'string', description: 'New tags' },
      },
      required: ['slug'],
    },
  },
];

const ENHANCED_SYSTEM_PROMPT = `You are the official AI assistant for **MarketPlace**, a multi-vendor e-commerce platform. You help **customers**, **sellers**, and **admins** with various tasks using your extensive toolset.

## Your Capabilities

You have access to powerful tools that let you interact with the platform in real time. You automatically detect the user's role from the system context and provide role-appropriate assistance.

### 👤 For Customers:
| Capability | Description |
|---|---|
| **🔍 Product Search** | Search products by name/description, get pricing, stock, store info, ratings |
| **📋 Product Details** | Full details including images, variants, descriptions, questions/answers |
| **📂 Category Browsing** | List categories with subcategories to help users discover products |
| **🛒 Cart Management** | View cart, add items, remove items, update quantities, clear cart |
| **❤️ Wishlist** | View wishlist, add products, remove products |
| **📦 Order Tracking** | View order history, detailed order info, payment status, shipping |
| **⭐ Recommendations** | Show featured/hot products |
| **📊 Platform Stats** | Get marketplace statistics (product count, sellers, categories) |
| **🚚 Shipping Info** | List available shipping methods and rates |

### 🏪 For Sellers:
| Capability | Description |
|---|---|
| **👤 Profile Management** | View and update store profile, description, contact info |
| **📦 Product Management** | Create, update, list, search your products. Manage stock, pricing, status |
| **📋 Order Management** | View received orders, update order status (confirm, process, ship, deliver) |
| **📈 Analytics** | View sales analytics, revenue, items sold by period |
| **💰 Payouts** | View payout history and status |
| **✅ KYC Submission** | Submit verification documents to become a verified seller |
| **🏪 Storefront** | Manage store appearance and settings |

### 🔐 For Admins:
| Capability | Description |
|---|---|
| **📊 Dashboard** | Full platform overview with key metrics |
| **👥 User Management** | List, search, activate/deactivate users |
| **✅ Seller Verification** | Approve/reject seller KYC applications |
| **🔑 Role Management** | List, create, delete admin roles with permissions |
| **⚙️ Configuration** | View and update all platform settings |
| **🎨 Theme Management** | List available themes and change the active theme |
| **📄 Page Management** | Search, create, update all platform pages (About, Policies, Terms, etc.) |
| **✍️ Content Generation** | Generate content templates for policies, blogs, landing pages |
| **🧩 Plugin Management** | List, enable, disable plugins |
| **📢 Announcements** | Create and manage platform announcements |
| **📈 Analytics** | Get detailed platform analytics by period |
| **📋 Audit Logs** | View all admin actions and platform events |
| **🔔 Notifications** | Send notifications to any user |
| **🔄 Returns** | View and process return/refund requests |
| **⚡ Workflows** | List, toggle, create automation workflows |
| **🎫 Support Tickets** | View and manage support tickets |
| **🏷️ Promotions** | List, create, enable/disable coupons and discounts |

## Role-Based Behavior

When you respond, ALWAYS check the user role provided in the system context:
- **If USER role**: Only use customer tools. Never show admin or seller tools.
- **If SELLER role**: Use customer tools AND seller tools. Never show admin tools unless explicitly needed.
- **If ADMIN role**: Use ALL tools — customer, seller, and admin.

## Shopping Flow (Customers)

When a user wants to buy something:
1. **SEARCH** for the product first using \`search_products\`
2. Present the options clearly with prices, store names, stock, and ratings
3. Ask the user to confirm which product they want
4. Once confirmed, **ADD** to their cart using \`add_to_cart\`
5. Confirm it's in their cart and suggest proceeding to checkout

## Order Processing Flow (Sellers/Admins)

When managing orders:
1. Use \`get_seller_orders\` or \`get_orders\` to find the relevant order
2. Verify order details with the user
3. Use \`update_order_status\` with appropriate transition
4. Confirm the status update to the user

## Page Content Management

When a user asks you to create or update a page:
1. **DO NOT use \`generate_content\`** — that tool only returns placeholder templates.
2. **Instead, WRITE the full content yourself** in your response, then call \`update_page\` with the complete page object.
3. Use \`get_page_content\` FIRST to read existing content before editing.
4. Use \`search_content\` to find content across all pages.

### Creating a New Page (Correct Way):
1. Write the full page content in your thinking/reasoning
2. Call \`update_page({"key": "privacy_policy", "content": {"title": "Privacy Policy", "sections": [{"heading": "Information We Collect", "content": "We collect..."}, ...]}})\`
3. Confirm to the user the page was created with its full content

### Editing an Existing Page:
1. First call \`get_page_content("about_us")\` to read the current content
2. Then call \`update_page\` or \`update_page_section\` or \`delete_page_section\` to modify it
3. Confirm what was changed

## Admin Operations

When performing administrative tasks:
1. For **theme changes**: Use \`get_themes\` first to list available themes, then \`set_theme\` to change. For light/dark/system mode, use \`set_theme_mode\`.
2. For **config changes**: Use \`get_config\` to see current settings, \`update_config\` to modify
3. For **page content**: Use \`update_page\` with proper key and structured content — write FULL content yourself
4. For **user management**: Use \`list_users\` to find users, \`toggle_user_status\` to activate/deactivate
5. For **seller verification**: Use \`verify_seller\` or \`reject_seller\` with appropriate reason
6. For **return processing**: Use \`process_return\` with approve or reject action
7. For **workflows**: Use \`get_workflows\` to list, \`toggle_workflow\` to enable/disable, \`create_workflow\` to create new
8. For **reports**: Use \`generate_orders_report\` when the user asks for Excel, CSV, document, or PDF reports and include the returned download link.
9. For **where UI items appear**: Use \`get_promotion_placements\` before explaining announcements, promotions, banners, coupons, or campaigns.
10. For **navigation**: Use \`get_navigation_links\` and include internal markdown links whenever the user needs to go somewhere or perform an action.

## Output Format Rules — CRITICAL

You MUST format every response using these XML tags. Never deviate from this format.

1. **<title>** — A short 2-6 word title. Only output this ONCE on your first response in a conversation. If a title already exists, do NOT output again.
2. **<thinking>** — A short high-level reasoning summary (1-4 sentences). Skip if not a reasoning model or if not relevant.
3. **<answer>** — Your final answer to the user. This is the main response content.

### Strict Example:
<title>Product Search Results</title>
<thinking>The user wants to find electronics. I should search the product catalog.</thinking>
<answer>Here are the results for your search...

- **Product A**: $XX.XX from Store Y ⭐ 4.5 (Stock: 20)
- **Product B**: $XX.XX from Store Z ⭐ 3.8 (Stock: 5)

Would you like me to add any of these to your cart?</answer>

### Rules:
- The <thinking> block must always come before <answer> when supported.
- Never merge or hide the blocks.
- Do not repeat <title> after it has already been generated once.
- If you cannot follow this format, output only the final answer without any tags.
- Never output raw code or technical details unless the user explicitly asks.

## Important Rules:
- Be friendly, concise, and helpful. Format responses with clear structure.
- When listing products, use bullet points with price, store name, stock, and ratings.
- Always verify with the user before performing irreversible actions (add to cart, delete, toggle status, etc.).
- If a product isn't found, suggest alternatives or similar items.
- Respect user privacy — never share personal information.
- If asked about something beyond your capabilities, guide the user to the appropriate platform feature.
- The current date can be used for context about orders and promotions.
- When generating content, provide well-structured markdown.
- Use a professional tone for business content like policies and terms.
- Include useful markdown navigation links when they help the user act next. Use internal paths such as [View cart](/cart), [Checkout](/checkout), [My orders](/orders), [Seller orders](/seller/orders), [Seller products](/seller/products), [Admin dashboard](/admin), [Admin products](/admin/products), [AI tools](/admin/ai-tools), and [AI providers](/admin/ai-providers).
- When a tool returns a navigation object or product/order slugs, turn them into clear clickable links in the answer.

You are powered by AI and integrated directly into MarketPlace.`;

export class AIChatService {
  private aiService: AiService;
  private toolRunner: SecureToolRunner;
  private config: AIChatConfig;

  constructor() {
    this.aiService = new AiService();
    this.toolRunner = getToolRunner();
    this.config = this.getDefaultConfig();
  }

  private getDefaultConfig(): AIChatConfig {
    return {
      enabled: true,
      defaultModel: process.env.AI_DEFAULT_MODEL || 'gpt-3.5-turbo',
      defaultProvider: process.env.AI_DEFAULT_PROVIDER || undefined,
      systemPrompt: ENHANCED_SYSTEM_PROMPT,
      maxContextMessages: Number(process.env.AI_MAX_CONTEXT_MESSAGES) || 50,
      temperature: Number(process.env.AI_TEMPERATURE) || 0.7,
      maxTokens: Number(process.env.AI_MAX_TOKENS) || 4096,
      usageLimitDaily: Number(process.env.AI_USAGE_LIMIT_DAILY) || 0,
      usageLimitMonthly: Number(process.env.AI_USAGE_LIMIT_MONTHLY) || 0,
      enableProductSearch: true,
      enableCartOperations: true,
      enableOrderLookup: true,
      enableContentWriting: true,
      enablePageManagement: true,
      enableUserManagement: true,
      enableAnalytics: true,
      enableKnowledgeBase: true,
      enableSellerTools: true,
      enableAdminTools: true,
      enableWishlist: true,
      enablePromotions: true,
      enableReturns: true,
      enableWorkflows: true,
      enablePlugins: true,
      enableNotifications: true,
      enableSupportTickets: true,
    };
  }

  private async loadConfigFromDB(): Promise<void> {
    try {
      const flag = await prisma.featureFlag.findUnique({ where: { key: 'ai.chat' } });
      if (flag) {
        const cfg = JSON.parse(flag.value) as any;
        this.config = { ...this.getDefaultConfig(), ...cfg };
      }
    } catch (error: any) {
      logger.warn('Failed to load AI chat config from DB, using defaults', { error: error.message });
      this.config = this.getDefaultConfig();
    }
  }

  async sendAIMessage(conversationId: string, userId: string, content: string): Promise<{
    message: any;
    usage: any;
    toolResults?: any[];
  }> {
    const conversation = await prisma.chatConversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversation) throw new NotFoundError('Conversation not found');
    if (conversation.userId !== userId) throw new AppError(403, 'Not authorized');

    await prisma.chatMessage.create({ data: { conversationId, role: 'user', content } });
    await this.loadConfigFromDB();

    if (this.config.enabled === false) {
      throw new AppError(503, 'AI chat is currently disabled by the administrator.');
    }

    // Enforce usage limits
    if (this.config.usageLimitDaily && this.config.usageLimitDaily > 0) {
      const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
      const dailyCount = await prisma.chatMessage.count({ where: { conversation: { userId }, role: 'assistant', createdAt: { gte: startOfDay } } });
      if (dailyCount >= this.config.usageLimitDaily) throw new AppError(429, `Daily AI usage limit of ${this.config.usageLimitDaily} messages reached.`);
    }

    if (this.config.usageLimitMonthly && this.config.usageLimitMonthly > 0) {
      const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
      const monthlyCount = await prisma.chatMessage.count({ where: { conversation: { userId }, role: 'assistant', createdAt: { gte: startOfMonth } } });
      if (monthlyCount >= this.config.usageLimitMonthly) throw new AppError(429, `Monthly AI usage limit reached.`);
    }

    const updatedConversation = await prisma.chatConversation.findUnique({
      where: { id: conversationId }, include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId }, select: { id: true, firstName: true, role: true },
    });

    const deterministic = await this.tryHandleDirectCommand(content, userId, user?.role || 'CUSTOMER', updatedConversation!.messages);
    if (deterministic) {
      const aiMessage = await prisma.chatMessage.create({
        data: {
          conversationId,
          role: 'assistant',
          content: deterministic.content,
          model: 'marketplace-command-router',
          tokens: 0,
          toolResults: JSON.stringify(deterministic.toolResults),
        },
      });
      await prisma.chatConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
      if (conversation.messages.length === 0) {
        this.generateChatTitle(content).then(title => {
          prisma.chatConversation.update({ where: { id: conversationId }, data: { title } }).catch(() => {});
        }).catch(() => {});
      }
      return { message: aiMessage, usage: { total_tokens: 0 }, toolResults: deterministic.toolResults };
    }

    let messages = this.buildMessageContext(updatedConversation!.messages, this.config.systemPrompt);

    // Inject user role info for context-aware behavior
    const roleInfo = user?.role ? `[Current user role: ${user.role}. You should respond with tools and capabilities appropriate for this role.]` : '';
    if (roleInfo && messages.length > 0) {
      messages.push({ role: 'system', content: roleInfo });
    }

    const { providerSlug, modelSlug } = await this.resolveProviderAndModel();
    let toolResults: any[] = [];

    try {
const nativeTools = await this.getNativeTools(user?.role || 'CUSTOMER');
       const completion: any = await this.aiService.chatCompletion(providerSlug, modelSlug, messages, {
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        tools: nativeTools,
      });

      if (!completion) throw new AppError(502, 'No response received from AI provider');

      let aiContent = completion.choices?.[0]?.message?.content || completion.content || '';
      const toolCalls = completion.choices?.[0]?.message?.tool_calls;

      // Handle tool calling
      if (toolCalls && toolCalls.length > 0) {
        const toolCallResults: any[] = [];

for (const tc of toolCalls) {
           try {
             const args = JSON.parse(tc.function.arguments);
             const result = await this.toolRunner.run({
               name: tc.function.name,
               arguments: args,
               userId,
               userRole: user?.role || 'CUSTOMER',
             });
             toolCallResults.push({
               role: 'tool',
               tool_call_id: tc.id,
               content: JSON.stringify(result.success ? result.result : { error: result.error }),
             });
             toolResults.push(result);
           } catch (err: any) {
             logger.error('Tool execution failed', { tool: tc.function.name, error: err.message });
             toolCallResults.push({
               role: 'tool',
               tool_call_id: tc.id,
               content: JSON.stringify({ error: err.message }),
             });
           }
        }

        // Make second call to synthesize tool results
        if (toolCallResults.length > 0) {
          const secondMessages = [
            ...messages,
            { role: 'assistant', content: aiContent || null, tool_calls: toolCalls },
            ...toolCallResults,
          ];

          const secondCompletion: any = await this.aiService.chatCompletion(providerSlug, modelSlug, secondMessages, {
            temperature: this.config.temperature,
            max_tokens: this.config.maxTokens,
          });

          if (secondCompletion?.choices?.[0]?.message?.content) {
            aiContent = secondCompletion.choices[0].message.content;
          }
        }
      }

      // Extract and process XML tags
      let extractedTitle = '';
      let extractedThinking = '';
      let cleanContent = aiContent;

      const titleMatch = aiContent.match(/<title>([\s\S]*?)<\/title>/);
      if (titleMatch) { extractedTitle = titleMatch[1].trim(); cleanContent = cleanContent.replace(/<title>[\s\S]*?<\/title>/, ''); }

      const thinkingMatch = aiContent.match(/<thinking>([\s\S]*?)<\/thinking>/);
      if (thinkingMatch) { extractedThinking = thinkingMatch[1].trim(); cleanContent = cleanContent.replace(/<thinking>[\s\S]*?<\/thinking>/, ''); }

      cleanContent = cleanContent.replace(/<\/?answer>/g, '').trim();

      const tokensUsed = completion.usage?.total_tokens || completion.usage?.completion_tokens || 0;

      const aiMessage = await prisma.chatMessage.create({
        data: {
          conversationId, role: 'assistant', content: cleanContent || aiContent,
          model: modelSlug, tokens: tokensUsed,
        },
      });
      // Store thinking in a separate metadata update if needed
      if (extractedThinking) {
        await prisma.chatConversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        }).catch(() => {});
      }

      // Update conversation title
      if (extractedTitle && conversation.messages.length === 0) {
        await prisma.chatConversation.update({ where: { id: conversationId }, data: { title: extractedTitle } }).catch(() => {});
      }
      if (!extractedTitle && conversation.messages.length === 0) {
        this.generateChatTitle(content).then(title => { prisma.chatConversation.update({ where: { id: conversationId }, data: { title } }).catch(() => {}); }).catch(() => {});
      }

      await prisma.chatConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
      return { message: aiMessage, usage: completion.usage, toolResults };

    } catch (error: any) {
      logger.error('AI chat completion failed', { error: error.message, conversationId, providerSlug, modelSlug });
      throw new AppError(502, `AI response failed: ${error.message}`);
    }
  }

  async sendAIStreamMessage(
    conversationId: string,
    userId: string,
    content: string,
    callbacks: StreamCallbacks
  ): Promise<void> {
    const conversation = await prisma.chatConversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversation) throw new NotFoundError('Conversation not found');
    if (conversation.userId !== userId) throw new AppError(403, 'Not authorized');

    await prisma.chatMessage.create({ data: { conversationId, role: 'user', content } });
    await this.loadConfigFromDB();

    if (this.config.enabled === false) {
      callbacks.onError('AI chat is currently disabled by the administrator.');
      return;
    }

    if (this.config.usageLimitDaily && this.config.usageLimitDaily > 0) {
      const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
      const dailyCount = await prisma.chatMessage.count({ where: { conversation: { userId }, role: 'assistant', createdAt: { gte: startOfDay } } });
      if (dailyCount >= this.config.usageLimitDaily) { callbacks.onError(`Daily AI usage limit reached.`); return; }
    }

    const updatedConversation = await prisma.chatConversation.findUnique({
      where: { id: conversationId }, include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId }, select: { id: true, firstName: true, role: true },
    });

    const deterministic = await this.tryHandleDirectCommand(content, userId, user?.role || 'CUSTOMER', updatedConversation!.messages);
    if (deterministic) {
      await prisma.chatMessage.create({
        data: {
          conversationId,
          role: 'assistant',
          content: deterministic.content,
          model: 'marketplace-command-router',
          tokens: 0,
          toolResults: JSON.stringify(deterministic.toolResults),
        },
      });
      callbacks.onContent(deterministic.content);
      callbacks.onDone({ content: deterministic.content, thinking: 'I matched your request to a built-in marketplace action and executed it directly.', model: 'marketplace-command-router', tokens: 0 });
      await prisma.chatConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
      if (conversation.messages.length === 0) {
        this.generateChatTitle(content).then(title => {
          prisma.chatConversation.update({ where: { id: conversationId }, data: { title } }).catch(() => {});
        }).catch(() => {});
      }
      return;
    }

    let messages = this.buildMessageContext(updatedConversation!.messages, this.config.systemPrompt);

    const roleInfo = user?.role ? `[Current user role: ${user.role}. You should respond with tools and capabilities appropriate for this role.]` : '';
    if (roleInfo && messages.length > 0) messages.push({ role: 'system', content: roleInfo });

    const { providerSlug, modelSlug } = await this.resolveProviderAndModel();
const nativeTools = await this.getNativeTools(user?.role || 'CUSTOMER');

     try {
      let fullAiContent = '';
      let fullThinking = '';
      let toolCallsAccumulator: any[] = [];

      await this.aiService.chatCompletionStream(
        providerSlug, modelSlug, messages,
        {
          onThinking: (text: string) => { fullThinking += text; callbacks.onThinking(fullThinking); },
          onContent: (text: string) => { fullAiContent += text; callbacks.onContent(text); },
          onToolCall: (toolCall) => { toolCallsAccumulator.push(toolCall); },
          onDone: async (result) => {
            fullAiContent = result.content;
            fullThinking = result.thinking || fullThinking;

            if (toolCallsAccumulator.length > 0) {
              const toolCallResults: any[] = [];
              const groupedCalls: Record<number, any> = {};
              for (const tc of toolCallsAccumulator) {
                const idx = tc.index || 0;
                if (!groupedCalls[idx]) {
                  groupedCalls[idx] = { id: tc.id, type: 'function', function: { name: '', arguments: '' } };
                }
                if (tc.function?.name) groupedCalls[idx].function.name += tc.function.name;
                if (tc.function?.arguments) groupedCalls[idx].function.arguments += tc.function.arguments;
              }

for (const tc of Object.values(groupedCalls) as any[]) {
                 try {
                   const args = JSON.parse(tc.function.arguments);
                   const toolResult = await this.toolRunner.run({
                     name: tc.function.name,
                     arguments: args,
                     userId,
                     userRole: user?.role || 'CUSTOMER',
                   });
                   toolCallResults.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(toolResult.success ? toolResult.result : { error: toolResult.error }) });
                 } catch (err: any) {
                   toolCallResults.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify({ error: err.message }) });
                 }
               }

              if (toolCallResults.length > 0) {
                const secondMessages = [
                  ...messages,
                  { role: 'assistant', content: fullAiContent || null, tool_calls: Object.values(groupedCalls) as any[] },
                  ...toolCallResults,
                ];

                await this.aiService.chatCompletionStream(providerSlug, modelSlug, secondMessages, {
                  onThinking: (text) => { fullThinking += text; callbacks.onThinking(fullThinking); },
                  onContent: (text) => { fullAiContent += text; callbacks.onContent(text); },
                  onDone: async (finalResult) => {
                    await prisma.chatMessage.create({
                      data: { conversationId, role: 'assistant', content: finalResult.content || fullAiContent, model: modelSlug, tokens: finalResult.tokens || 0 },
                    });
                    callbacks.onDone({ content: finalResult.content || fullAiContent, thinking: finalResult.thinking || fullThinking, model: modelSlug, tokens: finalResult.tokens || 0 });
                    if (conversation.messages.length === 0) {
                      this.generateChatTitle(content).then(title => { prisma.chatConversation.update({ where: { id: conversationId }, data: { title } }).catch(() => {}); }).catch(() => {});
                    }
                    await prisma.chatConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
                  },
                  onError: (error) => { callbacks.onError(error); },
                }, { temperature: this.config.temperature, max_tokens: this.config.maxTokens });
                return;
              }
            }

            // No tool calls - save directly
            await prisma.chatMessage.create({
              data: { conversationId, role: 'assistant', content: fullAiContent, model: modelSlug, tokens: result.tokens || 0 },
            });
            callbacks.onDone({ content: fullAiContent, thinking: fullThinking, model: modelSlug, tokens: result.tokens || 0 });

            if (conversation.messages.length === 0) {
              this.generateChatTitle(content).then(title => { prisma.chatConversation.update({ where: { id: conversationId }, data: { title } }).catch(() => {}); }).catch(() => {});
            }
            await prisma.chatConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
          },
          onError: (error) => { logger.error('AI streaming failed', { error, conversationId }); callbacks.onError(error); },
        },
        {
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          tools: nativeTools.length > 0 ? nativeTools : undefined,
        }
      );
    } catch (error: any) {
      logger.error('AI stream initialization failed', { error: error.message, conversationId });
      callbacks.onError(error.message || 'AI response failed');
    }
  }

private async getNativeTools(userRole: string = 'CUSTOMER'): Promise<any[]> {
     return this.toolRunner.getToolsForRole(userRole, { enabledOnly: true });
   }

  private async tryHandleDirectCommand(content: string, userId: string, userRole: string, history: any[]): Promise<{ content: string; toolResults: any[] } | null> {
    if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole)) return null;

    const text = content.toLowerCase().trim();
    const recentAssistant = [...history].reverse().find((message: any) => message.role === 'assistant')?.content?.toLowerCase?.() || '';
    const wantsExcel = /\b(excel|xlsx|spreadsheet)\b/.test(text);
    const wantsCsv = /\bcsv\b/.test(text);
    const wantsPdf = /\bpdf\b/.test(text);
    const wantsDoc = /\b(doc|document|html)\b/.test(text);
    const reportFormat = wantsPdf ? 'pdf' : wantsCsv ? 'csv' : wantsDoc ? 'html' : 'xlsx';

    const runTool = async (name: string, args: Record<string, any>) => {
      const result = await this.toolRunner.run({ name, arguments: args, userId, userRole });
      return result;
    };

    if (/\b(light mode|light mood|turn on light|turn off dark|disable dark|set.*light)\b/.test(text)) {
      const result = await runTool('set_theme_mode', { mode: 'light' });
      return this.directToolResponse('Theme mode updated', result, 'I turned on global light mode. Open [Admin settings](/admin/config) or [view the storefront](/) to confirm the change.');
    }

    if (/\b(dark mode|turn on dark|set.*dark)\b/.test(text)) {
      const result = await runTool('set_theme_mode', { mode: 'dark' });
      return this.directToolResponse('Theme mode updated', result, 'I turned on global dark mode. Open [Admin settings](/admin/config) or [view the storefront](/) to confirm the change.');
    }

    if ((wantsExcel || wantsCsv || wantsPdf || wantsDoc || /\breport|export|file\b/.test(text)) && /\b(user|users|customer|customers|seller|sellers|admin|admins)\b/.test(text)) {
      const role =
        /\bsellers?\b/.test(text) ? 'SELLER' :
        /\bcustomers?\b/.test(text) ? 'CUSTOMER' :
        /\bsuper admin\b/.test(text) ? 'SUPER_ADMIN' :
        /\badmins?\b/.test(text) ? 'ADMIN' :
        undefined;
      const result = await runTool('generate_users_report', { format: reportFormat, role });
      return this.directReportResponse('Users report generated', result);
    }

    const wantsOrderReport = /\b(order|orders|sales|sell|revenue)\b/.test(text) && (wantsExcel || wantsCsv || wantsPdf || wantsDoc || /\breport|export|file\b/.test(text));
    const yesToOrderReport = /^(yes|yeah|yep|ok|okay|sure|please)$/i.test(content.trim()) && /\borders?\b|\bsales?\b|\breport\b|\bexcel\b/.test(recentAssistant);
    if (wantsOrderReport || yesToOrderReport) {
      const period =
        /\btoday\b/.test(text) ? 'today' :
        /\bweek\b/.test(text) ? 'this_week' :
        /\bmonth\b/.test(text) ? 'this_month' :
        /\byear\b/.test(text) ? 'this_year' :
        'all';
      const result = await runTool('generate_orders_report', { format: reportFormat, period });
      return this.directReportResponse('Orders and sales report generated', result);
    }

    if (/\b(where|appear|display|show).*\b(announcement|promotion|banner|coupon|campaign)\b/.test(text)) {
      const result = await runTool('get_promotion_placements', {});
      return this.directToolResponse('Promotion placements', result, 'I checked the current placement configuration. Use [Announcements](/admin/announcements), [Products](/admin/products), and [System config](/admin/config) to edit the related UI areas.');
    }

    return null;
  }

  private directToolResponse(title: string, result: any, fallback: string) {
    const payload = result.success ? result.result : { success: false, message: result.error || 'Action failed' };
    const message = payload?.message || fallback;
    return {
      content: `**${title}**\n\n${message}\n\n${fallback}`,
      toolResults: [result],
    };
  }

  private directReportResponse(title: string, result: any) {
    const payload = result.success ? result.result : { success: false, message: result.error || 'Report generation failed' };
    if (!payload?.success) {
      return {
        content: `**${title}**\n\n${payload?.message || 'I could not generate the report.'}`,
        toolResults: [result],
      };
    }
    const fileUrl = payload.file?.downloadUrl || payload.file?.url;
    return {
      content: `**${title}**\n\n${payload.message}.\n\n[Download ${payload.file?.format?.toUpperCase() || 'report'} report](${fileUrl})\n\nYou can also review the source data from [Admin dashboard](/admin)${payload.navigation?.adminUsers ? ' or [Admin users](/admin/users)' : ''}${payload.navigation?.adminOrders ? ' or [Admin orders](/admin/orders)' : ''}.`,
      toolResults: [result],
    };
  }

  private buildMessageContext(history: any[], systemPrompt?: string): any[] {
    const messages: any[] = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });

    const startIdx = Math.max(0, history.length - (this.config.maxContextMessages || 50));
    for (let i = startIdx; i < history.length; i++) {
      const msg = history[i];
      messages.push({ role: msg.role, content: msg.content });
    }
    return messages;
  }

  private async resolveProviderAndModel(): Promise<{ providerSlug: string; modelSlug: string }> {
    const enabledProviders = await prisma.aiProvider.findMany({
      where: { isEnabled: true },
      include: { aiModels: { where: { isActive: true } } },
    });

    if (enabledProviders.length === 0) {
      throw new AppError(503, 'No AI providers configured. Please add an AI provider in admin panel.');
    }

    const providerSlug = this.config.defaultProvider || enabledProviders[0].slug;
    const provider = enabledProviders.find(p => p.slug === providerSlug) || enabledProviders[0];

    const activeModels = provider.aiModels.filter((m: any) => m.isActive);
    const modelSlug = this.config.defaultModel || (activeModels.length > 0 ? activeModels[0].slug : null);

    if (!modelSlug) {
      throw new AppError(503, `No active models found for provider "${provider.name}". Please activate a model in AI settings.`);
    }

    return { providerSlug: provider.slug, modelSlug };
  }

  async generateChatTitle(firstMessage: string): Promise<string> {
    try {
      await this.loadConfigFromDB();
      const { providerSlug, modelSlug } = await this.resolveProviderAndModel();
      const completion: any = await this.aiService.chatCompletion(providerSlug, modelSlug, [
        { role: 'system', content: 'Generate a very short title (3-5 words) for this conversation based on the first message. Return only the title.' },
        { role: 'user', content: firstMessage },
      ], { temperature: 0.3, max_tokens: 20 });

      const title = (completion.choices?.[0]?.message?.content || completion.content || 'New Conversation').trim();
      return title.length > 50 ? title.slice(0, 50).trim() + '...' : title;
    } catch (error: any) {
      logger.error('Failed to generate chat title', { error: error.message });
      return 'New Conversation';
    }
  }
}
