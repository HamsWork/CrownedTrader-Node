# Crowned Trader

Trading signal dashboard that lets you send trading signals using categorized Discord message templates to Discord channels via webhooks.

## Architecture

- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter (frontend), Express (backend)
- **Auth**: Session-based (express-session + connect-pg-simple), bcryptjs password hashing

## Project Structure

```
client/src/
  components/
    app-sidebar.tsx              - Navigation sidebar (role-aware)
    theme-provider.tsx           - Dark/light mode toggle
    signal-card.tsx              - Signal display card component
    stat-card.tsx                - Dashboard stat card
    empty-state.tsx              - Empty state placeholder
    take-profit-level-form.tsx   - Shared TP level form (used by send-signal + trade-plans)
    discord-templates/           - Discord template utilities
      index.ts                   - Module barrel export
      template-utils.ts          - Client-side preview rendering (uses shared/template-render)
  pages/
    login.tsx              - Login page (no public registration)
    dashboard.tsx          - Dashboard with stats overview
    send-signal.tsx        - Unified trade entry form with live Discord preview
    send-ta.tsx            - Technical Analysis post with media upload and Discord preview
    trade-plans.tsx        - Trade plan tracking with target/stop-loss management
    position-management.tsx - Position management with open/close tracking and P&L
    discord-templates.tsx  - Discord Message Templates page (admin-only, category tabs + cards)
    user-management.tsx    - Admin user management (list, create page, edit page)
  hooks/
    use-auth.ts            - Auth hooks (useAuth, useLogin, useLogout)
    use-signals.ts         - All API hooks (queries + mutations)
  lib/
    constants.ts           - App constants, colors
    queryClient.ts         - TanStack Query config with 401 handling

server/
  index.ts                 - Express app entry with session middleware
  auth.ts                  - Auth helpers (hash, compare, requireAuth, requireAdmin)
  db.ts                    - Database connection
  routes.ts                - API routes (auth, users, signals, stats)
  storage.ts               - Database storage layer (IStorage interface)
  seed.ts                  - Seed data (uses shared/template-definitions)
  utils/
    discord.ts             - Discord webhook embed builder + sender (supports content field)
    tradesync.ts           - TradeSync API client (sends signals to external TradeSync dashboard)
    template.ts            - Re-exports shared/template-render
    validation.ts          - Input validation helpers

shared/
  schema.ts                - Drizzle schema + Zod validation + types
  template-definitions.ts  - 30 templates (6 actions × 5 categories) with CATEGORIES, ACTION_TYPES, SAMPLE_TICKERS
  template-render.ts       - Template variable rendering (shared by client + server)
```

## Key Features

- **Authentication**: Login-only auth (no public registration), bcryptjs password hashing
- **Role System**: Admin and user roles; admin-only pages for templates and user management
- **User Management**: Admin can create/edit/delete users via dedicated pages (/users, /users/create, /users/:id/edit)
  - Discord channel webhooks stored as JSONB array on user record (no separate table)
  - Full-page create form with account details + channel editor
  - Full-page edit form with role, password change, and channel management
  - User list displayed as a data table
  - Delete confirmation via AlertDialog
- **Discord Message Templates**: 30 templates organized by 5 categories (Options, Shares, LETF, LETF Option, Crypto) × 6 action types (Entry Signal, Target TP1 Hit, Target TP2 Hit, SL Raised, Stop Loss Hit, Trade Closed)
  - Category tabs with count badges
  - Template cards with Preview and Send Manual buttons
  - Preview dialog shows full Discord embed with sample data
  - Send Manual dialog with form fields, channel selector, and live preview
- **Signal Submission**: Unified trade entry form with live Discord embed preview, collapsible trade plan section with Live Custom (full form matching Edit Trade Plan) or saved presets
  - Auto-fetches stock price from Polygon when ticker is selected
  - Auto-selects best option contract (expiration, strike, option price) based on trade type (Scalp/Swing/Leap) when Is Option is ON and Manual Contract is OFF
  - Best option selection uses progressive fallback levels matching CrownedTrader Django app logic (delta, DTE, OI, spread filters)
  - Sends signal to TradeSync API (`POST /api/ingest/signals`) with Bearer token auth alongside Discord delivery
  - TradeSync payload includes: ticker, instrumentType, direction, entryPrice, stop_loss, targets (with raise_stop_loss), time_stop, auto_track, underlying_price_based, discord_channel_webhook
