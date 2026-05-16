import { Router } from 'express';
import { prisma } from '../../common/prisma';
import { config } from '../../common/config';

interface OpenApiSchema {
  openapi: string;
  info: { title: string; version: string; description: string };
  servers: { url: string; description: string }[];
  paths: Record<string, any>;
  components: {
    schemas: Record<string, any>;
    securitySchemes: Record<string, any>;
  };
  tags: { name: string; description: string }[];
}

const modelSchemas: Record<string, any> = {
  User: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      email: { type: 'string', format: 'email', nullable: true },
      phone: { type: 'string', nullable: true },
      firstName: { type: 'string', nullable: true },
      lastName: { type: 'string', nullable: true },
      role: { type: 'string', enum: ['CUSTOMER', 'SELLER', 'ADMIN', 'SUPER_ADMIN'] },
      isVerified: { type: 'boolean' },
      isActive: { type: 'boolean' },
      kycStatus: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  Product: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      sellerId: { type: 'string', format: 'uuid' },
      categoryId: { type: 'string', format: 'uuid', nullable: true },
      brandId: { type: 'string', format: 'uuid', nullable: true },
      title: { type: 'string' },
      slug: { type: 'string' },
      description: { type: 'string' },
      basePrice: { type: 'number' },
      discountPrice: { type: 'number', nullable: true },
      currency: { type: 'string' },
      status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'] },
      isActive: { type: 'boolean' },
      isFeatured: { type: 'boolean' },
      rating: { type: 'number' },
      reviewCount: { type: 'integer' },
      images: { type: 'array', items: { $ref: '#/components/schemas/ProductImage' } },
      variants: { type: 'array', items: { $ref: '#/components/schemas/ProductVariant' } },
    },
  },
  ProductImage: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      url: { type: 'string', format: 'uri' },
      alt: { type: 'string', nullable: true },
      sortOrder: { type: 'integer' },
      isPrimary: { type: 'boolean' },
    },
  },
  ProductVariant: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      sku: { type: 'string' },
      price: { type: 'number' },
      stock: { type: 'integer' },
      isActive: { type: 'boolean' },
    },
  },
  Order: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      orderNumber: { type: 'string' },
      userId: { type: 'string', format: 'uuid' },
      sellerId: { type: 'string', format: 'uuid' },
      status: { type: 'string' },
      subtotal: { type: 'number' },
      shippingFee: { type: 'number' },
      taxAmount: { type: 'number' },
      discountAmount: { type: 'number' },
      totalAmount: { type: 'number' },
      paymentMethod: { type: 'string', nullable: true },
      paymentStatus: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
      items: { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
    },
  },
  OrderItem: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      productId: { type: 'string', format: 'uuid' },
      quantity: { type: 'integer' },
      unitPrice: { type: 'number' },
      totalPrice: { type: 'number' },
    },
  },
  Cart: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      userId: { type: 'string', format: 'uuid' },
      items: { type: 'array', items: { $ref: '#/components/schemas/CartItem' } },
    },
  },
  CartItem: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      productId: { type: 'string', format: 'uuid' },
      variantId: { type: 'string', format: 'uuid', nullable: true },
      quantity: { type: 'integer' },
    },
  },
  Payment: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      orderId: { type: 'string', format: 'uuid' },
      method: { type: 'string' },
      provider: { type: 'string', nullable: true },
      transactionId: { type: 'string', nullable: true },
      amount: { type: 'number' },
      currency: { type: 'string' },
      status: { type: 'string' },
      paidAt: { type: 'string', format: 'date-time', nullable: true },
    },
  },
  Review: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      userId: { type: 'string', format: 'uuid' },
      productId: { type: 'string', format: 'uuid' },
      rating: { type: 'integer', minimum: 1, maximum: 5 },
      title: { type: 'string', nullable: true },
      text: { type: 'string', nullable: true },
      isApproved: { type: 'boolean' },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  Category: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      slug: { type: 'string' },
      description: { type: 'string', nullable: true },
      parentId: { type: 'string', format: 'uuid', nullable: true },
      level: { type: 'integer' },
      isActive: { type: 'boolean' },
    },
  },
  Brand: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      slug: { type: 'string' },
      logo: { type: 'string', nullable: true },
      isApproved: { type: 'boolean' },
    },
  },
  CouponRule: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      code: { type: 'string' },
      type: { type: 'string', enum: ['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING'] },
      value: { type: 'number' },
      minSpend: { type: 'number' },
      isActive: { type: 'boolean' },
      expiresAt: { type: 'string', format: 'date-time', nullable: true },
    },
  },
  Seller: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      userId: { type: 'string', format: 'uuid' },
      storeName: { type: 'string' },
      storeSlug: { type: 'string' },
      storeDescription: { type: 'string', nullable: true },
      rating: { type: 'number' },
      isVerified: { type: 'boolean' },
      isActive: { type: 'boolean' },
    },
  },
  ApiKey: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      key: { type: 'string' },
      isActive: { type: 'boolean' },
      expiresAt: { type: 'string', format: 'date-time', nullable: true },
      lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
    },
  },
  GiftCard: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      code: { type: 'string' },
      amount: { type: 'number' },
      balance: { type: 'number' },
      isActive: { type: 'boolean' },
      expiresAt: { type: 'string', format: 'date-time', nullable: true },
    },
  },
  Notification: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      userId: { type: 'string', format: 'uuid' },
      type: { type: 'string' },
      title: { type: 'string' },
      body: { type: 'string', nullable: true },
      isRead: { type: 'boolean' },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  Announcement: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      title: { type: 'string' },
      body: { type: 'string' },
      type: { type: 'string', enum: ['INFO', 'WARNING', 'PROMOTION', 'MAINTENANCE'] },
      isActive: { type: 'boolean' },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  SupportTicket: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      userId: { type: 'string', format: 'uuid' },
      subject: { type: 'string' },
      priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
      status: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  BlogPost: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      title: { type: 'string' },
      slug: { type: 'string' },
      excerpt: { type: 'string', nullable: true },
      content: { type: 'string' },
      coverImage: { type: 'string', nullable: true },
      status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] },
      publishedAt: { type: 'string', format: 'date-time', nullable: true },
    },
  },
  Plugin: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      slug: { type: 'string' },
      description: { type: 'string', nullable: true },
      version: { type: 'string' },
      isEnabled: { type: 'boolean' },
      isSystem: { type: 'boolean' },
    },
  },
  AiProvider: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      slug: { type: 'string' },
      provider: { type: 'string' },
      baseUrl: { type: 'string', nullable: true },
      isEnabled: { type: 'boolean' },
      models: { type: 'array', items: { $ref: '#/components/schemas/AiModel' } },
    },
  },
  AiModel: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      slug: { type: 'string' },
      capabilities: { type: 'array', items: { type: 'string' } },
      contextLength: { type: 'integer' },
      isActive: { type: 'boolean' },
    },
  },
  WorkflowTemplate: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      slug: { type: 'string' },
      category: { type: 'string' },
      isEnabled: { type: 'boolean' },
    },
  },
  ChatConversation: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      userId: { type: 'string', format: 'uuid', nullable: true },
      title: { type: 'string', nullable: true },
      status: { type: 'string' },
      messages: { type: 'array', items: { $ref: '#/components/schemas/ChatMessage' } },
    },
  },
  ChatMessage: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      role: { type: 'string', enum: ['user', 'assistant', 'system', 'tool'] },
      content: { type: 'string' },
      tokens: { type: 'integer', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  ErrorResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string' },
      errors: { type: 'array', items: { type: 'string' }, nullable: true },
    },
  },
  SuccessResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: { type: 'object' },
      message: { type: 'string', nullable: true },
    },
  },
  PaginatedResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: { type: 'array', items: { type: 'object' } },
      pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
    },
  },
};

