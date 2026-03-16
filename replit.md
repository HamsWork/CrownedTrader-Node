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
    discord-send-modal/          - Reusable Discord send modal library
      index.ts                   - Module barrel export
      discord-send-modal.tsx     - Full send modal (channel selector, variables, payload view, preview, send/cancel)
      discord-embed-preview.tsx  - Discord embed preview component (bot avatar, embed card with fields)
      discord-payload-view.tsx   - JSON payload renderer for Discord API format
  pages/
    login.tsx              - Login page (no public registration)
    dashboard.tsx          - Dashboard with stats overview
    send-signal.tsx        - Unified trade entry form with template-driven Discord preview
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
  - Template cards with expandable inline Discord embed preview (eye icon toggle) and Send button
  - Section-based embed rendering: spacer fields → thin gap dividers, inline fields → 3-col grid, block fields → full-width
  - Thin `w-1` left color strip on embed (Discord-accurate), Discord colors (#313338 bg, #2b2d31 embed, #dbdee1 text, #b5bac1 labels)
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
- **Dashboard**: Stats overview (Total Signals, Signal Types, Sent to Discord) with Crowned Traders leaderboard
- **Signal History**: Card-based signal browser grouped by date, with summary stats, expandable payload, copy and Discord preview
- **Leaderboard**: Trader rankings by period (this_week, last_week, this_month, last_month) with performance metrics
- **System Audit**: Comprehensive architecture reference page with tabbed UI (Overview, Features, Codebase, Updates); backed by `SYSTEM_AUDIT.json`, `SYSTEM_AUDIT.md`, `FEATURE_FILE_MAP.md`

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
- `PATCH /api/signals/:id/data` - Merge data fields into signal (auth)
- `GET /api/stats` - Dashboard stats (auth)
- `GET /api/leaderboard?period=...` - Trader leaderboard (auth, periods: this_week, last_week, this_month, last_month)
- `GET /api/audit` - System audit data with features, codebase stats, updates (admin)
- `GET /api/ticker-search?q=...&market=...` - Search tickers via Polygon API (auth)
- `GET /api/ticker-details/:ticker` - Instrument metadata and classification (auth)
- `GET /api/option-quote` - Specific option contract quote (auth)

## Responsive Design

All pages use consistent responsive patterns:
- Outer padding: `p-4 sm:p-6` on all page containers (including loading/error states)
- Headings: `text-xl sm:text-2xl` for page titles, `text-xs sm:text-sm` for subtitles
- Table cells: `px-3 sm:px-4` for responsive cell padding
- Wide tables: `min-w-[...]` with `overflow-x-auto` wrapper for horizontal scroll
- Dialogs/modals: `w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto`
- Button groups: `flex-wrap` for wrapping on small screens
- System Audit: Mobile card view (`sm:hidden` cards, `hidden sm:block` table)
- Position Management tabs: Shortened labels on mobile (`Open` vs `Open Positions`)
- Stats grids: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` (dashboard), `grid-cols-3` (signal history)

## Design Choices

- No separate `discord_channels` table — channels are stored as JSONB on the user record
- Signals reference channels by name (`discordChannelName`) rather than by ID
- Server looks up the webhook URL from the sending user's channel list at send time
- `drizzle.config.ts` uses `tablesFilter: ["!session"]` to skip session table on push
- `queryClient` staleTime: Infinity; useAuth uses `getQueryFn({ on401: "returnNull" })`
- Template rendering fallback: `{{key}}` for unresolved variables
