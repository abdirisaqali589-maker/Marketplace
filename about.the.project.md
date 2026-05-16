PROJECT OVERVIEW
Full-stack e-commerce marketplace with integrated AI chatbot, seller tools, admin panel, and automation engine. Built as a modular monolith with clear separation between backend API and frontend SPA.

SYSTEM ARCHITECTURE
Technology Stack
Backend:

Runtime: Node.js + Express + TypeScript
ORM: Prisma (SQLite default, supports PostgreSQL)
Database: SQLite (dev) / PostgreSQL (prod)
Cache/Queue: Redis + Bull
Search: Meilisearch
Real-time: Socket.IO
AI: OpenAI-compatible providers (OpenAI, Anthropic, local Ollama, etc.)
Storage: Local filesystem (uploads), Cloudinary ready
Monitoring: Sentry, OpenTelemetry
Email: SendGrid
SMS: Twilio
Payments: Stripe/MPesa webhook support
Frontend:

Framework: React 18 + Vite + TypeScript
Routing: React Router v6
State: Zustand (persisted auth), TanStack Query (server state)
UI: Tailwind CSS + Lucide icons + Framer Motion
Charts: Recharts
Markdown: react-markdown + rehype-highlight
Forms: Native + Zod validation
BACKEND ARCHITECTURE
Entry Point & Middleware Stack
backend/src/index.ts:1-245

Creates Express app with layered middleware:
Helmet (security headers)
CORS (whitelisted frontend URL)
JSON/URL-encoded parser (10MB limit)
Morgan (request logging → logger)
Rate limiter (100 req/15min prod, 2000 dev, GET exempt)
Static uploads serving (/uploads)
Routes mounted under /api
404 handler
Error handler (AppError → JSON, Prisma error mapping, 500 fallback)
Socket.IO: WebSocket server initialized on HTTP server for real-time chat/messaging.

Automation Worker: automationWorker.start(60000) — runs every 60s, handles:

Workflow step execution
Abandoned cart reminders (24h)
SLA reminders for stale orders (48h)
Auto-cancel unpaid orders (72h)
Payment risk assessments (24h pending)
Webhook event delivery retry (max 3 attempts)
Stale record cleanup (30 days)
Module Pattern (Feature-Based)
Each module follows consistent structure:

module/
  ├── module.controller.ts    ← HTTP handlers (asyncHandler wrapper)
  ├── module.routes.ts        ← Express Router with route definitions
  ├── module.service.ts       ← Business logic, Prisma queries
  ├── module.validation.ts    ← Zod schemas for input validation
  ├── module.middleware.ts?   ← Optional module-specific middleware
  └── (other domain files)
Module registration: All routes imported and mounted in index.ts with /api/<module> prefix.

Common utilities (backend/src/common/):

config.ts — dotenv-loaded config (port, URLs, secrets, service creds)
prisma.ts — singleton PrismaClient instance
logger.ts — Winston-based logger (console + file transports)
middleware.ts — auth (JWT Bearer), role authorization (authorize(...roles)), API key auth, error handler, async wrapper
errors.ts — AppError hierarchy: NotFound(404), Unauthorized(401), Forbidden(403), BadRequest(400), Conflict(409), Validation(422)
jwt.ts — generateTokens(payload) returns {accessToken, refreshToken}, verifyToken(token), decodeToken(token)
otp-store.ts — Redis-backed OTP storage with in-memory fallback (setOtp, getOtp, deleteOtp)
notification-provider.ts — abstraction over SendGrid/Twilio with local-logger fallback
Authentication Flow
auth.service.ts:21-258

Register: Validate unique email/phone → bcrypt password (12 rounds) → create User + UserPreference → send OTP via sendContactMessage → issue JWT access (7d) + refresh (30d) tokens → store refresh token in DB
Login: Find user by email/phone → verify active → compare password → issue tokens (rotate refresh token)
OTP: setOtp('otp:'+contact, code, 10min) → send via SMS/email → verify → delete OTP → set isVerified=true
Refresh: Find refresh token by token string → check expiry → issue new access+refresh tokens, delete old refresh token
Logout: Delete refresh token by token string
Password Reset: forgotPassword generates 6-digit code (15min), resetPassword validates and updates hash
JWT payload: {userId, email?, phone?, role}

Frontend auth state: Zustand store (auth-store.ts) with persisted session (marketplace-auth key in localStorage), auto-refresh via response interceptor on 401.