const pathDefinitions: Record<string, Record<string, any>> = {
  '/api/auth/register': {
    post: {
      tags: ['Authentication'],
      summary: 'Register a new user',
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, phone: { type: 'string' }, password: { type: 'string', minLength: 8 }, firstName: { type: 'string' }, lastName: { type: 'string' } }, required: ['password'] } } } },
      responses: { 201: { description: 'User registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } }, 400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } } },
    },
  },
  '/api/auth/login': {
    post: {
      tags: ['Authentication'],
      summary: 'Login with email/phone and password',
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string', format: 'email' }, phone: { type: 'string' }, password: { type: 'string' } }, oneOf: [{ required: ['email', 'password'] }, { required: ['phone', 'password'] }] } } } },
      responses: { 200: { description: 'Login successful', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', properties: { token: { type: 'string' }, user: { $ref: '#/components/schemas/User' }, refreshToken: { type: 'string' } } } } } } } }, 401: { description: 'Invalid credentials' } },
    },
  },
  '/api/auth/refresh': {
    post: {
      tags: ['Authentication'],
      summary: 'Refresh access token',
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { refreshToken: { type: 'string' } }, required: ['refreshToken'] } } } },
      responses: { 200: { description: 'Token refreshed' }, 401: { description: 'Invalid refresh token' } },
    },
  },
  '/api/auth/logout': {
    post: { tags: ['Authentication'], summary: 'Logout user', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Logged out' } } },
  },
  '/api/users': {
    get: {
      tags: ['Users'],
      summary: 'Get current user profile',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'User profile', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/User' } } } } } } },
    },
    patch: {
      tags: ['Users'],
      summary: 'Update user profile',
      security: [{ bearerAuth: [] }],
      requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { firstName: { type: 'string' }, lastName: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' } } } } } },
      responses: { 200: { description: 'Profile updated' } },
    },
  },
  '/api/products': {
    get: {
      tags: ['Products'],
      summary: 'List products with filtering and pagination',
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        { name: 'category', in: 'query', schema: { type: 'string' } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'minPrice', in: 'query', schema: { type: 'number' } },
        { name: 'maxPrice', in: 'query', schema: { type: 'number' } },
        { name: 'sort', in: 'query', schema: { type: 'string', enum: ['newest', 'price_asc', 'price_desc', 'popular', 'rating'] } },
      ],
      responses: { 200: { description: 'Products list', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedResponse' } } } } },
    },
    post: {
      tags: ['Products'],
      summary: 'Create a product',
      security: [{ bearerAuth: [] }],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, basePrice: { type: 'number' }, categoryId: { type: 'string' }, brandId: { type: 'string' } }, required: ['title', 'description', 'basePrice'] } } } },
      responses: { 201: { description: 'Product created' } },
    },
  },
  '/api/products/{slug}': {
    get: {
      tags: ['Products'],
      summary: 'Get product by slug',
      parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Product details' }, 404: { description: 'Product not found' } },
    },
    patch: {
      tags: ['Products'],
      summary: 'Update product',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Product updated' } },
    },
    delete: {
      tags: ['Products'],
      summary: 'Delete product',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Product deleted' } },
    },
  },
  '/api/categories': {
    get: { tags: ['Categories'], summary: 'List all categories', responses: { 200: { description: 'Categories list' } } },
    post: { tags: ['Categories'], summary: 'Create category', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, parentId: { type: 'string' }, description: { type: 'string' } }, required: ['name'] } } } }, responses: { 201: { description: 'Category created' } } },
  },
  '/api/cart': {
    get: { tags: ['Cart'], summary: 'Get user cart', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Cart with items' } } },
    post: { tags: ['Cart'], summary: 'Add item to cart', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { productId: { type: 'string' }, variantId: { type: 'string' }, quantity: { type: 'integer', default: 1 } }, required: ['productId'] } } } }, responses: { 200: { description: 'Item added' } } },
  },
  '/api/orders': {
    get: { tags: ['Orders'], summary: 'List user orders', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Orders list' } } },
    post: { tags: ['Orders'], summary: 'Create order from cart', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Order created' } } },
  },
  '/api/orders/{id}': {
    get: { tags: ['Orders'], summary: 'Get order details', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Order details' } } },
  },
  '/api/payments': {
    post: { tags: ['Payments'], summary: 'Create payment intent', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { orderId: { type: 'string' }, method: { type: 'string' } }, required: ['orderId', 'method'] } } } }, responses: { 201: { description: 'Payment created' } } },
  },
  '/api/payments/webhook': {
    post: { tags: ['Payments'], summary: 'Payment provider webhook', responses: { 200: { description: 'Webhook processed' } } },
  },
  '/api/reviews': {
    get: { tags: ['Reviews'], summary: 'List reviews for a product', parameters: [{ name: 'productId', in: 'query', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Reviews list' } } },
    post: { tags: ['Reviews'], summary: 'Create review', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { productId: { type: 'string' }, rating: { type: 'integer', minimum: 1, maximum: 5 }, title: { type: 'string' }, text: { type: 'string' } }, required: ['productId', 'rating'] } } } }, responses: { 201: { description: 'Review created' } } },
  },
  '/api/sellers': {
    get: { tags: ['Sellers'], summary: 'List sellers', responses: { 200: { description: 'Sellers list' } } },
    post: { tags: ['Sellers'], summary: 'Become a seller', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { storeName: { type: 'string' }, storeDescription: { type: 'string' } }, required: ['storeName'] } } } }, responses: { 201: { description: 'Seller created' } } },
  },
  '/api/brands': {
    get: { tags: ['Brands'], summary: 'List brands', responses: { 200: { description: 'Brands list' } } },
    post: { tags: ['Brands'], summary: 'Create brand', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Brand created' } } },
  },
  '/api/shipping': {
    get: { tags: ['Shipping'], summary: 'Calculate shipping rates', parameters: [{ name: 'orderId', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'Shipping rates' } } },
  },
  '/api/promotions': {
    get: { tags: ['Promotions'], summary: 'List active promotions', responses: { 200: { description: 'Promotions list' } } },
    post: { tags: ['Promotions'], summary: 'Create coupon/promotion', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Promotion created' } } },
  },
  '/api/notifications': {
    get: { tags: ['Notifications'], summary: 'List user notifications', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Notifications list' } } },
    patch: { tags: ['Notifications'], summary: 'Mark notification as read', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', schema: { type: 'string' } }], responses: { 200: { description: 'Marked as read' } } },
  },
  '/api/returns': {
    get: { tags: ['Returns'], summary: 'List return requests', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Returns list' } } },
    post: { tags: ['Returns'], summary: 'Create return request', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Return created' } } },
  },
  '/api/admin/dashboard': {
    get: { tags: ['Admin'], summary: 'Get admin dashboard stats', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Dashboard stats' } } },
  },
  '/api/admin/users': {
    get: { tags: ['Admin'], summary: 'List all users (admin)', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Users list' } } },
    patch: { tags: ['Admin'], summary: 'Update user (admin)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', schema: { type: 'string' } }], responses: { 200: { description: 'User updated' } } },
  },
  '/api/wishlist': {
    get: { tags: ['Wishlist'], summary: 'Get user wishlist', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Wishlist items' } } },
    post: { tags: ['Wishlist'], summary: 'Add to wishlist', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { productId: { type: 'string' } }, required: ['productId'] } } } }, responses: { 201: { description: 'Added to wishlist' } } },
  },
  '/api/upload/images': {
    post: { tags: ['Upload'], summary: 'Upload image', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { image: { type: 'string', format: 'binary' } } } } } }, responses: { 201: { description: 'Image uploaded' } } },
  },
  '/api/rfq': {
    get: { tags: ['RFQ'], summary: 'List RFQ threads', security: [{ bearerAuth: [] }], responses: { 200: { description: 'RFQ list' } } },
    post: { tags: ['RFQ'], summary: 'Create RFQ thread', security: [{ bearerAuth: [] }], responses: { 201: { description: 'RFQ created' } } },
  },
  '/api/messaging/conversations': {
    get: { tags: ['Messaging'], summary: 'List conversations', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Conversations list' } } },
    post: { tags: ['Messaging'], summary: 'Start new conversation', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Conversation created' } } },
  },
  '/api/tickets': {
    get: { tags: ['Support Tickets'], summary: 'List support tickets', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Tickets list' } } },
    post: { tags: ['Support Tickets'], summary: 'Create support ticket', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Ticket created' } } },
  },
  '/api/blog': {
    get: { tags: ['Blog'], summary: 'List blog posts', responses: { 200: { description: 'Blog posts list' } } },
    post: { tags: ['Blog'], summary: 'Create blog post', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Blog post created' } } },
  },
  '/api/giftcards': {
    get: { tags: ['Gift Cards'], summary: 'List gift cards', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Gift cards list' } } },
    post: { tags: ['Gift Cards'], summary: 'Create gift card', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Gift card created' } } },
  },
  '/api/announcements': {
    get: { tags: ['Announcements'], summary: 'List active announcements', responses: { 200: { description: 'Announcements list' } } },
    post: { tags: ['Announcements'], summary: 'Create announcement', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Announcement created' } } },
  },
  '/api/api-keys': {
    get: { tags: ['API Keys'], summary: 'List API keys', security: [{ bearerAuth: [] }], responses: { 200: { description: 'API keys list' } } },
    post: { tags: ['API Keys'], summary: 'Create API key', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, permissions: { type: 'array', items: { type: 'string' } } }, required: ['name'] } } } }, responses: { 201: { description: 'API key created' } } },
    delete: { tags: ['API Keys'], summary: 'Revoke API key', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'API key revoked' } } },
  },
  '/api/api-keys/validate': {
    post: { tags: ['API Keys'], summary: 'Validate an API key', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { key: { type: 'string' }, permission: { type: 'string' } }, required: ['key'] } } } }, responses: { 200: { description: 'Key is valid' }, 401: { description: 'Invalid key' } } },
  },
  '/api/automation/marketplace/run': {
    post: { tags: ['Automation'], summary: 'Run marketplace automation', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Automation completed' } } },
  },
  '/api/config': {
    get: { tags: ['Config'], summary: 'Get public config', responses: { 200: { description: 'Public config' } } },
    post: { tags: ['Config'], summary: 'Update config (admin)', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Config updated' } } },
  },
  '/api/plugins': {
    get: { tags: ['Plugins'], summary: 'List plugins', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Plugins list' } } },
    post: { tags: ['Plugins'], summary: 'Register plugin', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Plugin registered' } } },
  },
  '/api/plugins/{id}': {
    get: { tags: ['Plugins'], summary: 'Get plugin details', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Plugin details' } } },
    patch: { tags: ['Plugins'], summary: 'Update plugin', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Plugin updated' } } },
    delete: { tags: ['Plugins'], summary: 'Uninstall plugin', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Plugin uninstalled' } } },
  },
  '/api/plugins/{id}/toggle': {
    patch: { tags: ['Plugins'], summary: 'Toggle plugin enabled state', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Plugin toggled' } } },
  },
  '/api/webhook-events': {
    get: { tags: ['Webhooks'], summary: 'List webhook events', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Webhook events list' } } },
  },
  '/api/webhook-events/emit': {
    post: { tags: ['Webhooks'], summary: 'Emit a webhook event', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Event emitted' } } },
  },
  '/api/webhook-events/process': {
    post: { tags: ['Webhooks'], summary: 'Process pending webhook events', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Events processed' } } },
  },
  '/api/ai/providers': {
    get: { tags: ['AI'], summary: 'List AI providers', security: [{ bearerAuth: [] }], responses: { 200: { description: 'AI providers list' } } },
    post: { tags: ['AI'], summary: 'Create AI provider', security: [{ bearerAuth: [] }], responses: { 201: { description: 'AI provider created' } } },
  },
  '/api/ai/providers/{id}': {
    patch: { tags: ['AI'], summary: 'Update AI provider', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'AI provider updated' } } },
    delete: { tags: ['AI'], summary: 'Delete AI provider', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'AI provider deleted' } } },
  },
  '/api/ai/providers/{id}/toggle': {
    patch: { tags: ['AI'], summary: 'Toggle AI provider', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Provider toggled' } } },
  },
  '/api/ai/models': {
    get: { tags: ['AI'], summary: 'List AI models', security: [{ bearerAuth: [] }], responses: { 200: { description: 'AI models list' } } },
    post: { tags: ['AI'], summary: 'Create AI model', security: [{ bearerAuth: [] }], responses: { 201: { description: 'AI model created' } } },
  },
  '/api/ai/chat/{provider}/{model}': {
    post: { tags: ['AI'], summary: 'Send chat completion to AI provider', security: [{ bearerAuth: [] }], parameters: [{ name: 'provider', in: 'path', required: true, schema: { type: 'string' } }, { name: 'model', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { messages: { type: 'array', items: { type: 'object', properties: { role: { type: 'string', enum: ['user', 'assistant', 'system'] }, content: { type: 'string' } } } } }, required: ['messages'] } } } }, responses: { 200: { description: 'Chat completion' } } },
  },
  '/api/chat/conversations': {
    get: { tags: ['Chat'], summary: 'List chat conversations', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Conversations list' } } },
    post: { tags: ['Chat'], summary: 'Create conversation', security: [{ bearerAuth: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { title: { type: 'string' } } } } } }, responses: { 201: { description: 'Conversation created' } } },
  },
  '/api/chat/conversations/{id}': {
    get: { tags: ['Chat'], summary: 'Get conversation', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Conversation details' } } },
  },
  '/api/chat/conversations/{id}/messages': {
    get: { tags: ['Chat'], summary: 'Get conversation messages', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Messages list' } } },
    post: { tags: ['Chat'], summary: 'Send message in conversation', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { role: { type: 'string', default: 'user' }, content: { type: 'string' } }, required: ['content'] } } } }, responses: { 201: { description: 'Message sent' } } },
  },
  '/api/chat/conversations/{id}/archive': {
    patch: { tags: ['Chat'], summary: 'Archive conversation', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Conversation archived' } } },
  },
  '/api/workflow/templates': {
    get: { tags: ['Workflows'], summary: 'List workflow templates', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Templates list' } } },
    post: { tags: ['Workflows'], summary: 'Create workflow template', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Template created' } } },
  },
  '/api/workflow/templates/{id}': {
    patch: { tags: ['Workflows'], summary: 'Update workflow template', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Template updated' } } },
    delete: { tags: ['Workflows'], summary: 'Delete workflow template', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Template deleted' } } },
  },
  '/api/workflow/templates/{id}/toggle': {
    patch: { tags: ['Workflows'], summary: 'Toggle workflow template', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Template toggled' } } },
  },
  '/api/workflow/run/{slug}': {
    post: { tags: ['Workflows'], summary: 'Trigger workflow run', security: [{ bearerAuth: [] }], parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { input: { type: 'object' } } } } } }, responses: { 201: { description: 'Workflow triggered' } } },
  },
  '/api/workflow/runs': {
    get: { tags: ['Workflows'], summary: 'List workflow runs', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Runs list' } } },
  },
  '/api/workflow/runs/{id}': {
    get: { tags: ['Workflows'], summary: 'Get workflow run details', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Run details' } } },
  },
  '/api/workflow/runs/{runId}/retry/{stepIndex}': {
    post: { tags: ['Workflows'], summary: 'Retry a failed workflow step', security: [{ bearerAuth: [] }], parameters: [{ name: 'runId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'stepIndex', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'Step retry initiated' } } },
  },
};

export function generateOpenApiSpec(): OpenApiSchema {
  const baseUrl = config.frontendUrl ? new URL(config.frontendUrl).origin : `http://localhost:${config.port}`;

  const spec: OpenApiSchema = {
    openapi: '3.0.3',
    info: {
      title: 'MarketPlace API',
      version: '1.0.0',
      description: 'Complete e-commerce marketplace API with multi-vendor support, payments, AI, plugins, and workflow automation.',
    },
    servers: [
      { url: baseUrl.replace(/\/+$/, ''), description: config.nodeEnv === 'production' ? 'Production server' : 'Development server' },
      { url: `http://localhost:${config.port}`, description: 'Local development' },
    ],
    components: {
      schemas: modelSchemas,
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token obtained from /api/auth/login',
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'API key with `mkp_` prefix for programmatic access',
        },
      },
    },
    tags: [
      { name: 'Authentication', description: 'User registration, login, token refresh' },
      { name: 'Users', description: 'User profile management' },
      { name: 'Products', description: 'Product catalog CRUD' },
      { name: 'Categories', description: 'Category hierarchy' },
      { name: 'Brands', description: 'Brand management' },
      { name: 'Cart', description: 'Shopping cart operations' },
      { name: 'Orders', description: 'Order management' },
      { name: 'Payments', description: 'Payment processing and webhooks' },
      { name: 'Reviews', description: 'Product reviews and ratings' },
      { name: 'Sellers', description: 'Seller management and storefront' },
      { name: 'Shipping', description: 'Shipping rate calculation' },
      { name: 'Promotions', description: 'Coupons and promotions' },
      { name: 'Notifications', description: 'User notifications' },
      { name: 'Returns', description: 'Return and refund requests' },
      { name: 'Wishlist', description: 'User wishlist' },
      { name: 'Upload', description: 'File and image uploads' },
      { name: 'RFQ', description: 'Request for quote threads' },
      { name: 'Messaging', description: 'Buyer-seller messaging' },
      { name: 'Support Tickets', description: 'Customer support tickets' },
      { name: 'Blog', description: 'CMS blog posts' },
      { name: 'Gift Cards', description: 'Gift card management' },
      { name: 'Announcements', description: 'Platform announcements' },
      { name: 'API Keys', description: 'API key management' },
      { name: 'Admin', description: 'Administration dashboard' },
      { name: 'Config', description: 'Dynamic configuration' },
      { name: 'Automation', description: 'Marketplace automation' },
      { name: 'Plugins', description: 'Plugin registry and management' },
      { name: 'Webhooks', description: 'Webhook event bus' },
      { name: 'AI', description: 'AI provider and model management' },
      { name: 'Chat', description: 'Chatbot conversations' },
      { name: 'Workflows', description: 'Workflow automation engine' },
      { name: 'Health', description: 'API health check' },
    ],
    paths: pathDefinitions,
  };

  return spec;
}