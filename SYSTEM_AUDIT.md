# Crowned Trader - System Audit

## System Overview

Crowned Trader is a full-stack trading signal management and distribution platform built with TypeScript. It enables traders to generate, track, and distribute trading signals across multiple asset classes (Options, Shares, LETF, LETF Option, Crypto) via Discord webhooks, while simultaneously pushing trades to the TradeSync external tracking system.

The platform supports role-based access (admin vs. user), comprehensive position lifecycle management (entry through exit with P/L tracking), customizable trade plans with multi-tier take-profit strategies, and a live Discord embed preview system that renders signals exactly as they'll appear in Discord before sending.

---

## Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | Node.js | Server-side JavaScript execution |
| Language | TypeScript | Type-safe development across frontend and backend |
| Backend Framework | Express.js | HTTP server, routing, middleware |
| Database | PostgreSQL | Persistent data storage |
| ORM | Drizzle ORM | Type-safe database queries and schema management |
| Frontend Framework | React 18 | Component-based UI |
| Build Tool | Vite | Development server and production bundling |
| Styling | Tailwind CSS | Utility-first CSS framework |
| UI Components | shadcn/ui (Radix UI) | Accessible component primitives |
| Data Fetching | TanStack Query v5 | Server state management and caching |
| Routing | wouter | Lightweight client-side routing |
| Authentication | express-session + bcryptjs | Custom session-based authentication |
| Validation | Zod | Runtime type validation |
| Market Data | Polygon.io API | Real-time stock/option pricing |
| Notifications | Discord Webhooks | Rich embed message delivery |
| Trade Tracking | TradeSync API | External automated trade tracking |

### Architectural Patterns

**Shared Type System**: The `shared/` directory contains database schemas (Drizzle), validation schemas (Zod), and TypeScript types that are imported by both client and server. This guarantees type consistency across the stack.

**Repository Pattern**: All database operations go through the `IStorage` interface in `server/storage.ts`, which is implemented by `DatabaseStorage`. Routes never access the database directly.

**Template System**: Discord embed templates are defined declaratively in `shared/template-definitions.ts` with Handlebars-style `{{variable}}` interpolation. The same rendering logic (`shared/template-render.ts`) runs on both client (for live preview) and server (for actual Discord delivery).

**Query-First Frontend**: TanStack Query manages all server state. The `queryClient` is configured with `staleTime: Infinity` and a default fetcher, so queries only need a `queryKey` (the API URL). Mutations use `apiRequest` and invalidate cache by key.

**Session-Based Auth**: Authentication uses custom session-based auth with bcryptjs password hashing (10 salt rounds). Sessions are stored in PostgreSQL via `connect-pg-simple`. The frontend checks `GET /api/auth/me` on mount; a 401 response shows the login page.

---

## Features

### 1. Authentication & Authorization

**What it does**: Provides login-only authentication (no public registration) with role-based access control. Admin users can access all pages; regular users see only trading-related pages.

**How it works**:
- Users authenticate via `POST /api/auth/login` with username/password
- Passwords are hashed with bcryptjs (10 salt rounds)
- Sessions are stored in PostgreSQL via `connect-pg-simple`
- `requireAuth` middleware checks for valid session on protected routes
- `requireAdmin` middleware additionally checks `user.role === "admin"`
- Frontend `useAuth` hook fetches `GET /api/auth/me` with `on401: "returnNull"` to determine auth state
- Sidebar navigation conditionally shows admin-only items based on role

**Seed accounts**: Default accounts are created in `server/seed.ts` for initial access. Credentials should be changed after first login.

**Key files**: `server/auth.ts`, `server/index.ts`, `client/src/hooks/use-auth.ts`, `client/src/pages/login.tsx`

---

### 2. Signal Submission Engine

**What it does**: Provides a unified form for creating and sending trading signals across all asset classes. Supports options, shares, LETF, LETF options, and crypto with instrument-specific fields, auto-pricing, and live Discord preview.

**How it works**:
1. User selects a ticker via search (Polygon.io API for autocomplete)
2. System auto-detects instrument category (Stock, ETF, LETF, Crypto) from Polygon metadata
3. Stock price is auto-fetched; for LETFs, the underlying ticker price is also fetched via `LETF_UNDERLYING_MAP`
4. If "Is Option" is enabled (default), best option contract is auto-selected based on trade type (Scalp/Swing/Leap) using progressive delta/DTE/OI/spread filters
5. User configures trade plan (saved preset or live custom with TP levels, stop loss, trailing stops)
6. Live Discord embed preview renders in real-time as the form is filled
7. On submit, the signal is:
   - Saved to the `signals` database table
   - Sent to Discord via the user's configured webhook channel
   - Pushed to TradeSync API for automated trade tracking
