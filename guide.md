# MarketPlace Project Guide

This project is a full-stack marketplace app:

- `backend`: Express + TypeScript + Prisma API
- `frontend`: Vite + React + Tailwind storefront/admin/seller UI
- `docker-compose.yml`: local Postgres, Redis, and Meilisearch services

The `myownstaffs` folder is not required to run the app.

## Requirements

- Node.js 20+
- npm
- Docker Desktop, optional but recommended for Redis/Meilisearch/Postgres

## Local Setup

1. Install dependencies:

```bash
cd backend
npm install
cd ../frontend
npm install
```

2. Start local services:

```bash
docker compose up -d
```

3. Create `backend/.env`:

```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
DATABASE_URL=file:./dev.db
REDIS_URL=redis://localhost:6379
MEILISEARCH_URL=http://localhost:7700
MEILISEARCH_KEY=marketplace_search_key
JWT_SECRET=change-this-local-secret
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=change-this-refresh-secret
JWT_REFRESH_EXPIRES_IN=30d
PAYMENT_WEBHOOK_SECRET=local-webhook-secret
UPLOAD_DIR=uploads
```

The current Prisma schema uses SQLite by default. To use Docker Postgres, change `backend/prisma/schema.prisma` datasource provider to `postgresql`, set `DATABASE_URL=postgresql://marketplace:marketplace_secret@localhost:5432/marketplace`, then run migrations.

4. Generate Prisma client and seed data:

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Seed accounts:

- Admin: `admin@marketplace.com` / `Admin@123`
- Seller: `seller@marketplace.com` / `Seller@123`
- Customer: `customer@marketplace.com` / `Customer@123`

## Run The App

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash

```

Open:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:3000/api/health`

## Useful Commands

Backend:

```bash
npm run build
npm test
npm run prisma:studio
```

Frontend:

```bash
npm run build
npm run preview
```

## Features Added

### Core Marketplace
- Alibaba-style storefront layout with category rail, sourcing hero, deal/service panels, and dense product cards
- Global dark/light toggle
- Global accessibility toggle for larger text and stronger focus rings
- Wishlist API and frontend page
- Product Q&A API and product detail integration
- Image upload endpoint at `POST /api/upload/images`
- Seller KYC submission endpoint at `POST /api/sellers/kyc`
- Shipment event append endpoint at `POST /api/shipping/:id/events`
- Transaction-backed checkout with stock checks and coupon usage tracking
- Payment webhook signature verification with `x-marketplace-signature`
- Redis-backed OTP/password reset storage with memory fallback
- Email/SMS provider hooks with local logging fallback
- Optional Meilisearch product indexing/search fallback
- Focused backend tests for critical auth/seller/cart/order/route flows

### Admin & System Modules
- **Admin Panel**: Full dashboard with Users, Roles, Categories, Products, Blog, Tickets, Announcements, Gift Cards, Config, Audit Logs pages
- **API Key Management**: Create, list, revoke API keys with granular permissions and expiry
- **Plugin System**: Register plugins with scopes, webhook URLs, and manifest; toggle enable/disable
- **Webhook Event Queue**: System event capture with retry logic, delivery tracking, and cleanup
- **AI Provider Integration**: Configure providers (OpenAI, etc.) with model definitions, capabilities, and context lengths
- **Chatbot/Chat**: Conversation management with role-based messaging (system/user/assistant) and token tracking
- **Workflow Engine**: Define workflow templates with multi-step configurations, triggers, and run tracking with step-level execution
- **Automation Worker**: Scheduled queue-backed engine for abandoned carts, stale order SLA reminders, auto-cancellation of unpaid orders, payment risk assessments, webhook delivery, and stale record cleanup

### Security
- Provider-specific payment webhook signature verification (Stripe `t=...v1=...` format, PayPal transmission headers, M-Pesa SecurityCredential, generic HMAC-SHA256)
- Timestamp expiry validation for webhook signatures (5-minute tolerance)
- Payload integrity checking with tamper detection
- Role-based access control (CUSTOMER, SELLER, ADMIN, SUPER_ADMIN)
- Rate limiting on API routes
- Helmet security headers with CORS configuration

## Deployment Notes

Recommended cloud split:

- Frontend: Vercel, Netlify, Cloudflare Pages, or static hosting
- Backend: Render, Railway, Fly.io, AWS ECS, DigitalOcean App Platform
- Database: managed Postgres
- Redis: managed Redis
- Meilisearch: managed Meilisearch or a small VM/container
- Uploads: replace local disk uploads with S3/R2/Cloudinary before serious production use

Production backend environment should include:

```env
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-frontend-domain.com
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
MEILISEARCH_URL=https://...
MEILISEARCH_KEY=...
JWT_SECRET=long-random-secret
JWT_REFRESH_SECRET=another-long-random-secret
PAYMENT_WEBHOOK_SECRET=provider-webhook-secret
SMTP_HOST=...
SMTP_FROM=no-reply@yourdomain.com
SMS_PROVIDER_URL=...
SMS_PROVIDER_KEY=...
```

Deployment flow:

1. Provision Postgres, Redis, and Meilisearch.
2. Set backend environment variables.
3. Run `npm install`, `npm run prisma:generate`, `npm run build`.
4. Run database migrations with `npm run prisma:migrate`.
5. Start backend with `npm start`.
6. Set frontend `VITE_API_URL=https://your-api-domain.com/api`.
7. Build frontend with `npm run build` and deploy `frontend/dist`.

## Production Hardening Checklist

- Move uploaded product images to object storage.
- Add provider-specific payment webhook payload verification.
- Add real SMTP/SMS credentials.
- Add rate limits to OTP and password reset endpoints.
- Add full integration tests against a test database.
- Add CI to run backend tests and both builds on every push.
- Add observability: request logs, error tracking, uptime checks, and database backups.
