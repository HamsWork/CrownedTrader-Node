# Crowned Trader - Feature to File Map

This document cross-references every feature in the Crowned Trader platform to its specific implementing source files, with role descriptions explaining what each file contributes to the feature.

---

## 1. Authentication & Authorization

| File | Role |
|------|------|
| `server/auth.ts` | Custom session auth, bcryptjs password hashing (10 rounds), `requireAuth` and `requireAdmin` middleware |
| `server/index.ts` | Express session middleware setup (`express-session` + `connect-pg-simple`) |
| `shared/schema.ts` | `users` table schema with role field, `loginSchema` and `registerSchema` Zod validators |
| `server/storage.ts` | `getUser()`, `getUserByUsername()`, `createUser()` database operations |
| `client/src/hooks/use-auth.ts` | `useAuth()` hook (fetches `/api/auth/me`), `useLogin()` mutation, `useLogout()` mutation |
| `client/src/pages/login.tsx` | Login form UI with username/password fields |
| `client/src/App.tsx` | Auth-gated routing: shows `LoginPage` or `AuthenticatedApp` based on auth state |
| `client/src/components/app-sidebar.tsx` | Role-aware navigation: shows/hides admin-only menu items |
| `client/src/lib/queryClient.ts` | Default fetcher with 401 handling, `getQueryFn({ on401: "returnNull" })` for auth check |
| `server/routes.ts` | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` endpoint handlers |

---

## 2. Signal Submission Engine

| File | Role |
|------|------|
| `client/src/pages/send-signal.tsx` | Unified Send Signal form: ticker search, instrument detection, option auto-selection, trade plan config, chart upload, live Discord preview |
| `server/routes.ts` | `POST /api/signals` handler: validates signal data, saves to DB, sends to Discord, pushes to TradeSync |
| `server/utils/discord.ts` | `buildEmbed()` constructs Discord embed from template + signal data; `sendToDiscord()` delivers to webhook |
| `server/utils/tradesync.ts` | `buildTradeSyncPayload()` maps signal to TradeSync format; `sendToTradeSync()` POSTs to TradeSync API |
| `shared/schema.ts` | `signals` table schema, `insertSignalSchema` validator, `Signal` type |
| `shared/template-definitions.ts` | 30 template definitions with variables, title/description/field templates per category and action |
| `shared/template-render.ts` | `renderTemplate()` for `{{variable}}` interpolation; `renderFieldsTemplate()` for embed fields |
| `server/storage.ts` | `createSignal()`, `updateSignalDiscordStatus()` database operations |
| `client/src/hooks/use-signals.ts` | `useSignalTypes()`, `useCreateSignal()` hooks for fetching templates and submitting signals |
| `client/src/components/take-profit-level-form.tsx` | Shared TP level editor: level %, take off %, raise SL, trailing stop per level |

---

## 3. Discord Integration

| File | Role |
|------|------|
| `server/utils/discord.ts` | Core Discord webhook client: `buildEmbed()`, `sendToDiscord()`, TLS override, multipart file support |
| `server/utils/template.ts` | Re-exports `renderTemplate` and `renderFieldsTemplate` from shared module |
| `shared/template-definitions.ts` | All 30 template definitions organized by CATEGORIES and ACTION_TYPES |
| `shared/template-render.ts` | Handlebars-style `{{variable}}` rendering logic shared by client and server |
| `shared/schema.ts` | `signalTypes` table schema with template fields (titleTemplate, descriptionTemplate, fieldsTemplate, etc.) |
| `client/src/components/discord-templates/index.ts` | Client-side template module barrel export |
| `client/src/components/discord-templates/template-utils.ts` | Client-side preview rendering utilities |
| `client/src/pages/discord-templates.tsx` | Admin template browser with preview and manual send dialogs |
| `server/seed.ts` | Seeds 30 Discord templates from `shared/template-definitions.ts` on first run |
| `server/routes.ts` | Signal type CRUD endpoints; signal sending logic that calls `buildEmbed` and `sendToDiscord` |

---

## 4. TradeSync Integration

| File | Role |
|------|------|
| `server/utils/tradesync.ts` | `TradeSyncSignal` interface, `buildTradeSyncPayload()` mapper, `sendToTradeSync()` API client |
| `server/routes.ts` | Calls `buildTradeSyncPayload` and `sendToTradeSync` inside `POST /api/signals` handler |
| `client/src/pages/send-signal.tsx` | Trade tracking toggle (Automatic/Manual) that controls `auto_track` flag sent to TradeSync |

---

## 5. Position Management

| File | Role |
|------|------|
| `client/src/pages/position-management.tsx` | Position table with tabs (Open/Closed/All), Partial Exit modal, Full Exit modal, Switch to Manual, P/L display |
| `server/routes.ts` | `PATCH /api/signals/:id/status` (open/close with price/note), `PATCH /api/signals/:id/data` (merge data fields) |
| `server/storage.ts` | `updateSignalStatus()`, `updateSignalData()` database operations |
| `shared/schema.ts` | Signal status, closedAt, closePrice, closeNote fields |
| `client/src/hooks/use-signals.ts` | `useSignals()` for fetching positions, `useUpdateSignalStatus()` and `useUpdateSignalData()` mutations |
| `server/utils/discord.ts` | Builds and sends close/TP hit embeds when positions are partially or fully exited |

---

## 6. Trade Plans

| File | Role |
|------|------|
| `client/src/pages/trade-plans.tsx` | Trade plan CRUD UI: plan list, create/edit modal with live preview, delete confirmation |
| `client/src/components/take-profit-level-form.tsx` | Shared TP level form: configures levelPct, takeOffPct, raiseStopLossTo, trailingStop per level |
| `shared/schema.ts` | `tradePlans` table schema, `takeProfitLevelSchema`, `TakeProfitLevel` type, `insertTradePlanSchema` |
| `server/routes.ts` | CRUD endpoints: GET/POST/PATCH/DELETE `/api/trade-plans` |
| `server/storage.ts` | `getTradePlans()`, `getTradePlansByUser()`, `createTradePlan()`, `updateTradePlan()`, `deleteTradePlan()` |
| `client/src/hooks/use-signals.ts` | `useTradePlans()`, `useCreateTradePlan()`, `useUpdateTradePlan()`, `useDeleteTradePlan()` hooks |

---

## 7. Ticker Intelligence (Polygon.io)

| File | Role |
|------|------|
| `server/routes.ts` | `GET /api/ticker-search` (Polygon search with market filter), `GET /api/ticker-details/:ticker` (metadata + LETF detection), `GET /api/stock-price/:ticker` (latest price), `GET /api/best-option` (auto option selection), `GET /api/option-quote` (specific contract quote) |
| `client/src/pages/send-signal.tsx` | Ticker search input, auto-price fetching, best option auto-selection, LETF underlying price display |

---

## 8. Leaderboard

| File | Role |
|------|------|
| `client/src/pages/dashboard.tsx` | Leaderboard component with period tabs, stats grid, trader ranking table |
| `server/routes.ts` | `GET /api/leaderboard?period=...` endpoint: aggregates signals by user, calculates wins/losses/P&L/win rate |

---

## 9. Signal History

| File | Role |
|------|------|
| `client/src/pages/signal-history.tsx` | Card-based signal browser: date grouping, summary stats, expandable payload, copy, Discord preview |
| `client/src/components/signal-card.tsx` | Individual signal display card component |
| `server/routes.ts` | `GET /api/signals` endpoint returns all signals ordered by creation date |
| `server/storage.ts` | `getSignals()` database query |
| `client/src/hooks/use-signals.ts` | `useSignals()` hook for fetching signal list |

---

## 10. User Management

| File | Role |
|------|------|
| `client/src/pages/user-management.tsx` | Three-view page: user list table, create user form, edit user form; channel editor component |
| `server/routes.ts` | User CRUD endpoints: GET/POST users, PATCH role/password, GET/PUT channels, DELETE user |
| `server/storage.ts` | `getUsers()`, `createUser()`, `updateUserRole()`, `updateUserPassword()`, `updateUserChannels()`, `deleteUser()` |
| `shared/schema.ts` | `users` table schema with `discordChannels` JSONB field, `discordChannelSchema` validator |
| `client/src/hooks/use-signals.ts` | `useUsers()`, `useCreateUser()`, `useUpdateUserRole()`, `useUpdateUserPassword()`, `useUpdateUserChannels()`, `useDeleteUser()` hooks |
| `server/auth.ts` | Password hashing for user creation and password updates |

---

## 11. Discord Templates Page

| File | Role |
|------|------|
| `client/src/pages/discord-templates.tsx` | Category-tabbed template browser, PreviewDialog, SendManualDialog |
| `client/src/components/discord-templates/index.ts` | Module barrel export |
| `client/src/components/discord-templates/template-utils.ts` | Client-side template rendering for previews |
| `shared/template-definitions.ts` | Source of truth for all 30 template definitions |
| `shared/template-render.ts` | Variable interpolation logic |
| `server/routes.ts` | Signal type CRUD endpoints |
| `server/seed.ts` | Initial template seeding from definitions |

---

## 12. Send Technical Analysis

| File | Role |
|------|------|
| `client/src/pages/send-ta.tsx` | TA form: channel selector, commentary input, media upload (drag & drop), live Discord preview |
| `server/routes.ts` | `POST /api/send-ta` handler: processes multipart form, builds TA embed, sends to Discord webhook |
| `server/utils/discord.ts` | Handles file attachment in Discord webhook payload |

---

## 13. Dashboard

| File | Role |
|------|------|
| `client/src/pages/dashboard.tsx` | Stats overview cards, Leaderboard component with period filtering |
| `client/src/components/stat-card.tsx` | Reusable stat display card |
| `server/routes.ts` | `GET /api/stats` (signal counts), `GET /api/leaderboard` (trader rankings) |
| `client/src/hooks/use-signals.ts` | `useStats()` hook |

---

## 14. System Audit

| File | Role |
|------|------|
| `client/src/pages/system-audit.tsx` | Tabbed UI: Overview, Features, Codebase Structure, Latest Updates |
| `server/routes.ts` | `GET /api/audit` endpoint: reads SYSTEM_AUDIT.json, generates dynamic file stats |
| `SYSTEM_AUDIT.md` | Comprehensive architecture narrative document |
| `SYSTEM_AUDIT.json` | Structured data for frontend rendering |
| `FEATURE_FILE_MAP.md` | This document: feature-to-file cross-reference |

---

## 15. Navigation & Layout

| File | Role |
|------|------|
| `client/src/App.tsx` | Root component: auth gate, SidebarProvider, Router with all page routes |
| `client/src/components/app-sidebar.tsx` | Sidebar navigation with role-aware menu items, active state, mobile sheet |
| `client/src/components/theme-provider.tsx` | Dark/light theme toggle with localStorage persistence |
| `client/src/components/ui/sidebar.tsx` | Sidebar primitives (SidebarProvider, SidebarTrigger, mobile Sheet) |

---

## 16. Shared Infrastructure

| File | Role |
|------|------|
| `shared/schema.ts` | All database table definitions, Zod validators, TypeScript types |
| `client/src/lib/queryClient.ts` | TanStack Query client: default fetcher, staleTime, 401 handling, `apiRequest` utility |
| `client/src/lib/utils.ts` | `cn()` utility for className merging |
| `client/src/lib/constants.ts` | `APP_NAME` and other application constants |
| `server/db.ts` | PostgreSQL connection pool via `@neondatabase/serverless` |
| `server/vite.ts` | Vite dev server middleware integration |
| `server/static.ts` | Static file serving for production builds |

---

## 17. Configuration

| File | Role |
|------|------|
| `drizzle.config.ts` | Drizzle ORM config with `tablesFilter: ["!session"]` to skip session table |
| `vite.config.ts` | Vite config with path aliases (@shared, @assets, @) |
| `tailwind.config.ts` | Tailwind config with dark mode class strategy |
| `package.json` | Dependencies and npm scripts |
| `tsconfig.json` | TypeScript compiler configuration |