8. Chart analysis image can optionally be attached (multipart upload)

**Instrument modes**:
- **Options**: Ticker + Call/Put + Expiration + Strike + Option Price
- **Shares**: Ticker + Long/Short + Stock Price
- **LETF**: Like shares but with underlying price mapping
- **LETF Option**: Like options but with LETF underlying mapping
- **Crypto**: Forces `isOption = false`; strips "X:" prefix from display

**Key files**: `client/src/pages/send-signal.tsx`, `server/routes.ts` (POST /api/signals), `server/utils/discord.ts`, `server/utils/tradesync.ts`

---

### 3. Discord Integration

**What it does**: Sends trading signals as rich embedded messages to Discord channels via webhooks. Supports 30 pre-defined templates across 5 instrument categories and 6 action types.

**How it works**:
- Each user has Discord channels stored as JSONB on their user record (`discordChannels: [{name, webhookUrl}]`)
- When a signal is sent, the server builds a Discord embed using `buildEmbed()`:
  1. Loads the matching signal type template
  2. Renders title, description, and fields using `{{variable}}` interpolation
  3. Applies category-specific color coding
  4. Adds footer with disclaimer
  5. Posts to the webhook URL via `sendToDiscord()`
- The `content` field (e.g., "@everyone") is sent alongside the embed
- File attachments (chart images) are sent as multipart form data
- TLS verification is disabled (`NODE_TLS_REJECT_UNAUTHORIZED = "0"`) for compatibility

**Template categories**: Options, Shares, LETF, LETF Option, Crypto
**Action types**: Entry Signal, Target TP1 Hit, Target TP2 Hit, SL Raised, Stop Loss Hit, Trade Closed

**Key files**: `server/utils/discord.ts`, `shared/template-definitions.ts`, `shared/template-render.ts`, `client/src/components/discord-templates/`

---

### 4. TradeSync Integration

**What it does**: Pushes trade signals to an external TradeSync dashboard for automated position tracking and portfolio management.

**How it works**:
- When a signal is submitted, `buildTradeSyncPayload()` constructs the payload:
  - Maps ticker, instrument type, direction (Call/Put/Long/Short)
  - Calculates stop loss price (% based or underlying price based)
  - Builds targets object with TP prices, take-off percentages, and raise-SL rules
  - Sets time stop based on trade type (Scalp: 2 days, Swing: 5 days, Leap: 10 days)
  - Includes Discord webhook URL for TradeSync's own notifications
- Payload is POSTed to `{TRADESYNC_BASE_URL}/api/ingest/signals` with Bearer token auth
- Auto-track flag controls whether TradeSync monitors the position automatically

**Key files**: `server/utils/tradesync.ts`, `server/routes.ts` (POST /api/signals)

---

### 5. Position Management

**What it does**: Tracks all trading positions from entry through exit, supporting partial exits (take profit hits), full exits (with reason classification), and manual tracking mode.

**How it works**:
- Positions are signals with `status: "open"` or `status: "closed"`
- The Position Management page shows three tabs: Open, Closed, All
- For each position, the system displays: ticker, contract details, entry price, current mark price, P/L %, realized P/L %, and tracking mode
- **Partial Exit**: Triggered at TP levels. Shows Discord preview of the TP hit embed, sends to Discord, and updates signal data fields
- **Full Exit**: Offers three reason types (Take Profit, Stop Loss, Trailing Stop). User enters current price, system calculates P/L, sends closing embed to Discord
- **Switch to Manual**: For auto-tracked signals, converts to manual tracking mode
- Position data updates use `PATCH /api/signals/:id/data` to merge new fields into the JSONB `data` column

**Key files**: `client/src/pages/position-management.tsx`, `server/routes.ts` (PATCH /api/signals/:id/status, PATCH /api/signals/:id/data), `server/storage.ts`

---

### 6. Trade Plans

**What it does**: Provides customizable presets for take-profit/stop-loss strategies that can be saved, loaded, and applied when sending signals.

**How it works**:
- Each trade plan defines:
  - Target type: "% based (Option)" or "Underlying Price Based"
  - Stop loss percentage
  - Take profit levels (array of {levelPct, takeOffPct, raiseStopLossTo, trailingStop})
