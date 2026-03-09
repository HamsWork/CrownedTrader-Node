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
    app-sidebar.tsx        - Navigation sidebar (role-aware)
    theme-provider.tsx     - Dark/light mode toggle
    signal-card.tsx        - Signal display card component
    stat-card.tsx          - Dashboard stat card
    empty-state.tsx        - Empty state placeholder
    discord-templates/     - Discord template utilities
      index.ts             - Module barrel export
      template-utils.ts    - Client-side preview rendering (uses shared/template-render)
  pages/
    login.tsx              - Login page (no public registration)
    dashboard.tsx          - Dashboard with stats overview
    send-signal.tsx        - Signal submission form with Discord preview
    signal-history.tsx     - Browsable signal history with search/filter
    discord-templates.tsx  - Discord Message Templates page (admin-only, category tabs + cards)
    discord-channels.tsx   - Manage Discord webhook channels
    user-management.tsx    - Admin user/role management
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
  routes.ts                - API routes (auth, users, signals, channels, stats)
  storage.ts               - Database storage layer (IStorage interface)
  seed.ts                  - Seed data (uses shared/template-definitions)
  utils/
    discord.ts             - Discord webhook embed builder + sender (supports content field)
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
- **User Management**: Admin can create/edit/delete users, assign Discord channel webhooks per user
  - Each user can have multiple Discord channel webhooks
  - Channels are managed inline when creating or editing a user
  - User cards show channel count
- **Discord Message Templates**: 30 templates organized by 5 categories (Options, Shares, LETF, LETF Option, Crypto) × 6 action types (Entry Signal, Target TP1 Hit, Target TP2 Hit, SL Raised, Stop Loss Hit, Trade Closed)
  - Category tabs with count badges
  - Template cards with Preview and Send Manual buttons
  - Preview dialog shows full Discord embed with sample data
  - Send Manual dialog with form fields, channel selector, and live preview
- **Signal Submission**: Dynamic form based on template, live Discord embed preview
- **Discord Integration**: Send signals as rich embeds to Discord channels via webhooks, supports @everyone content
  - Channels are owned by users; non-admins only see their own channels
  - Owner authorization enforced on channel CRUD operations
- **Signal History**: Search and filter past signals
- **Dashboard**: Stats overview with recent signals

## Database Tables

- `users` - User accounts (id, username, password, role)
- `signal_types` - Discord message templates (id, name, slug, category, content, variables, titleTemplate, descriptionTemplate, color, fieldsTemplate, footerTemplate, showTitleDefault, showDescriptionDefault)
- `signals` - Submitted signals with JSON data, userId
- `discord_channels` - Discord webhook configurations (id, name, webhookUrl, userId, createdAt) — userId links channel to a user
- `session` - Express sessions (created automatically by connect-pg-simple)

## Environment

- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption secret

## Seed Credentials

- admin / admin123 (role: admin)
- trader1 / user123 (role: user)

## API Routes

- `POST /api/users` - Create user (admin)
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `GET /api/users` - List users (admin)
- `PATCH /api/users/:id/role` - Update user role (admin)
- `DELETE /api/users/:id` - Delete user (admin)
- `GET/POST /api/signal-types` - Signal types (GET: auth, POST: admin)
- `PATCH/DELETE /api/signal-types/:id` - Signal type CRUD (admin)
- `GET/POST /api/signals` - Signals (auth)
- `GET/POST /api/discord-channels` - Discord channels (auth)
- `PATCH/DELETE /api/discord-channels/:id` - Channel CRUD (auth)
- `GET /api/stats` - Dashboard stats (auth)