Authorization
Role-based access control via authorize(...roles) middleware:

CUSTOMER — buyer features
SELLER — seller dashboard + customer
ADMIN — full admin access
SUPER_ADMIN — unrestricted
API Key auth: authenticateApiKey(permission?) validates x-api-key header, stores req.apiKey.

Database Schema Highlights (schema.prisma:1-1255)
Core models:

User → UserAddress, UserPreference, Cart, Order, WishlistItem, Review, Notification, ReturnRequest, RefreshToken, AuditLog, Conversation (buyer/seller), Message
Seller → SellerPayout, StorefrontSection, Product, Order, Review, CouponRule, RfqThread
Product → ProductImage, ProductVariant, CartItem, OrderItem, Review, WishlistItem, CampaignProduct, ProductImportRow, RfqThread
Order → OrderItem, Payment, Shipment, Review, ReturnRequest
Category (hierarchical, self-relation)
Brand
Review → ReviewImage, ReviewReply
ChatConversation + ChatMessage (AI chat)
AI models: AiProvider, AiModel (model registry), AiTool (tool definitions + permissions), AiToolPermission (role-based execute/approve), AiPromptProfile, AiKnowledgeSource, AiAgentProfile, AiToolAuditLog
Workflow: WorkflowTemplate (steps JSON, triggers JSON) → WorkflowRun → WorkflowStepRun
Platform: ApiKey, Plugin, WebhookEvent, Announcement, BlogPost, StaticPage, SupportTicket, GiftCard, CouponRule/CouponUsage, Campaign, FeatureFlag, AdminUser/AdminRole, AuditLog, Notification, ReadReceipt, LoyaltyTransaction, Referral, RiskAssessment, SearchIndexJob
Indexing: Strategic single/multi-field indexes, unique constraints on natural keys (slug, email, token, code).

API Response Format
Standard: { success: boolean, message?: string, data?: T, errors?: Record<string, string[]> }

Success: 201 for creates, 200 for reads/updates, 204 for deletes (often wrapped). Errors: JSON with success: false, message or errors field (validation).

FRONTEND ARCHITECTURE
Entry Point & Routing
App.tsx:65-170