- Plans are scoped to users (admin can see all)
- One plan can be marked as default (auto-selected in Send Signal form)
- The Send Signal form offers "Saved Plan" or "Live Custom" modes
- Live Custom mode exposes the full trade plan editor inline
- Plans include a live Discord embed preview showing how targets will appear

**Key files**: `client/src/pages/trade-plans.tsx`, `client/src/components/take-profit-level-form.tsx`, `server/routes.ts` (CRUD /api/trade-plans), `shared/schema.ts`

---

### 7. Ticker Intelligence

**What it does**: Provides real-time ticker search, price fetching, instrument classification, and automated best option contract selection via the Polygon.io API.

**How it works**:
- **Ticker Search**: `GET /api/ticker-search?q=...&market=...` searches Polygon with optional market filter. Crypto tickers have "X:" prefix stripped for display but re-added for API calls
- **Ticker Details**: `GET /api/ticker-details/:ticker` fetches instrument metadata. Classifies as Stock, ETF, LETF, or Crypto. For LETFs, maps to underlying using `LETF_UNDERLYING_MAP`
- **Stock Price**: `GET /api/stock-price/:ticker` fetches latest price via Polygon previous close endpoint
- **Best Option**: `GET /api/best-option` auto-selects the optimal option contract:
  1. Fetches option chain from Polygon
  2. Filters by trade type parameters (Scalp: near-term ATM, Swing: moderate DTE, Leap: longer DTE)
  3. Progressive fallback: tries strict filters first, relaxes delta/OI/spread thresholds on failure
  4. Returns expiration, strike, and option price

**LETF Underlying Map**: Maps leveraged ETFs to their underlying indices (e.g., TQQQ -> QQQ, SOXL -> SOXX, SPXL -> SPY)

**Key files**: `server/routes.ts` (ticker-search, ticker-details, stock-price, best-option endpoints)

---

### 8. Leaderboard

**What it does**: Ranks traders by performance metrics over configurable time periods.

**How it works**:
- `GET /api/leaderboard?period=...` aggregates signal data
- Supported periods: this_week, last_week, this_month, last_month
- For each trader: counts trades, wins, losses, calculates average P/L and win rate
- Win determination is based on realized P/L from closed positions
- Dashboard displays the leaderboard with rank indicators and a crown icon for the top trader
- Stats grid shows aggregate totals: Trades, Wins, Losses, Avg P/L, Win Rate

**Key files**: `client/src/pages/dashboard.tsx`, `server/routes.ts` (GET /api/leaderboard)

---

### 9. Signal History

**What it does**: Provides a searchable, browsable audit log of all trading signals sent through the system.

**How it works**:
- Displays signals grouped by date in a card-based layout
- Each card shows: ticker, instrument type, trade type, Discord delivery status, timestamp
- Summary stats at top: Total Sent, Success (delivered to Discord), Failed
- Expandable raw payload section shows the full JSONB data
- Copy button copies payload to clipboard
- Discord preview button shows the embed as it appeared in Discord
- Search filters signals by ticker name
- Cards arranged in a 2-column grid on desktop, single column on mobile

**Key files**: `client/src/pages/signal-history.tsx`, `server/routes.ts` (GET /api/signals)

---

### 10. User Management

**What it does**: Admin interface for creating, editing, and deleting user accounts with role assignment and Discord channel configuration.

**How it works**:
- **User List** (`/users`): Table showing all users with role badges, channel counts, edit/delete actions
- **Create User** (`/users/create`): Full-page form with username, password, role selection, and channel editor
- **Edit User** (`/users/:id/edit`): Edit role, change password, manage Discord channels
- **Channel Editor**: Inline component for adding/removing Discord channel entries (name + webhook URL pairs)
- Channels are stored as JSONB array on the user record (no separate table)
- Admin cannot delete themselves
- Delete requires confirmation via AlertDialog

**Key files**: `client/src/pages/user-management.tsx`, `server/routes.ts` (user CRUD endpoints), `server/storage.ts`

---

### 11. Discord Templates

**What it does**: Admin page for browsing, previewing, and manually sending the 30 pre-defined Discord message templates.

**How it works**:
- Templates organized by category tabs (Options, Shares, LETF, LETF Option, Crypto)
- Each template displayed as a card with name, slug, variable list, and field preview
- **Preview Dialog**: Renders a full Discord embed preview with sample data for the selected category
- **Send Manual Dialog**: Form with channel selector and variable inputs. Left side shows the form, right side shows live Discord embed preview. Sends to selected Discord webhook on submit
- Templates are seeded at startup from `shared/template-definitions.ts`
- Category count badges show how many templates exist per category

