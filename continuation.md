# MarketPlace — Project Continuation Guide

## Project Overview
Multi-vendor e-commerce platform built with TypeScript (Express backend + React/Vite frontend). PostgreSQL (Prisma ORM), SQLite for dev, WebSocket support.

## Project Structure
```
MarketPlace/
├── backend/                    # Express + Prisma API
│   ├── src/
│   │   ├── modules/
│   │   │   ├── chat/           # Chat + AI assistant
│   │   │   │   ├── ai-chat.service.ts    # AI service with tool calling
│   │   │   │   ├── ai-chat.controller.ts # Route handler
│   │   │   │   ├── ai-tools.service.ts   # 8 marketplace tools
│   │   │   │   ├── chat.service.ts       # Conversation CRUD
│   │   │   │   └── chat.routes.ts
│   │   │   ├── ai/             # AI provider management
│   │   │   │   └── ai.service.ts        # Provider CRUD + chat completion
│   │   │   └── ...             # auth, products, cart, orders, etc.
│   │   ├── common/             # Shared middleware, errors, logger
│   │   └── index.ts             # Server entry
│   ├── prisma/schema.prisma    # Database schema
│   └── package.json
├── frontend/                   # React + Vite + Tailwind
│   ├── src/
│   │   ├── features/
│   │   │   ├── admin/
│   │   │   │   ├── AdminAiConfig.tsx    # AI config panel
│   │   │   │   └── AdminAiProviders.tsx # Provider management
│   │   │   ├── shared/
│   │   │   │   ├── ChatBubble.tsx       # Floating AI chat popup
│   │   │   │   ├── Layout.tsx           # Main layout with theme
│   │   │   │   ├── Navbar.tsx           # Navigation + theme toggle
│   │   │   │   └── AccessibilityDock.tsx
│   │   │   └── customer/
│   │   │       └── HomePage.tsx
│   │   ├── lib/
│   │   │   ├── chat-store.ts   # Zustand chat state
│   │   │   ├── preference-store.ts # Theme/accessibility state
│   │   │   └── theme.ts        # Theme presets
│   │   └── index.css           # CSS variables for theming
│   └── package.json
└── guide.md                    # Feature documentation
```

## Key Architecture Decisions

### Theme System (CSS Variable Inversion)
- `.dark` class on `<html>` inverts CSS color variables (gray-50 ↔ gray-950, white ↔ black)
- All components should use Tailwind gray/white/black classes — they auto-invert
- For inline styles: `rgb(var(--color-gray-50))` etc.
- Preference store syncs `dark`/`light`/`accessibility`/`high-contrast` classes
- Top nav bar uses explicit dark bg (`--color-gray-900`) that inverts to dark surface in dark mode

### AI Chat System
- **ChatBubble.tsx** — Fixed bottom-right popup, rendered in Layout
- **ai-chat.service.ts** — 2-pass tool calling: AI decides → tool executes → AI synthesizes
- **ai-tools.service.ts** — 8 tools: search_products, get_product, list_categories, get_cart, add_to_cart, get_orders, get_featured, get_platform_stats
- **System prompt** — Enhanced with marketplace knowledge, role awareness, tool definitions
- **Auto title generation** — First message triggers title generation

### Data Flow
1. User types message → Frontend sends `POST /chat/conversations/{id}/ai {message: "..."}`
2. Controller extracts `req.params.id` as conversationId, passes to service
3. Service saves user message → loads config → fetches context → calls AI provider
4. If AI returns tool_calls → execute tools → second AI call with results
5. Save assistant response → return to frontend

## Current State

### Working Features
- ✅ Chat bubble on all pages (authenticated users)
- ✅ AI can search products, view cart, check orders
- ✅ Markdown rendering for AI responses
- ✅ Dark/light mode with global CSS variable inversion
- ✅ Mobile accessible (`host: true` in Vite)
- ✅ Navbar uses CSS variables for full theme compliance
- ✅ Toaster uses CSS variables

### Admin AI Config Page (at `/admin/ai-config`)
- Enable/disable AI chat
- Model/provider selection
- System prompt editing
- Temperature/tokens/message context controls
- Usage limits (daily/monthly)

## Known Issues & TODOs

### Immediate
- Redis OTP store unavailable (using memory fallback) — configure Redis in production
- Chat streaming SSE endpoint exists but frontend doesn't use it yet
- Accessibility Dock duplicates Navbar theme toggle — consolidate

### Admin AI Config Enhancements Needed
The current AdminAiConfig.tsx is basic. It needs:
1. **Workspace** — Save/load multiple AI configurations as named profiles
2. **Skills** — Toggle individual tools on/off (search, cart, orders, etc.)
3. **Knowledge Base** — Upload/store documents the AI can reference
4. **Custom Tools** — Text editor to write/import custom JavaScript tools with samples
5. **Seller/Admin Prompts** — Separate prompts for different user roles
6. **Embedding Support** — Vector search for product/content similarity
7. **Tool Configuration** — Per-tool settings (max results, enabled roles)

### UI/UX
- Some components may still have hardcoded colors — search `bg-\[` and `text-\[` patterns
- Mobile menu needs testing on real devices
- Product images use localhost URLs — won't load from phone on dev mode
- Toast position "top-right" may clip on small screens — use responsive positioning

### Performance
- AI responses are slow (2-17 seconds) — consider implementing streaming
- No response caching — repeated queries hit the AI provider each time
- Conversation history grows unbounded — add archiving/purging for old conversations

## Running the Project
```bash
# Backend
cd backend
npx tsx watch src/index.ts    # Dev mode with hot reload

# Frontend  
cd frontend
npx vite                      # Dev server on :5173
```

## AI Tool System Reference

### Adding a New Tool
1. Add function to `backend/src/modules/chat/ai-tools.service.ts`
2. Add tool definition to `TOOL_DEFINITIONS` array in `ai-chat.service.ts`
3. Add case to `executeTool` switch statement
4. Update system prompt description

### Tool Format
```typescript
// Definition
{ name: 'tool_name', description: 'What it does', parameters: { ... } }

// Execution
case 'tool_name':
  return { name, result: await this.methodName(args.param1, args.param2) };
```

## Deployment Notes
- Backend: `PORT=3000 node dist/index.js`
- Frontend: `npx vite build` → serve `dist/` folder
- Database migrations: `npx prisma migrate deploy`
- Environment variables: See `.env` for DATABASE_URL, AI provider keys, etc.