Fetches usePublicConfig() to load theme/site identity before render (blocking)
Applies theme CSS variables (--color-*, --radius) to root element
Routes organized by user type:
Public (/, /products, /products/:slug, /cart, /checkout, /login, /register, /ai-chat, /wishlist, /sellers/:sellerId)
Customer (/account/* — dashboard, orders, notifications, payments, settings, ai)
Seller (/seller/* — dashboard, products, orders, payouts, analytics, reviews)
Admin (/admin/* — 18+ pages: dashboard, users, products, categories, config, blog, roles, tickets, announcements, api-keys, plugins, giftcards, chatbot, voice, workflows, ai-config, ai-providers, ai-tools, audit-logs, ai-content-editor)
Redirects legacy routes (/orders → /account/orders, etc.)
Catch-all → /
Layout & Shared Components
Layout.tsx:15-102

Loads publicConfig for logo/favicon/SEO
Applies theme palette via useEffect (one-time on mount)
Syncs dark/accessibility/high-contrast classes from preference-store on root
Composes: Navbar + Footer + AccessibilityDock + ChatBubble + BackToTop + LiveSupport
State Management:

auth-store.ts — Zustand with persistence (localStorage key marketplace-auth), holds {user, accessToken, refreshToken, isAuthenticated}
preference-store.ts — {theme, accessibility, highContrast} synced to localStorage + root classes
chat-store.ts — active chat conversation state
API Layer:

api.ts — axios instance, request interceptor adds JWT from auth-store (getState), response interceptor auto-refresh on 401 using refresh token
api-enhanced.ts — typed wrappers get/post/put/patch/del returning {data} destructuring
query-hooks.ts — TanStack Query factory with typed query keys, custom hooks for all resources (products, cart, orders, seller, admin, notifications, config)
Feature Modules
Customer (features/customer/):

HomePage — hero carousel, category rail, promo deals, featured/best-sellers/new arrivals product grids, brand showcase, CTA, stats
ProductListPage — filters (category, price, rating), sort, grid/list view, pagination
ProductDetailPage — image gallery, variants selector, add-to-cart, Q&A, reviews
CartPage — item list, quantity adjustment, coupon entry, shipping estimator, checkout button
CheckoutPage — address selection/payment method selection/order review/transaction-backed stock check
OrderHistoryPage + CustomerDashboard + CustomerSettings + CustomerNotifications + CustomerPayments
WishlistPage — saved products
SellerStorePage — public seller storefront
BecomeSellerPage — KYC submission form
AIChatPage — chat interface with streaming, tool call visualization
PublicPage — CMS page renderer
Seller (features/seller/):

SellerLayout — sidebar navigation
SellerDashboard — metrics: orders, revenue, products, reviews
SellerProducts — CRUD, bulk import preview, stock automation
SellerOrders — order list with status filters, status update actions
SellerPayouts — payout history table
SellerAnalytics — charts (sales over time, top products)
SellerReviews — review list + reply form
Admin (features/admin/):

AdminLayout — sidebar with all admin sections
AdminDashboard — platform-wide KPIs: users, sellers, orders, revenue, pending KYC
AdminUsers — user table, search, role filter, activate/deactivate
AdminProducts — product approval queue, featured toggle, active toggle
AdminCategories — category tree CRUD
AdminConfig — dynamic config editor
AdminBlog — blog post CRUD
AdminRoles — role CRUD, permission matrix
AdminTickets — support ticket management
AdminAnnouncements — create/view announcements
AdminApiKeys — API key creation/revocation with expiry + permission scopes
AdminPlugins — plugin registry with enable/disable toggle
AdminGiftCards — gift card creation + usage tracking
AdminChatbot — AI chat config (system prompt, tool toggles, usage limits)
AdminVoiceConfig — voice feature settings
AdminWorkflows — workflow template CRUD + run history
AdminAiConfig — AI agent profiles, prompt profiles, knowledge sources
AdminAiProviders — provider CRUD, test connection, fetch models (OpenAI/Ollama/etc.)
AdminAiToolRegistry — tool approval matrix, risk levels, audit logs
AdminAuditLogs — searchable admin action log
AIContentEditor — AI-assisted page content generator
Shared (features/shared/):

Layout, Navbar, Footer
ChatBubble — floating AI chat launcher
LoadingScreen, EmptyState, BackToTop
RecentlyViewed — localStorage-based product history
LiveSupport — live support widget (likely helpscout/zendesk placeholder)
AccessibilityDock — font size, focus rings, contrast toggles
ProductCard variants
Voice (features/voice/):

VoiceControl — microphone button, recording UI, send transcript to chat/cart
Auth (features/auth/):

LoginPage, RegisterPage — form + OTP verification
MODULE DETAILS (Backend)
Auth (modules/auth/):

JWT + refresh token rotation
OTP via Redis (with in-memory fallback)
Email/SMS abstraction with local logger fallback
Routes: POST /api/auth/register, /login, /logout, /refresh-token, /otp/send, /otp/verify, /forgot-password, /reset-password
Product (modules/product/):

Full CRUD with seller ownership
Variant/stock management, image uploads
Import preview (CSV/XLSX) → bulk create jobs
Search endpoint (filters: category, price, rating, etc.) + Meilisearch optional fallback
Q&A: create/answer questions
Approval workflow (admin → ACTIVE/REJECTED/PENDING_REVIEW)
Featured toggle, active toggle
GET /api/products/featured, GET /api/products/search, GET /api/products/slug/:slug
Cart (modules/cart/):

Single cart per user
Add/update/remove items (per-item quantity, note)
Auto-calculates subtotal/total via virtual/Python? (likely Prisma aggregate or computed)
Stock validation on add/update
Order (modules/order/):

Creates order from cart (transactional stock check, coupon usage record)
Status flow: PENDING_PAYMENT → PAYMENT_CONFIRMED → PROCESSING → READY_TO_SHIP → SHIPPED → DELIVERED → COMPLETED; cancellations allowed pre-shipment
orderNumber unique sequential
Payment status tracked separately
Shipping address JSON snapshot
Admin endpoints: /admin/orders + bulk actions
Payment (modules/payment/):

Webhook endpoint with provider-specific signature verification (Stripe t=... + HMAC, PayPal headers, M-Pesa SecurityCredential, generic HMAC-SHA256)
Timestamp expiry check (5 minutes tolerance)
Tamper detection (payload hash comparison)
Transaction record creation with paidAt timestamp
Shipping (modules/shipping/):

Shipment tracking (courier code, tracking number)
Events append endpoint (POST /api/shipping/:id/events) — JSON array append
Label URL, estimated delivery
Review (modules/review/):

Verified purchase flag
Image uploads per review
Seller replies (SELLER/ADMIN only)
Product Q&A separate (ProductQuestion model)
Wishlist (modules/wishlist/):

Unique constraint per user+product
Simple add/remove/list
Coupon/Promotion (modules/promotion/):

CouponRule (code, type PERCENTAGE/FIXED/FREE_SHIPPING, value, min spend, usage/user limits, date range)
CouponUsage tracking per user+order
Campaign + CampaignProduct for flash sales/seasonal promos
Seller (modules/seller/):

KYC submission (POST /api/sellers/kyc) with document URLs
Storefront sections (customizable homepage blocks)
Commission rate per seller
Analytics aggregations
Admin (modules/admin/):

Dashboard stats aggregator
User management (activate/deactivate)
Role management (AdminRole permissions JSON)
Config editor (DynamicConfig module underlying)
AuditLog insertion via middleware
Dynamic Config (modules/dynamic-config/):

Key-value store with type-safe values
Public vs admin endpoints
Used for theme, site identity, feature flags
Notification (modules/notification/):

In-app notifications per user
Read receipt tracking
Types: order status, abandoned cart, KYC approved/rejected, etc.
ReadReceipt unique per user+entity
Messaging (modules/messaging/):

Conversation (buyer ↔ seller) + Message
Real-time via Socket.IO
Ticket (modules/ticket/):

Support tickets with priority/status
Staff assignment
Threaded messages
Blog (modules/blog/):

BlogPost with slug, status (DRAFT/PUBLISHED), author, tags
Excludes admin-only editing
Upload (modules/upload/):

POST /api/upload/images — multipart file upload → uploads/ dir
Returns {url: '/uploads/<filename>'}
Placeholder SVG route (/uploads/products/:filename) for missing images
API Key (modules/api-key/):

Key generation (crypto.randomBytes(32).toString('hex'))
Permission JSON array + expiry
authenticateApiKey middleware usage
Plugin (modules/plugin/):

Plugin model stores manifest, scopes, webhook URLs, settings, enabled flag
System plugins marked isSystem: true (undeletable)
PluginService for install/upgrade/uninstall hooks (not fully fleshed out)
Webhook (modules/webhook/):

WebhookEvent bus with retry logic (maxAttempts default 3)
Queue processed by automation worker
eventType, source (plugin/module), payload JSON
Delivery tracking + error logging
AI Modules — below

AI & CHAT ARCHITECTURE
AI Provider & Model Registry (modules/ai/)
AiProvider — provider config: name, slug, provider type (openai, anthropic, ollama, etc.), baseUrl, apiKey (encrypted? plain in DB), models JSON array, config JSON, isEnabled

AiModel — individual model definitions: name, slug, providerId, capabilities JSON array (chat, vision, function-calling, embeddings, reasoning), contextLength, pricing JSON, isActive

Service (ai.service.ts):

chatCompletion(providerSlug, modelSlug, messages, options) — calls external provider using OpenAI-compatible API format
chatCompletionStream — SSE streaming via fetch + readable stream
embedText, generateImage (stub)
Provider-specific clients: OpenAI SDK, Anthropic SDK, or generic fetch for Ollama
AI Tool Registry (ai-tool-registry.service.ts:37-558):

AiTool model defines: name, description, jsonSchema (OpenAI function-calling schema), enabled, roles (allowed user roles), scopes (permissions), riskLevel (low/medium/high/critical), requiresConfirmation, handlerType (builtin/plugin/workflow/webhook), handlerRef (slug/URL), config, rateLimit, auditLevel
AiToolPermission per role: canExecute, canApprove
Execution flow (executeTool):
Load tool by name + permissions
Check enabled
Verify role permission (falls back to DEFAULT role)
Validate args against JSON Schema
High-risk check → if requiresConfirmation && risk in [high,critical] → returns requiresApproval: true without executing
Rate limit check using AiToolAuditLog counts
Execute via handler type:
builtin → calls registered handler from builtinHandlers Map
plugin → fetches enabled plugin and calls its webhook
workflow → creates WorkflowRun (async via automation worker)
webhook → POST to handlerRef URL with secret header
Audit log every attempt (success/failure/denied)
approveToolCall(auditLogId, approvedBy) — ADMIN/SUPER_ADMIN re-executes after approval
Built-in handlers registered by other services (product, order, user, etc.)
AI Chat (chat/):

ChatConversation (user-owned, ACTIVE/ARCHIVED) + ChatMessage (role: user/assistant/system/tool, toolCalls JSON, toolResults JSON, tokens, model)
Controller: POST /api/chat/send (non-streaming), /api/chat/stream (SSE) + /conversations CRUD
Service (ai-chat.service.ts:889-1186+):
System prompt (ENHANCED_SYSTEM_PROMPT) embeds role-aware behavior, tool descriptions, output format rules (XML <title>, <thinking>, <answer>)
Tool definitions: TOOL_DEFINITIONS constant (~60 tools) covering customer, seller, admin capabilities
Config loading: from featureFlag key ai.chat → overrides defaults (enabled, model, temperature, tool toggles, usage limits)
sendAIMessage:
Append user message to conversation
Load DB config → check enabled/usage limits
Build message context (last N messages + system prompt)
Inject role info system message
Resolve provider/model from config or first enabled provider
Call aiService.chatCompletion with native tools
If tool_calls present: run tools via toolRunner.run() sequentially → collect results → second completion call
Parse response: strip <title>, <thinking>, <answer> tags
Save assistant message with tokens/model
Auto-generate conversation title from first user message if empty
Streaming variant uses onThinking, onContent, onToolCall callbacks + incremental tool execution
Tool Runner (ai/tool-runner.service.ts): wraps AiToolRegistry.executeTool, adds user context, error handling
Voice (modules/voice/)
VoiceService — lightweight:

TTS: generates SSML hints for client-side Web Speech API (no server audio)
STT: processes transcript → normalizes, detects intent (search_product, add_to_cart, track_order, help, return, account, wishlist, admin, greeting)
Config: STT engine (browser/whisper/custom), TTS engine, wake word, shortcuts list
Routes: GET /api/voice/config, POST /api/voice/process-input
Frontend voice-engine.ts uses Web Speech API (webkitSpeechRecognition) + AudioContext for recording → sends transcript to backend for intent classification → toolbar shortcuts execute navigation/cart actions.

Workflow Engine (modules/workflow/)
WorkflowTemplate: name, slug, steps JSON array, triggers JSON array, config, isEnabled
WorkflowRun: created by trigger or AI tool → status PENDING/RUNNING/COMPLETED/FAILED/CANCELLED
WorkflowStepRun: per-step tracking with retry (maxRetries default 3)
Automation worker processes pending runs, executes steps:
notification → creates Notification
webhook → fetch to URL
delay → setTimeout
condition → evaluates field against operator
Admin tools: get_workflows, toggle_workflow, create_workflow
Automation Worker (automation/automation.worker.ts)
Singleton executed by index.ts on startup every 60s. Processes:

Pending workflow runs (max 10 per cycle)
Marketplace tasks:
Abandoned cart notifications → Notification type ABANDONED_CART
Stale order SLA reminders → SELLER_SLA_REMINDER
Auto-cancel unpaid orders (>72h) → status CANCELLED, payment FAILED
Risk assessment for pending payments → creates RiskAssessment
Webhook event queue delivery (max 20 per cycle, retry up to 3 attempts, deliver to enabled plugins' webhook URLs)
Cleanup: delete delivered webhook events >30d, cancel old workflow runs
FRONTEND DATA FLOW
Query Hooks Pattern (lib/query-hooks.ts):

Centralized queryKeys factory with nested namespacing (e.g., queryKeys.products.detail(id))
Each hook: useQuery (GET) with staleTime tuning + useMutation (POST/PUT/PATCH/DELETE) + queryClient.invalidateQueries on success
Toast notifications on mutation success/error
Cart/wishlist queries gated by isAuthenticated
Auth Interceptor (lib/api.ts):

Axios interceptor adds Authorization: Bearer <token> (from Zustand store getState)
401 → attempts refresh → on success retry original request; on failure logout
State Hydration:

Zustand persisted stores rehydrate from localStorage before render
usePublicConfig runs first, blocks UI until config loaded (for theme apply)
Route Guards:

No explicit guards; instead pages check useAuthStore().isAuthenticated and redirect via navigate within component (e.g., if (!isAuthenticated) { navigate('/login'); return null; })
Styling:

Tailwind CSS; dynamic CSS variables injected from theme config: --color-primary-600, --color-surface, --color-text, etc.
Dark mode via dark class on root
Radius variable --radius control (compact/standard/soft)
FEATURES IMPLEMENTED
Core Marketplace
Product catalog with categories, brands, filtering, sorting
Product detail with images, variants, Q&A, reviews
Shopping cart + checkout (stock validation, coupon support)
Order management (order history, status tracking)
Seller storefronts with custom sections
Wishlist
Search (database + optional Meilisearch)
Review + image uploads
Coupon codes + campaigns
Gift cards
Abandoned cart recovery (automation)
Return/refund requests
Loyalty transactions
Referral system
Admin Panel
Dashboard metrics
User management (activate/deactivate)
Product approval workflow
Category/brand management
Role-based admin access control
Config editor
Blog/CMS
Ticket system
Announcements
API key management
Plugin registry (installable/extensible)
Gift card creation
Chatbot configuration
Voice config
Audit logs
AI-powered content editor
AI & Chat
Multi-provider AI support (cloud + local)
Model registry (capabilities, context length)
Chat with streaming responses
Tool calling (function calling) with approval workflow
60+ built-in tools (customer: search/cart/wishlist/orders; seller: products/orders/analytics/kyc; admin: users/config/pages/workflows)
Knowledge source integration (future)
Tool audit logs + rate limiting
Role-aware behavior (tools filtered by user role)
AI content generation for pages/blog
Conversation history + title auto-generation
Voice
Client-side Speech-to-Text (Web Speech API)
Text-to-Speech hints (SSML)
Voice command shortcuts (search, add to cart, help, navigate)
Automation
Scheduled worker (60s interval)
Workflow engine (multi-step, conditional, webhook)
Abandoned cart notifications
SLA reminders
Auto-cancel unpaid orders
Risk assessment for payments
Webhook event queue with retry
Stale data cleanup
Developer
OpenAPI generation
API key auth
Plugin webhook system
Feature flags
Dynamic config
Audit logging
Error tracking (Sentry ready)
WEAKNESSES & GAPS
Security
Encryption at rest: API keys stored in DB (plain? need encryption), AI provider keys plain text
R2S (Role-to-Service): Admin role checks only at route level; service layer lacks consistent RBAC (most service methods assume req.user passed but not validated)
File uploads: No file type/size validation beyond Express limit; no virus scan; local disk storage not suitable for scale
Webhook secret rotation: No versioning; if compromised, need manual DB update
JWT secret hard-coded defaults in config.ts (if .env missing, dev-secret used)
OTP brute force: No rate limit on OTP verify endpoint
Password reset token storage: Uses same OTP store (format reset:<contact>), no expiry differentiation beyond TTL
SQL injection: Prisma prevents, but raw queries not used safely? (no raw queries found, OK)
CORS: Allows any origin in dev? Origin strictly frontendUrl (good), but credentials allowed
Reliability & Observability
No retry logic on database failures (Prisma will throw, caught by errorHandler returning 500)
Queue: no durable queue (Bull uses Redis, but no persistent job storage if Redis down? Redis is single point)
No circuit breakers for external AI provider calls
Logging: Winston configured but no log rotation/shipping
Metrics: no Prometheus/OpenMetrics endpoint
Health check: only basic /api/health (doesn't check Redis/Meilisearch connectivity)
Graceful shutdown: closes HTTP server and Prisma, but doesn't drain in-flight requests/queues
Sentry: DSN env var exists but no explicit init call found
Scalability
Monolithic deployment: all features in one service (could split AI, notifications, webhooks to separate workers)
Single Redis: single point for sessions, OTP, queue, caching? Not used for caching much outside OTP
No rate limiting per user/IP: only global rate limiter
File uploads local: no CDN; production needs S3/R2/Cloudinary
No database connection pooling config — Prisma pools but not tuned
No pagination cursor: offset-based pagination (prone to performance issues on large tables)
No read replicas considered
Data Integrity
Cart concurrency: no optimistic locking; race conditions possible when updating cart items from multiple tabs
Stock overselling: createOrderFromCart checks stock at time of order, but no DB-level check constraints; race condition if two orders for same product simultaneously
Coupon usage limit: uses coupon_usages count, but no atomic increment + check in single query (possible to exceed limit under race)
Order total calculation: computed in service via sum of order_items.totalPrice + fees, but not stored denormalized (fine)
Inventory deduction: only at order creation; no automatic restock on cancellation (should review)
Review verification: isVerified set when order matches, but no constraint preventing fake reviews if user bypasses frontend
Code Quality
Missing tests: only __tests__/critical-flows.test.ts exists; need comprehensive unit + integration tests
Inconsistent error handling: some services throw, some return {error}, mostly throw (good)
Service instantiation: new ProductService() on each controller file import — should use dependency injection or singleton pattern to avoid multiple instances
Hard-coded strings: status values scattered (e.g., 'PENDING', 'ACTIVE'); should use enums/constants
Magic numbers: rate limit window/max, automation intervals, OTP expiry — should be config
SQLite in production: comment says switch to Postgres, but migration scripts and features might rely on SQLite quirks? Prisma should abstract
No input sanitization for HTML in product descriptions (XSS risk if rendered with react-markdown without sanitizer) — using rehype-highlight not sanitizer
Email/SMS fallback: just logs — in prod, missing credentials means silent failure
No request ID tracing: correlation IDs not generated
Socket.IO auth: no auth middleware visible on socket init (need to check common/socket.ts)
Missing Features / Incomplete
Multi-currency support (currency hard-coded per product/user to TZS default)
Multi-language / i18n (language preference stored but UI not translated)
Email verification flow beyond OTP (no verification email template)
Two-factor authentication (2FA) beyond OTP (no TOTP)
Advanced search: filtering by price range, rating, brand only basic; no facets/filter aggregation
Product variant images: each variant could have separate images? schema only product-level images
Inventory management system: stock logs, low stock alerts, automated restock recommendations
Return shipping label generation — only request submission; admin must process manually
Dispute resolution for returns
Subscription/recurring orders not supported
Abandoned cart recovery emails (notifications created but no email dispatch)
Product bundling/kits (not modeled)
Multiple warehouses/locations (single shipping origin)
Advanced analytics: seller-level analytics beyond sales; conversion funnel, traffic sources
Marketplace fees: commissionRate exists on Seller, but no invoice/generation or payment to seller
Payout scheduling: manual? SellerPayout has periodStart/End but no auto-generation
Shipping rate calculation — no integration with carriers (only static methods)
Tax calculation — taxAmount field on Order but no tax engine
GDPR/Privacy: export/delete user data not implemented
Mobile app — responsive web only
Accessibility: basic toggles but ARIA needs audit
Performance: No image optimization (Cloudinary ready but not used), no lazy loading beyond native loading="lazy", no code splitting beyond route-based (React.lazy not seen)
DevOps / Deployment
No CI/CD mentioned
No containerization beyond docker-compose for local services; no Dockerfile for backend/frontend
No monitoring dashboards (Sentry DSN not used)
Database backup strategy not automated
Zero-downtime deploys not addressed
No staging environment config
Environment variable validation not present (missing vars cause runtime errors)
Log rotation not configured
CONNECTIONS & DEPENDENCIES
Backend Dependencies (Topological Order)
common (utils): prisma, config, logger, errors, middleware, jwt, otp-store, notification-provider — used by all modules
auth → depends on common (prisma, jwt, otp, notification, errors)
user → depends on common
category → depends on common
brand → depends on common
product → depends on common + category + brand sellers
upload → depends on common (fs, config)
cart → depends on common + product + user
order → depends on common + cart + product + seller + payment + shipping + promotion + review (deep)
payment → depends on common + order
shipping → depends on common + order
seller → depends on common + user
review → depends on common + product + order + user + seller
wishlist → depends on common + product
promotion → depends on common + seller
coupon → depends on common
campaign → depends on common + product
notification → depends on common + user
messaging → depends on common + user + seller + socket
ticket → depends on common + user
blog → depends on common + user (admin author)
pages (static) → depends on common + user (admin)
announcement → depends on common
giftcard → depends on common + user
return → depends on common + order + user + product
rfq (request-for-quote) → depends on common + seller + product
api-key → depends on common + user
openapi → depends on common (doc generation)
plugin → depends on common
webhook → depends on common + plugin
dynamic-config → depends on common
admin → depends on common + all user/seller/order/product modules
ai (ai.service, ai-tool-registry, ai-chat, chat, voice, workflow, automation) — interdependent; ai-tool-registry used by ai-chat, workflow executed by automation.worker
Frontend Dependencies
lib/ (utilities used everywhere):

api.ts + api-enhanced.ts — base axios instance + typed wrappers
auth-store.ts — Zustand auth
preference-store.ts — theme/prefs
chat-store.ts — chat state
query-hooks.ts — TanStack Query hooks for all modules
assets.ts — assetUrl() for uploads
theme.ts — resolveTheme() from config
voice/* — voice recording/engine
features/ (domain UIs):

Import hooks from ../../lib/query-hooks and ../../lib/api
Components from ../shared/
All styled with Tailwind; icons from lucide-react
Animation via framer-motion in admin-heavy pages
Routing flow:

User visits → Layout (public or protected by UI check within page) → page component → hooks fetch data
Mutations → useMutation → invalidate relevant queries → toast → UI updates
PRODUCTION READINESS CHECKLIST (from guide + analysis)
Pre-Launch Must-Haves
Storage: Migrate uploads to Cloudinary/S3/R2
Database: Switch Prisma to PostgreSQL; run migrations; add connection pooling (PgBouncer)
Secrets management: Rotate all default secrets, store in vault/ENV
Email/SMS: Configure real SendGrid/Twilio credentials
Rate limits: Add stricter limits on OTP/forgot-password endpoints
Full test suite: Unit tests for services, integration tests for critical flows (checkout, auth, order lifecycle)
CI pipeline: run tests + build on push; PR checks
Observability: Sentry init, request logging middleware, uptime checks, DB backups
HTTPS: ENFORCE in production (set TRUST_PROXY=true, app.enable('trust proxy'), helmet HSTS)
CORS: lock to production frontend URL only
Performance Optimizations
Implement cursor-based pagination for large datasets
Add Redis caching layer for product/category queries
Image optimization: Cloudinary transforms + WebP delivery
Bundle splitting + lazy loading for admin pages
Database query analysis (add missing indexes based on slow queries)
Implement read replicas for reporting/admin queries
Add request queuing/bulkheading for AI calls
Security Hardening
Encrypt sensitive DB columns (apiKey, twilioAuthToken, etc.) using Prisma + crypto
Implement Content-Security-Policy headers
Add CSRF protection for state-changing operations if using cookies (currently using Authorization header so CSRF less critical)
Implement login attempt rate limiting per IP/user
Password strength enforcement
Session/device management
Regular dependency updates (npm audit)
Operational
Set up log aggregation (ELK/Datadog)
Configure alerts for error rates, queue lag, Redis memory, DB connections
Implement graceful shutdown with drain (stop accepting, finish requests, clear intervals)
Add distributed tracing (OpenTelemetry already included)
Add health check sub-endpoints for Redis/Meilisearch
QUICK START DIAGRAM (Textual)
[Frontend: React SPA]
   │
   ├─→ Axios (JWT in Authorization header)
   │      ↓
   └─→ Backend: Express (port 3000)
          │
          ├─ Global Middleware
          │  ├─ Helmet (security)
          │  ├─ CORS (frontend origin)
          │  ├─ Rate Limit (100/15min)
          │  ├─ Morgan → Winston logger
          │  └─ JSON parser
          │
          ├─ Routes /api/*
          │  ├─ auth (JWT + refresh flow)
          │  ├─ products (auth/public)
          │  ├─ cart (auth, per-user)
          │  ├─ orders (auth, per-user/seller)
          │  ├─ seller/* (auth + role SELLER/ADMIN)
          │  ├─ admin/* (auth + role ADMIN/SUPER_ADMIN)
          │  ├─ ai/* (auth + AI provider routing)
          │  ├─ chat/* (auth + tool execution)
          │  └─ upload/* (multipart → disk)
          │
          ├─ Socket.IO (real-time messaging)
          │
          └─ Automation Worker (interval)
                 ├─ Workflow engine
                 ├─ Marketplace tasks
                 ├─ Webhook retry
                 └─ Cleanup
Summary: A well-architected, feature-rich marketplace with advanced AI tool-calling, workflow automation, and comprehensive admin controls. Main gaps are production hardening (security, scaling, monitoring) and missing e-commerce advanced features (multi-currency, tax, shipping carriers, inventory management). The codebase is modular and idiomatic TypeScript, but needs test coverage and observability before launch.