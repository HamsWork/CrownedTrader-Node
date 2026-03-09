# Crowned Trader

Trading signal dashboard that lets you create signal types with customizable templates, submit signals with dynamic fields, and send them to Discord via webhooks.

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
    discord-templates/     - Reusable Discord template module
      index.ts             - Module barrel export
      template-card.tsx    - Template display card component
      template-form-dialog.tsx - Create/edit template dialog
      template-utils.ts    - Client-side preview rendering (uses shared/template-render)
  pages/
    login.tsx              - Login page (no public registration)
    dashboard.tsx          - Dashboard with stats overview
    send-signal.tsx        - Signal submission form with Discord preview
    signal-history.tsx     - Browsable signal history with search/filter
    signal-types.tsx       - Discord Templates page (admin-only, uses discord-templates module)
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
    discord.ts             - Discord webhook embed builder + sender
    template.ts            - Re-exports shared/template-render
    validation.ts          - Input validation helpers

shared/
  schema.ts                - Drizzle schema + Zod validation + types
  template-definitions.ts  - Default template data (Options, Shares, LETF, LETF Options, Crypto)
  template-render.ts       - Template variable rendering (shared by client + server)
```

## Key Features

- **Authentication**: Login-only auth (no public registration), bcryptjs password hashing
- **Role System**: Admin and user roles; admin-only pages for templates and user management
- **User Creation**: Admin-only via User Management page
- **Discord Templates**: 5 asset-class templates (Options, Shares, LETF, LETF Options, Crypto) with full create/edit/delete (admin-only)
- **Signal Submission**: Dynamic form based on signal type, live Discord embed preview
- **Discord Integration**: Send signals as rich embeds to Discord channels via webhooks
- **Signal History**: Search and filter past signals
- **Dashboard**: Stats overview with recent signals
- **User Management**: Admin can view/edit roles/delete users

## Database Tables

- `users` - User accounts (id, username, password, role)
- `signal_types` - Signal type templates with JSON variables and templates
- `signals` - Submitted signals with JSON data, userId
- `discord_channels` - Discord webhook configurations
- `session` - Express sessions (created automatically by connect-pg-simple)

## Environment

- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption secret
- Uses `.env` file when not on Replit

## Seed Credentials

- admin / admin123 (role: admin)
- trader1 / user123 (role: user)

## API Routes

- `POST /api/auth/register` - Register new user
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
