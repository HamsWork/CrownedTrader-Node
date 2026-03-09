# Crowned Trader

Trading signal dashboard that lets you create signal types with customizable templates, submit signals with dynamic fields, and send them to Discord via webhooks.

## Architecture

- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter (frontend), Express (backend)

## Project Structure

```
client/src/
  components/
    app-sidebar.tsx        - Navigation sidebar
    theme-provider.tsx     - Dark/light mode toggle
    signal-card.tsx        - Signal display card component
    stat-card.tsx          - Dashboard stat card
    empty-state.tsx        - Empty state placeholder
  pages/
    dashboard.tsx          - Dashboard with stats overview
    send-signal.tsx        - Signal submission form with Discord preview
    signal-history.tsx     - Browsable signal history with search/filter
    signal-types.tsx       - CRUD for signal type templates
    discord-channels.tsx   - Manage Discord webhook channels
  hooks/
    use-signals.ts         - All API hooks (queries + mutations)
  lib/
    constants.ts           - App constants, colors
    queryClient.ts         - TanStack Query config

server/
  index.ts                 - Express app entry
  db.ts                    - Database connection
  routes.ts                - API routes
  storage.ts               - Database storage layer (IStorage interface)
  seed.ts                  - Seed data
  utils/
    discord.ts             - Discord webhook embed builder + sender
    template.ts            - Template variable replacement utility

shared/
  schema.ts                - Drizzle schema + Zod validation
```

## Key Features

- **Signal Types**: Customizable templates with variables, title/description/fields/footer templates, colors
- **Signal Submission**: Dynamic form based on signal type, live Discord embed preview
- **Discord Integration**: Send signals as rich embeds to Discord channels via webhooks
- **Signal History**: Search and filter past signals
- **Dashboard**: Stats overview with recent signals

## Database Tables

- `users` - User accounts (serial id)
- `signal_types` - Signal type templates with JSON variables and templates
- `signals` - Submitted signals with JSON data
- `discord_channels` - Discord webhook configurations

## Environment

- `DATABASE_URL` - PostgreSQL connection string
- Uses `.env` file when not on Replit