**Key files**: `client/src/pages/discord-templates.tsx`, `client/src/components/discord-templates/`, `shared/template-definitions.ts`

---

### 12. Send Technical Analysis

**What it does**: Allows posting technical analysis commentary with media (images or videos) to Discord channels.

**How it works**:
- User selects a destination Discord channel
- Enters analysis commentary text
- Uploads an image or video file via drag & drop or file picker
- Live Discord preview shows the embed with media
- On submit, sends as a multipart form to `POST /api/send-ta`
- Server constructs a Discord embed with the commentary and attached media
- Supports image formats (PNG, JPG, WebP) and video formats

**Key files**: `client/src/pages/send-ta.tsx`, `server/routes.ts` (POST /api/send-ta)

---

### 13. Dashboard

**What it does**: Overview page showing aggregate signal statistics and the Crowned Traders leaderboard.

**How it works**:
- **Stats Cards**: Three cards showing Total Signals, Signal Types, Sent to Discord
- **Leaderboard**: Full leaderboard component with period filtering
- Stats fetched from `GET /api/stats`
- Leaderboard fetched from `GET /api/leaderboard?period=...`

**Key files**: `client/src/pages/dashboard.tsx`, `client/src/components/stat-card.tsx`, `server/routes.ts`

---

### 14. System Audit

**What it does**: Comprehensive reference page documenting the entire system's architecture, features, codebase structure, and latest updates.

**How it works**:
- Displays system overview with architecture description
- Browsable feature reference with detailed explanations
- Codebase file listing with line counts and last modified timestamps
- Feature-to-file cross-reference map
- Latest update log with change explanations
- Data served from `GET /api/audit` which combines static documentation with dynamic file stats

**Key files**: `client/src/pages/system-audit.tsx`, `server/routes.ts` (GET /api/audit), `SYSTEM_AUDIT.json`, `FEATURE_FILE_MAP.md`

---

## Data Flow

### Signal Submission Flow

```
User fills Send Signal form
  -> Ticker search (Polygon API)
  -> Auto-fetch stock price
  -> Auto-select best option (if applicable)
  -> User configures trade plan (saved or live custom)
  -> Live Discord preview renders in real-time
  -> Submit
    -> POST /api/signals
      -> Save signal to database
      -> Build Discord embed from template
      -> Send embed to Discord webhook
      -> Build TradeSync payload
      -> POST to TradeSync API
    -> Response with signal ID
    -> Frontend navigates to position management
```

### Position Lifecycle

```
Signal Created (status: "open")
  -> Position Management tracks it
  -> Mark price fetched periodically
  -> User triggers Partial Exit (TP hit)
    -> Discord embed sent for TP hit
    -> Signal data updated with TP details
  -> User triggers Full Exit
    -> Reason selected (TP / SL / Trailing Stop)
    -> Exit price entered
    -> P/L calculated
    -> Discord embed sent for close
    -> Signal status set to "closed"
```

### Authentication Flow

```
Browser loads app
  -> GET /api/auth/me
  -> 401: Show login page
  -> 200: Show authenticated app with sidebar
    -> Login: POST /api/auth/login
      -> Session created, stored in PostgreSQL
      -> Redirect to dashboard
    -> Logout: POST /api/auth/logout
      -> Session destroyed
      -> Redirect to login
```

---

## Database Schema

### users
| Column | Type | Description |
|--------|------|-------------|
| id | serial (PK) | Auto-incrementing user ID |
| username | text (unique) | Login username |
| password | text | bcrypt-hashed password |
| role | text (default: "user") | "admin" or "user" |
| discord_channels | jsonb | Array of {name, webhookUrl} |

### signal_types
| Column | Type | Description |
|--------|------|-------------|
| id | serial (PK) | Template ID |
| name | text | Display name (e.g., "Options Entry Signal") |
| slug | text | Machine identifier (e.g., "signal_alert") |
| category | text | Instrument category |
| content | text | Message content (e.g., "@everyone") |
| variables | jsonb | Array of {name, type, label} |
| title_template | text | Embed title with {{variables}} |
| description_template | text | Embed description with {{variables}} |
| color | varchar(7) | Hex color for embed sidebar |
| fields_template | jsonb | Array of {name, value} field templates |
| footer_template | text | Embed footer text |
| show_title_default | boolean | Whether to show title |
| show_description_default | boolean | Whether to show description |
| created_at | timestamp | Creation time |

