# NBA Live Scores

Real-time NBA scores app. Users sign up, pick favorite teams, and see live/final/upcoming games with scores that update in real time via WebSocket.

## Architecture Overview

Three deployed services, one external data source:

```
balldontlie.io API
        |
        | HTTP GET every 15s
        v
  +-----------+        UPSERT        +------------------+
  |  Railway  | --------------------> |    Supabase      |
  |  Worker   |   (service role key)  |  Postgres + Auth |
  +-----------+                       |  + Realtime      |
                                      +------------------+
                                            |    ^
                          WebSocket push    |    |  HTTP (auth, queries)
                          (live scores)     v    |
                                      +------------------+
                                      |  Vercel          |
                                      |  Next.js 16 App  |
                                      +------------------+
                                            |
                                            v
                                        Browsers
```

### Vercel -- Frontend (this repo)

- Next.js 16, TypeScript, Tailwind CSS
- Server Components for initial data fetch (fast first paint)
- Client components subscribe to Supabase Realtime for live updates
- Proxy (`src/proxy.ts`) handles session refresh and auth redirects
- Static routes: `/login`, `/signup`, `/onboarding`
- Dynamic route: `/dashboard` (server component, requires auth)
- API routes: `/api/teams` (CDN cached 24h), `/api/user/favorites`

### Railway -- Score Poller Worker

- Long-running process that polls balldontlie.io every 15 seconds during live games
- Writes to Supabase using the **service role key** (bypasses RLS)
- Decouples user count from API rate limits: 1 poller serves all users
- The polling endpoint logic lives at `src/app/api/cron/poll-scores/route.ts` -- extract this into a standalone Node script for Railway, or call it via HTTP from a Railway cron
- Polling cadence: 15s during live games, 60s when no live games, paused when no games scheduled

### Supabase -- Database + Auth + Realtime

- **Postgres** with four tables: `teams`, `profiles`, `user_favorites`, `games`
- **Auth**: email/password signup with JWT, integrates with RLS
- **Realtime**: Postgres WAL changes on `games` table broadcast via WebSocket to subscribed clients
- **RLS policies**: users read/write own profile and favorites; games readable by all authenticated users; poller uses service role key
- Migration: `supabase/migrations/001_initial_schema.sql`

## The Fan-Out Pattern

This is the core architectural decision. One server-side poller writes scores to Postgres. Supabase Realtime broadcasts row changes to all connected clients. No client ever calls the external API directly.

Whether 10 or 10,000 users are online, there is still only ONE external API call every 15 seconds.

```
Poller (1 process) --> Postgres UPSERT --> WAL --> Supabase Realtime --> N clients
```

## Database Schema

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `teams` | Static reference, 30 NBA teams | id, name, abbreviation, city, conference, division |
| `profiles` | Extends auth.users | id (FK auth.users), username |
| `user_favorites` | Many-to-many join | user_id, team_id (composite PK) |
| `games` | Cached game data from poller | id, date, status, period, time, home/away team+score |

`games.status` is one of: `scheduled`, `live`, `final`.

Indexes: `home_team_id`, `away_team_id`, `(date, status)`.

A trigger auto-creates a `profiles` row on signup.

## Project Structure

```
src/
  app/
    (auth)/login/         -- Login page
    (auth)/signup/        -- Signup page
    onboarding/           -- TeamPicker (post-signup)
    dashboard/            -- Main view (server component initial fetch)
    api/teams/            -- GET all 30 teams (CDN cached)
    api/user/favorites/   -- PATCH user's favorite team IDs
    api/cron/poll-scores/ -- Poller logic (fetches balldontlie, upserts games)
  components/
    auth/                 -- LoginForm, SignupForm
    onboarding/           -- TeamPicker (grid of 30 teams, multi-select)
    dashboard/            -- Dashboard, GameSection, LiveGameCard,
                             CompletedGameCard, UpcomingGameCard
  hooks/
    useRealtimeScores.ts  -- Supabase channel subscription lifecycle
    useFavoriteTeams.ts   -- Read user_favorites from Supabase
  lib/
    supabase/client.ts    -- Browser Supabase client (@supabase/ssr)
    supabase/server.ts    -- Server Supabase client (cookies-based)
    supabase/middleware.ts -- Session refresh helper used by proxy
    sports-api/balldontlie.ts -- Typed wrapper for balldontlie.io
    nba-teams.ts          -- Static list of 30 NBA teams
    types.ts              -- Game, Team, Profile, UserFavorite types
    utils/game-status.ts  -- classifyGames(), formatGameTime()
  proxy.ts                -- Next.js 16 proxy (replaces middleware)
supabase/
  migrations/001_initial_schema.sql -- Tables, RLS, triggers, seed data
```

## Data Flow

1. **Dashboard load** (server): `DashboardPage` server component fetches user favorites + today's games from Supabase, passes as props to client `Dashboard`
2. **Realtime** (client): `useRealtimeScores` subscribes to `postgres_changes` on `games` table, filters by favorite team IDs client-side, merges updates into state
3. **Poller** (Railway): Fetches balldontlie.io, maps response to `games` row shape, upserts to Postgres. The upsert triggers WAL replication which Supabase Realtime picks up automatically.

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL      -- Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY -- Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY     -- Supabase service role key (server only, poller)
BALLDONTLIE_API_KEY           -- balldontlie.io key (optional for free tier)
CRON_SECRET                   -- Bearer token to secure the poll endpoint
```

Set these in Vercel (frontend) and Railway (worker). The service role key and CRON_SECRET must never be exposed to the client.

## Commands

```sh
npm run dev       # Start dev server (localhost:3000)
npm run build     # Production build
npm run lint      # ESLint
```

## Key Conventions

- Next.js 16 uses `proxy.ts` (not `middleware.ts`) -- exported function must be named `proxy`
- Supabase clients: use `lib/supabase/server.ts` in server components/route handlers, `lib/supabase/client.ts` in client components
- Team IDs in this app match balldontlie.io team IDs (1-30)
- Game IDs are balldontlie.io game IDs (integers)
- All game writes go through the service role client (bypasses RLS)
- External API is balldontlie.io v1 (`https://api.balldontlie.io/v1`)