- **Send TA**: Post technical analysis with image/video upload and optional commentary to Discord channels via webhooks; drag & drop media, live Discord preview
- **Trade Plans**: Preset builder for take-profit levels — configure Level %, Take Off %, Raise stop loss to, Trailing Stop per level; live Discord preview; save/load/delete presets
- **Discord Integration**: Send signals as rich embeds to Discord channels via webhooks, supports @everyone content
  - Channels stored on user record; channel selection uses user's own channels
- **Position Management**: Track open/closed positions with P&L calculation, close with exit price and notes, reopen positions
- **Dashboard**: Stats overview (Total Signals, Signal Types, Sent to Discord) with recent signals

## Database Tables

- `users` - User accounts (id, username, password, role, discordChannels JSONB array of {name, webhookUrl})
- `signal_types` - Discord message templates (id, name, slug, category, content, variables, titleTemplate, descriptionTemplate, color, fieldsTemplate, footerTemplate, showTitleDefault, showDescriptionDefault)
- `signals` - Submitted signals (id, signalTypeId (optional), userId, data JSONB, discordChannelName, sentToDiscord, status, closedAt, closePrice, closeNote, createdAt)
- `trade_plans` - Trade plan presets (id, userId, name, targetType, stopLossPct, takeProfitLevels JSONB array of {levelPct, takeOffPct, raiseStopLossTo, trailingStop}, isDefault, createdAt)
- `session` - Express sessions (created automatically by connect-pg-simple)

## Environment

- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption secret
- `POLYGON_API_KEY` - Polygon.io API key for stock/option data
- `TRADESYNC_API_KEY` - TradeSync API key for pushing signals to TradeSync dashboard

## Seed Credentials

- admin / admin123 (role: admin)
- trader1 / user123 (role: user)

## API Routes

- `POST /api/users` - Create user with optional channels (admin)
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user (includes discordChannels)
- `GET /api/users` - List users (admin)
- `PATCH /api/users/:id/role` - Update user role (admin, cannot change own)
- `PATCH /api/users/:id/password` - Update user password (admin)
- `GET /api/users/:id/channels` - Get user's channels (admin)
- `PUT /api/users/:id/channels` - Replace user's channels (admin)
- `DELETE /api/users/:id` - Delete user (admin, cannot delete self)
- `POST /api/send-ta` - Send TA (auth, multipart/form-data with media file + channel + commentary)
- `GET/POST /api/signal-types` - Signal types (GET: auth, POST: admin)
- `PATCH/DELETE /api/signal-types/:id` - Signal type CRUD (admin)
- `GET/POST /api/signals` - Signals (auth, signalTypeId optional)
- `PATCH /api/signals/:id/status` - Update signal status (open/closed) with optional closePrice and closeNote
- `GET /api/trade-plans` - Trade plans (auth, scoped to user; admin sees all)
- `GET /api/trade-plans/:id` - Single trade plan (auth, owner or admin)
- `POST /api/trade-plans` - Create trade plan (auth)
- `PATCH /api/trade-plans/:id` - Update trade plan (auth, owner or admin, whitelisted fields only)
- `DELETE /api/trade-plans/:id` - Delete trade plan (auth, owner or admin)
- `GET /api/stock-price/:ticker` - Get current stock price via Polygon API (auth)
- `GET /api/best-option` - Auto-select best option contract via Polygon API (auth, params: underlying, side, tradeType, underlyingPrice)
- `GET /api/stats` - Dashboard stats (auth)

## Design Choices

- No separate `discord_channels` table — channels are stored as JSONB on the user record
- Signals reference channels by name (`discordChannelName`) rather than by ID
- Server looks up the webhook URL from the sending user's channel list at send time
- `drizzle.config.ts` uses `tablesFilter: ["!session"]` to skip session table on push
- `queryClient` staleTime: Infinity; useAuth uses `getQueryFn({ on401: "returnNull" })`
- Template rendering fallback: `{{key}}` for unresolved variables