### signals
| Column | Type | Description |
|--------|------|-------------|
| id | serial (PK) | Signal ID |
| signal_type_id | integer | Reference to signal_types (nullable) |
| user_id | integer | Sending user ID |
| data | jsonb | Signal payload (ticker, prices, etc.) |
| discord_channel_name | text | Channel name used for delivery |
| sent_to_discord | boolean | Whether Discord delivery succeeded |
| status | text | "open" or "closed" |
| closed_at | timestamp | When position was closed |
| close_price | text | Exit price |
| close_note | text | Closing notes |
| created_at | timestamp | Signal creation time |

### trade_plans
| Column | Type | Description |
|--------|------|-------------|
| id | serial (PK) | Plan ID |
| user_id | integer | Owner user ID |
| name | text | Plan display name |
| target_type | text | "% based (Option)" or "Underlying Price Based" |
| stop_loss_pct | text | Stop loss percentage |
| take_profit_levels | jsonb | Array of TP level configs |
| is_default | boolean | Whether this is the user's default plan |
| created_at | timestamp | Creation time |

### session
| Column | Type | Description |
|--------|------|-------------|
| sid | varchar (PK) | Session ID |
| sess | json | Session data |
| expire | timestamp | Expiration time |

---

## API Reference

### Authentication
- `POST /api/auth/login` - Login with username/password
- `POST /api/auth/logout` - Destroy session
- `GET /api/auth/me` - Get current user (includes discordChannels)

### Users (Admin)
- `GET /api/users` - List all users
- `POST /api/users` - Create user with optional channels
- `PATCH /api/users/:id/role` - Update role
- `PATCH /api/users/:id/password` - Update password
- `GET /api/users/:id/channels` - Get user channels
- `PUT /api/users/:id/channels` - Replace user channels
- `DELETE /api/users/:id` - Delete user

### Signal Types
- `GET /api/signal-types` - List all templates
- `POST /api/signal-types` - Create template (admin)
- `PATCH /api/signal-types/:id` - Update template (admin)
- `DELETE /api/signal-types/:id` - Delete template (admin)

### Signals
- `GET /api/signals` - List all signals
- `POST /api/signals` - Create and send signal (multipart for chart uploads)
- `PATCH /api/signals/:id/status` - Update status (open/closed)
- `PATCH /api/signals/:id/data` - Merge data fields

### Trade Plans
- `GET /api/trade-plans` - List plans (user-scoped; admin sees all)
- `GET /api/trade-plans/:id` - Get single plan
- `POST /api/trade-plans` - Create plan
- `PATCH /api/trade-plans/:id` - Update plan
- `DELETE /api/trade-plans/:id` - Delete plan

### Market Data
- `GET /api/ticker-search?q=...&market=...` - Search tickers
- `GET /api/ticker-details/:ticker` - Get instrument metadata
- `GET /api/stock-price/:ticker` - Get latest price
- `GET /api/best-option` - Auto-select best option contract
- `GET /api/option-quote` - Get specific option quote

### Technical Analysis
- `POST /api/send-ta` - Send TA with media (multipart)

### Dashboard
- `GET /api/stats` - Dashboard statistics
- `GET /api/leaderboard?period=...` - Trader leaderboard

### System
- `GET /api/audit` - System audit data (admin)

---

## Latest Updates

### Position Management Overhaul
- Rebuilt with tab navigation (Open/Closed/All positions)
- Added Partial Exit modal with Discord preview and TP level detection
- Added Full Exit modal with Take Profit/Stop Loss/Trailing Stop reason classification
- Added "Switch to Manual" tracking mode for auto-tracked signals
- Signal data field updates via PATCH /api/signals/:id/data

### Dashboard Leaderboard
- Removed Recent Signals section
- Added Crowned Traders Leaderboard with period filtering (This Week, Last Week, This Month, Last Month)
- Stats grid with aggregate performance metrics

### Signal History Redesign
- Rebuilt as card-based layout grouped by date
- Added summary stats (Total Sent, Success, Failed)
- Added expandable raw payload viewer
- Added copy and Discord preview actions

### System Audit Enhancement
- Transformed from file listing to comprehensive architecture reference
- Added feature documentation, data flow diagrams, and cross-reference maps
- Browsable tabbed UI with Overview, Features, Codebase, and Updates sections

### Responsive Design
- All pages use consistent responsive patterns (p-4 sm:p-6 padding)
- Mobile-friendly tables with horizontal scroll
- Responsive dialogs and modals
- Mobile card views for complex data tables
