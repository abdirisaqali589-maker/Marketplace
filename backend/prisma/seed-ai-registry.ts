import { prisma } from '../src/common/prisma';

async function main() {
  console.log('🌱 Seeding AI Capability Registry...');

  // ── Built-in Customer Tools ──
  const customerTools = [
    {
      name: 'search_products',
      description: 'Search for products on the marketplace by title or description. Returns price, store, rating, stock, and image.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query for product title or description' },
          limit: { type: 'number', description: 'Max results (default 5, max 20)', default: 5 },
        },
        required: ['query'],
      },
      roles: JSON.stringify(['CUSTOMER', 'SELLER', 'ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'low',
      enabled: true,
    },
    {
      name: 'get_product',
      description: 'Get detailed information about a specific product including variants, images, store info, and questions/answers.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          slug: { type: 'string', description: 'The product slug (URL-friendly identifier)' },
        },
        required: ['slug'],
      },
      roles: JSON.stringify(['CUSTOMER', 'SELLER', 'ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'low',
      enabled: true,
    },
    {
      name: 'list_categories',
      description: 'List all product categories with their subcategories available on the marketplace.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: { type: 'object', properties: {} },
      roles: JSON.stringify(['CUSTOMER', 'SELLER', 'ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'low',
      enabled: true,
    },
    {
      name: 'get_cart',
      description: 'View the current user shopping cart contents with item details, quantities, and totals.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: { type: 'object', properties: {} },
      roles: JSON.stringify(['CUSTOMER']),
      riskLevel: 'low',
      enabled: true,
    },
    {
      name: 'add_to_cart',
      description: 'Add a product to the user shopping cart. Automatically checks stock availability.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          productId: { type: 'string', description: 'The product ID to add' },
          variantId: { type: 'string', description: 'Optional variant ID (size/color/etc)' },
          quantity: { type: 'number', description: 'Quantity to add (default 1)', default: 1 },
        },
        required: ['productId'],
      },
      roles: JSON.stringify(['CUSTOMER']),
      riskLevel: 'medium',
      requiresConfirmation: true,
      enabled: true,
    },
    {
      name: 'remove_from_cart',
      description: 'Remove an item from the user shopping cart by its cart item ID.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          itemId: { type: 'string', description: 'The cart item ID to remove' },
        },
        required: ['itemId'],
      },
      roles: JSON.stringify(['CUSTOMER']),
      riskLevel: 'low',
      enabled: true,
    },
    {
      name: 'update_cart_item',
      description: 'Update the quantity of an item in the cart.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          itemId: { type: 'string', description: 'The cart item ID' },
          quantity: { type: 'number', description: 'New quantity (must be at least 1)', minimum: 1 },
        },
        required: ['itemId', 'quantity'],
      },
      roles: JSON.stringify(['CUSTOMER']),
      riskLevel: 'low',
      enabled: true,
    },
    {
      name: 'clear_cart',
      description: 'Remove all items from the user shopping cart.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: { type: 'object', properties: {} },
      roles: JSON.stringify(['CUSTOMER']),
      riskLevel: 'high',
      requiresConfirmation: true,
      enabled: true,
    },
    {
      name: 'get_wishlist',
      description: 'View the current user wishlist items with product details.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: { type: 'object', properties: {} },
      roles: JSON.stringify(['CUSTOMER']),
      riskLevel: 'low',
      enabled: true,
    },
    {
      name: 'add_to_wishlist',
      description: 'Add a product to the user wishlist for later reference.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          productId: { type: 'string', description: 'The product ID to add to wishlist' },
        },
        required: ['productId'],
      },
      roles: JSON.stringify(['CUSTOMER']),
      riskLevel: 'low',
      enabled: true,
    },
    {
      name: 'remove_from_wishlist',
      description: 'Remove a product from the user wishlist.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          productId: { type: 'string', description: 'The product ID to remove from wishlist' },
        },
        required: ['productId'],
      },
      roles: JSON.stringify(['CUSTOMER']),
      riskLevel: 'low',
      enabled: true,
    },
    {
      name: 'get_orders',
      description: 'View the current user order history with status, payment info, and shipping details.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Max orders to return (default 5)', default: 5 },
          status: { type: 'string', description: 'Filter by status: PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED', enum: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] },
        },
      },
      roles: JSON.stringify(['CUSTOMER']),
      riskLevel: 'low',
      enabled: true,
    },
    {
      name: 'get_order_detail',
      description: 'Get detailed information about a specific order.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          orderId: { type: 'string', description: 'The order ID' },
        },
        required: ['orderId'],
      },
      roles: JSON.stringify(['CUSTOMER']),
      riskLevel: 'low',
      enabled: true,
    },
    {
      name: 'get_featured',
      description: 'Get featured/promoted products for recommendations.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: { type: 'object', properties: {} },
      roles: JSON.stringify(['CUSTOMER', 'SELLER', 'ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'low',
      enabled: true,
    },
    {
      name: 'get_platform_stats',
      description: 'Get general marketplace statistics (product count, seller count, categories, brands, orders).',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: { type: 'object', properties: {} },
      roles: JSON.stringify(['CUSTOMER', 'SELLER', 'ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'low',
      enabled: true,
    },
    {
      name: 'get_navigation_links',
      description: 'Get role-aware internal navigation links that the assistant can include as clickable markdown links.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          role: { type: 'string', enum: ['CUSTOMER', 'SELLER', 'ADMIN', 'SUPER_ADMIN'] },
        },
      },
      roles: JSON.stringify(['CUSTOMER', 'SELLER', 'ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'low',
      enabled: true,
    },
    {
      name: 'list_shipping_methods',
      description: 'List all available shipping methods with pricing and estimated delivery times.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: { type: 'object', properties: {} },
      roles: JSON.stringify(['CUSTOMER', 'SELLER']),
      riskLevel: 'low',
      enabled: true,
    },
    {
      name: 'list_coupons',
      description: 'List all promotional coupons.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: { type: 'object', properties: {} },
      roles: JSON.stringify(['CUSTOMER', 'SELLER', 'ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'low',
      enabled: true,
    },
  ];

  // ── Built-in Seller Tools ──
  const sellerTools = [
    {
      name: 'get_seller_profile',
      description: 'Get the seller profile including store info, KYC status, rating, and product/order counts.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: { type: 'object', properties: {} },
      roles: JSON.stringify(['SELLER']),
      riskLevel: 'low',
      enabled: true,
    },
    {
      name: 'update_seller_profile',
      description: 'Update the seller profile information like store name, description, phone, address, logo, banner.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          storeName: { type: 'string' },
          description: { type: 'string' },
          phone: { type: 'string' },
          address: { type: 'string' },
          logo: { type: 'string' },
          banner: { type: 'string' },
        },
      },
      roles: JSON.stringify(['SELLER']),
      riskLevel: 'medium',
      requiresConfirmation: true,
      enabled: true,
    },
    {
      name: 'get_seller_products',
      description: 'Get the seller own products with pagination, search, and status filter.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'INACTIVE'] },
          limit: { type: 'number', default: 20 },
          page: { type: 'number', default: 1 },
        },
      },
      roles: JSON.stringify(['SELLER']),
      riskLevel: 'low',
      enabled: true,
    },
    {
      name: 'create_product',
      description: 'Create a new product listing as DRAFT. The product will need to be activated after creation.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'number' },
          discountPrice: { type: 'number' },
          currency: { type: 'string', default: 'TZS' },
          stock: { type: 'number' },
          sku: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          categoryId: { type: 'string' },
          brandId: { type: 'string' },
          minOrder: { type: 'number' },
          weight: { type: 'number' },
          weightUnit: { type: 'string', enum: ['kg', 'g', 'lb'] },
        },
        required: ['title', 'price'],
      },
      roles: JSON.stringify(['SELLER']),
      riskLevel: 'high',
      requiresConfirmation: true,
      enabled: true,
    },
    {
      name: 'update_product',
      description: 'Update an existing product listing.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          productId: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'number' },
          discountPrice: { type: 'number' },
          stock: { type: 'number' },
          sku: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          categoryId: { type: 'string' },
          brandId: { type: 'string' },
          isActive: { type: 'boolean' },
          status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'INACTIVE'] },
        },
        required: ['productId'],
      },
      roles: JSON.stringify(['SELLER']),
      riskLevel: 'high',
      requiresConfirmation: true,
      enabled: true,
    },
    {
      name: 'get_seller_orders',
      description: 'Get orders received by the seller.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          limit: { type: 'number', default: 10 },
          page: { type: 'number', default: 1 },
        },
      },
      roles: JSON.stringify(['SELLER']),
      riskLevel: 'low',
      enabled: true,
    },
    {
      name: 'update_order_status',
      description: 'Update the status of an order. Follows valid status transitions.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          orderId: { type: 'string' },
          status: { type: 'string', enum: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] },
        },
        required: ['orderId', 'status'],
      },
      roles: JSON.stringify(['SELLER']),
      riskLevel: 'high',
      requiresConfirmation: true,
      enabled: true,
    },
    {
      name: 'get_seller_analytics',
      description: 'Get seller analytics including total orders, revenue, products, and items sold.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          period: { type: 'string', enum: ['today', 'this_week', 'this_month', 'this_year'], default: 'this_month' },
        },
      },
      roles: JSON.stringify(['SELLER']),
      riskLevel: 'low',
      enabled: true,
    },
    {
      name: 'submit_kyc',
      description: 'Submit KYC documents for seller verification.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          documents: { type: 'array', items: { type: 'string' } },
          businessLicense: { type: 'string' },
          taxId: { type: 'string' },
          idDocument: { type: 'string' },
          addressProof: { type: 'string' },
        },
      },
      roles: JSON.stringify(['SELLER']),
      riskLevel: 'medium',
      requiresConfirmation: true,
      enabled: true,
    },
    {
      name: 'get_seller_payouts',
      description: 'View seller payout history.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: { type: 'object', properties: {} },
      roles: JSON.stringify(['SELLER']),
      riskLevel: 'low',
      enabled: true,
    },
  ];

  // ── Built-in Admin Tools ──
  const adminTools = [
    {
      name: 'get_admin_dashboard',
      description: 'Get the admin dashboard overview with key metrics.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: { type: 'object', properties: {} },
      roles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'low',
      enabled: true,
    },
    {
      name: 'list_orders',
      description: 'Search and list marketplace orders with customer, seller, item, payment, and status details.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Search order number, customer email, or seller store name' },
          status: { type: 'string', description: 'Filter by order status' },
          limit: { type: 'number', default: 20 },
          page: { type: 'number', default: 1 },
        },
      },
      roles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'low',
      enabled: true,
    },
    {
      name: 'list_users',
      description: 'Search and list platform users.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          search: { type: 'string' },
          role: { type: 'string', enum: ['CUSTOMER', 'SELLER', 'ADMIN'] },
          limit: { type: 'number', default: 20 },
          page: { type: 'number', default: 1 },
        },
      },
      roles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'low',
      enabled: true,
    },
    {
      name: 'toggle_user_status',
      description: 'Activate or deactivate a user account.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
        },
        required: ['userId'],
      },
      roles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'high',
      requiresConfirmation: true,
      enabled: true,
    },
    {
      name: 'verify_seller',
      description: 'Approve and verify a seller KYC application.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          sellerId: { type: 'string' },
        },
        required: ['sellerId'],
      },
      roles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'medium',
      requiresConfirmation: true,
      enabled: true,
    },
    {
      name: 'reject_seller',
      description: 'Reject a seller KYC application.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          sellerId: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['sellerId'],
      },
      roles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'medium',
      enabled: true,
    },
    {
      name: 'list_roles',
      description: 'List all admin roles.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: { type: 'object', properties: {} },
      roles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'low',
      enabled: true,
    },
    {
      name: 'create_role',
      description: 'Create a new admin role.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          permissions: { type: 'array', items: { type: 'string' } },
        },
        required: ['name'],
      },
      roles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'high',
      requiresConfirmation: true,
      enabled: true,
    },
    {
      name: 'delete_role',
      description: 'Delete an admin role.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          roleId: { type: 'string' },
        },
        required: ['roleId'],
      },
      roles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'critical',
      requiresConfirmation: true,
      enabled: true,
    },
    {
      name: 'get_config',
      description: 'Get platform configuration settings.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: { type: 'object', properties: {} },
      roles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'low',
      enabled: true,
    },
    {
      name: 'update_config',
      description: 'Update a platform configuration setting.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          value: { type: 'string' },
        },
        required: ['key', 'value'],
      },
      roles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'high',
      requiresConfirmation: true,
      enabled: true,
    },
    {
      name: 'get_themes',
      description: 'List available themes.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: { type: 'object', properties: {} },
      roles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'low',
      enabled: true,
    },
    {
      name: 'set_theme',
      description: 'Change the active theme.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          theme: { type: 'string' },
        },
        required: ['theme'],
      },
      roles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'medium',
      enabled: true,
    },
    {
      name: 'set_theme_mode',
      description: 'Set global storefront theme mode to light, dark, system, or user preference. Use this when admins ask to turn dark mode on/off.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          mode: { type: 'string', enum: ['light', 'dark', 'system', 'user'] },
        },
        required: ['mode'],
      },
      roles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'medium',
      requiresConfirmation: true,
      enabled: true,
    },
    {
      name: 'get_promotion_placements',
      description: 'Explain where announcements, homepage banners, campaigns, coupons, and featured products appear in the UI with admin links.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: { type: 'object', properties: {} },
      roles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'low',
      enabled: true,
    },
    {
      name: 'list_pages',
      description: 'Search through all platform content.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: { type: 'object', properties: {} },
      roles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'low',
      enabled: true,
    },
    {
      name: 'update_page',
      description: 'Create or update a platform page.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          content: { type: 'object' },
        },
        required: ['key', 'content'],
      },
      roles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'high',
      requiresConfirmation: true,
      enabled: true,
    },
    {
      name: 'generate_content',
      description: 'Generate content templates for pages.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          pageType: { type: 'string', enum: ['about_us', 'privacy_policy', 'terms_of_service', 'return_policy', 'shipping_policy', 'faq', 'blog_post', 'landing_page', 'product_description', 'email_template'] },
          tone: { type: 'string' },
          context: { type: 'string' },
          sections: { type: 'array', items: { type: 'string' } },
        },
        required: ['pageType'],
      },
      roles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'low',
      enabled: true,
    },
    {
      name: 'list_plugins',
      description: 'List all installed plugins.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: { type: 'object', properties: {} },
      roles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'low',
      enabled: true,
    },
    {
      name: 'toggle_plugin',
      description: 'Enable or disable a plugin.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          pluginId: { type: 'string' },
          enabled: { type: 'boolean' },
        },
        required: ['pluginId', 'enabled'],
      },
      roles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'high',
      requiresConfirmation: true,
      enabled: true,
    },
    {
      name: 'list_announcements',
      description: 'List all platform announcements.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: { type: 'object', properties: {} },
      roles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'low',
      enabled: true,
    },
    {
      name: 'create_announcement',
      description: 'Create a new platform announcement.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
          type: { type: 'string', enum: ['info', 'warning', 'success', 'danger'] },
          expiresAt: { type: 'string' },
        },
        required: ['title', 'content'],
      },
      roles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'medium',
      requiresConfirmation: true,
      enabled: true,
    },
    {
      name: 'update_announcement',
      description: 'Update an existing platform announcement title, body, active status, type, or schedule.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          announcementId: { type: 'string' },
          title: { type: 'string' },
          body: { type: 'string' },
          content: { type: 'string' },
          type: { type: 'string' },
          isActive: { type: 'boolean' },
          startsAt: { type: 'string' },
          expiresAt: { type: 'string' },
        },
        required: ['announcementId'],
      },
      roles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'medium',
      requiresConfirmation: true,
      enabled: true,
    },
    {
      name: 'toggle_announcement',
      description: 'Enable or disable an existing platform announcement.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          announcementId: { type: 'string' },
        },
        required: ['announcementId'],
      },
      roles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'medium',
      requiresConfirmation: true,
      enabled: true,
    },
    {
      name: 'get_analytics_summary',
      description: 'Get detailed platform analytics.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          period: { type: 'string', enum: ['today', 'this_week', 'this_month', 'this_year', 'all'] },
        },
      },
      roles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'low',
      enabled: true,
    },
    {
      name: 'generate_orders_report',
      description: 'Generate a downloadable orders and sales report as XLSX, CSV, DOC/HTML, or PDF and return a download link.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['xlsx', 'csv', 'doc', 'html', 'pdf'], default: 'xlsx' },
          period: { type: 'string', enum: ['today', 'this_week', 'this_month', 'this_year', 'all'], default: 'all' },
          status: { type: 'string' },
        },
      },
      roles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'low',
      enabled: true,
    },
    {
      name: 'generate_users_report',
      description: 'Generate a downloadable user detail report as XLSX, CSV, DOC/HTML, or PDF and return a download link.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['xlsx', 'csv', 'doc', 'html', 'pdf'], default: 'xlsx' },
          role: { type: 'string', enum: ['CUSTOMER', 'SELLER', 'ADMIN', 'SUPER_ADMIN'] },
        },
      },
      roles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'low',
      enabled: true,
    },
    {
      name: 'get_audit_logs',
      description: 'View all admin actions and platform events.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          action: { type: 'string' },
          entity: { type: 'string' },
          limit: { type: 'number', default: 20 },
          page: { type: 'number', default: 1 },
        },
      },
      roles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'low',
      enabled: true,
    },
    {
      name: 'send_notification',
      description: 'Send a notification to a specific user.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          title: { type: 'string' },
          message: { type: 'string' },
          type: { type: 'string', enum: ['info', 'warning', 'success', 'error'] },
        },
        required: ['userId', 'title', 'message'],
      },
      roles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'medium',
      enabled: true,
    },
    {
      name: 'get_return_requests',
      description: 'List all return/refund requests.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: { type: 'object', properties: {} },
      roles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'low',
      enabled: true,
    },
    {
      name: 'process_return',
      description: 'Approve or reject a return/refund request.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          returnId: { type: 'string' },
          action: { type: 'string', enum: ['approve', 'reject'] },
          reason: { type: 'string' },
        },
        required: ['returnId', 'action'],
      },
      roles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'high',
      requiresConfirmation: true,
      enabled: true,
    },
    {
      name: 'get_workflows',
      description: 'List all automation workflow templates.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: { type: 'object', properties: {} },
      roles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'low',
      enabled: true,
    },
    {
      name: 'toggle_workflow',
      description: 'Enable or disable an automation workflow.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          workflowId: { type: 'string' },
        },
        required: ['workflowId'],
      },
      roles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'medium',
      enabled: true,
    },
    {
      name: 'create_workflow',
      description: 'Create a new automation workflow template.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          slug: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
        },
        required: ['name', 'slug'],
      },
      roles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'high',
      requiresConfirmation: true,
      enabled: true,
    },
    {
      name: 'get_tickets',
      description: 'List support tickets.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: { type: 'object', properties: {} },
      roles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'low',
      enabled: true,
    },
    {
      name: 'update_ticket_status',
      description: 'Update a support ticket status.',
      category: 'builtin',
      handlerType: 'builtin',
      jsonSchema: {
        type: 'object',
        properties: {
          ticketId: { type: 'string' },
          status: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] },
        },
        required: ['ticketId', 'status'],
      },
      roles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      riskLevel: 'medium',
      enabled: true,
    },
  ];

  // ── Create all tools ──
  let totalCreated = 0;
  let totalSkipped = 0;

  for (const tool of [...customerTools, ...sellerTools, ...adminTools]) {
    try {
      await prisma.aiTool.upsert({
        where: { name: tool.name },
        update: {
          description: tool.description,
          category: tool.category,
          handlerType: tool.handlerType,
          jsonSchema: tool.jsonSchema ? JSON.stringify(tool.jsonSchema) : null,
          roles: tool.roles,
          riskLevel: tool.riskLevel,
          requiresConfirmation: tool.requiresConfirmation ?? false,
          enabled: tool.enabled,
          updatedAt: new Date(),
        },
        create: {
          name: tool.name,
          description: tool.description,
          category: tool.category,
          handlerType: tool.handlerType,
          jsonSchema: tool.jsonSchema ? JSON.stringify(tool.jsonSchema) : null,
          roles: tool.roles,
          riskLevel: tool.riskLevel,
          requiresConfirmation: tool.requiresConfirmation ?? false,
          enabled: tool.enabled,
        },
      });
      totalCreated++;
    } catch (error: any) {
      console.warn(`  ⚠ Skipped "${tool.name}": ${error.message}`);
      totalSkipped++;
    }
  }

  // ── Create default role permissions ──
  const allTools = await prisma.aiTool.findMany({ select: { id: true, name: true } });
  const adminOnlyTools = adminTools.map(t => t.name);
  const sellerOnlyTools = sellerTools.map(t => t.name);
  const customerOnlyTools = customerTools
    .filter(t => !['get_platform_stats', 'list_categories', 'list_shipping_methods', 'list_coupons', 'get_featured'].includes(t.name))
    .map(t => t.name);

  // Grant DEFAULT role execute permission on all tools
  for (const tool of allTools) {
    await prisma.aiToolPermission.upsert({
      where: { toolId_role: { toolId: tool.id, role: 'DEFAULT' } },
      update: { canExecute: true, canApprove: false },
      create: { toolId: tool.id, role: 'DEFAULT', canExecute: true, canApprove: false },
    });
  }

  // Grant CUSTOMER role
  for (const tool of allTools) {
    const canExecute = customerOnlyTools.includes(tool.name) ||
      ['get_platform_stats', 'list_categories', 'list_shipping_methods', 'list_coupons', 'get_featured'].includes(tool.name);
    await prisma.aiToolPermission.upsert({
      where: { toolId_role: { toolId: tool.id, role: 'CUSTOMER' } },
      update: { canExecute },
      create: { toolId: tool.id, role: 'CUSTOMER', canExecute, canApprove: false },
    });
  }

  // Grant SELLER role
  for (const tool of allTools) {
    const canExecute = sellerOnlyTools.includes(tool.name) ||
      customerOnlyTools.includes(tool.name) ||
      ['get_platform_stats', 'list_categories'].includes(tool.name);
    await prisma.aiToolPermission.upsert({
      where: { toolId_role: { toolId: tool.id, role: 'SELLER' } },
      update: { canExecute },
      create: { toolId: tool.id, role: 'SELLER', canExecute, canApprove: false },
    });
  }

  // Grant ADMIN role - full access with approval on critical tools
  for (const tool of allTools) {
    const isCritical = adminOnlyTools.includes(tool.name) && ['delete_role', 'toggle_user_status'].includes(tool.name);
    await prisma.aiToolPermission.upsert({
      where: { toolId_role: { toolId: tool.id, role: 'ADMIN' } },
      update: { canExecute: true, canApprove: isCritical },
      create: { toolId: tool.id, role: 'ADMIN', canExecute: true, canApprove: isCritical },
    });
  }

  // Grant SUPER_ADMIN role - full access with approval on all
  for (const tool of allTools) {
    await prisma.aiToolPermission.upsert({
      where: { toolId_role: { toolId: tool.id, role: 'SUPER_ADMIN' } },
      update: { canExecute: true, canApprove: true },
      create: { toolId: tool.id, role: 'SUPER_ADMIN', canExecute: true, canApprove: true },
    });
  }

  // ── Create default AI prompt profile ──
  await prisma.aiPromptProfile.upsert({
    where: { name: 'default_customer' },
    update: {},
    create: {
      name: 'default_customer',
      description: 'Default prompt profile for customer interactions',
      systemPrompt: 'You are a helpful AI assistant for a marketplace. Focus on product discovery, order tracking, and customer support. Be concise and friendly.',
      roles: JSON.stringify(['CUSTOMER']),
      isActive: true,
    },
  });

  await prisma.aiPromptProfile.upsert({
    where: { name: 'default_seller' },
    update: {},
    create: {
      name: 'default_seller',
      description: 'Default prompt profile for seller interactions',
      systemPrompt: 'You are a business-focused AI assistant for marketplace sellers. Help with store analytics, product management, order fulfillment, and seller policies.',
      roles: JSON.stringify(['SELLER']),
      isActive: true,
    },
  });

  await prisma.aiPromptProfile.upsert({
    where: { name: 'default_admin' },
    update: {},
    create: {
      name: 'default_admin',
      description: 'Default prompt profile for admin interactions',
      systemPrompt: 'You are an administrative AI assistant for the marketplace platform. Help with platform management, user administration, configuration, and moderation.',
      roles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      isActive: true,
    },
  });

  // ── Create default agent profile ──
  await prisma.aiAgentProfile.upsert({
    where: { name: 'default_customer_agent' },
    update: {},
    create: {
      name: 'default_customer_agent',
      description: 'Standard customer-facing agent profile',
      systemPrompt: 'You are a helpful AI assistant for a multi-vendor e-commerce marketplace.',
      allowedRoles: JSON.stringify(['CUSTOMER', 'SELLER', 'ADMIN', 'SUPER_ADMIN']),
      maxTokens: 4096,
      temperature: 0.7,
      requireApproval: false,
      isActive: true,
    },
  });

  await prisma.aiAgentProfile.upsert({
    where: { name: 'high_risk_admin_agent' },
    update: {},
    create: {
      name: 'high_risk_admin_agent',
      description: 'Admin agent with approval requirements for sensitive actions',
      systemPrompt: 'You are an admin AI assistant. All high-risk actions require explicit approval before execution.',
      allowedRoles: JSON.stringify(['ADMIN', 'SUPER_ADMIN']),
      maxTokens: 4096,
      temperature: 0.3,
      requireApproval: true,
      isActive: true,
    },
  });

  console.log(`✅ Seeded: ${totalCreated} tools, ${totalSkipped} skipped`);
  console.log('✅ Default prompt profiles and agent profiles created');
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
