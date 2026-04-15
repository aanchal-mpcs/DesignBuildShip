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
- Dynamic routes: `/login`, `/signup`, `/onboarding`, `/dashboard`
- API routes: `/api/teams` (CDN cached 24h), `/api/user/favorites`
- Vercel Cron calls `/api/cron/poll-scores` daily as a fallback; primary polling runs on Railway
- Deployed at: https://nba-live-scores.vercel.app

### Railway -- Score Poller Worker

- Long-running process that polls balldontlie.io every 15 seconds during live games
- Writes to Supabase using the **service role key** (bypasses RLS)
- Decouples user count from API rate limits: 1 poller serves all users
- The polling endpoint logic lives at `src/app/api/cron/poll-scores/route.ts` -- extract this into a standalone Node script for Railway, or call it via HTTP from a Railway cron
- Polling cadence: 15s during live games, 60s when no live games, paused when no games scheduled

### Supabase -- Database + Auth + Realtime

Project ID: `cowvfrepvadirtvdurez`

- **Postgres** with two NBA tables: `nba_games`, `nba_favorites` (prefixed to avoid collision with existing book-app tables)
- **Auth**: Supabase Auth with JWT, integrates with RLS via `auth.jwt() ->> 'sub'`
- **Realtime**: `nba_games` added to `supabase_realtime` publication -- any INSERT/UPDATE pushes over WebSocket to subscribed clients
- **RLS policies**:
  - `nba_games`: SELECT open to everyone (public scoreboard)
  - `nba_favorites`: SELECT/INSERT/DELETE scoped to `jwt.sub = user_id`
  - Poller uses service role key (bypasses RLS) for writes

## The Fan-Out Pattern

This is the core architectural decision. One server-side poller writes scores to Postgres. Supabase Realtime broadcasts row changes to all connected clients. No client ever calls the external API directly.

Whether 10 or 10,000 users are online, there is still only ONE external API call every 15 seconds.

```
Poller (1 process) --> Postgres UPSERT --> WAL --> Supabase Realtime --> N clients
```

## Database Schema

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `nba_games` | Cached game data from poller | id (int PK), home_team, away_team (abbreviations), home_score, away_score, status, game_clock, home_logo, away_logo, date, scheduled_at, updated_at |
| `nba_favorites` | Teams each user follows | id (uuid PK), user_id (text), team_abbr (text), created_at; UNIQUE(user_id, team_abbr) |

`nba_games.status` is one of: `scheduled`, `live`, `final`.

`nba_games.game_clock` stores formatted strings like `Q4 2:31`, `Halftime`, `OT 1:05`.

`home_logo` / `away_logo` are NBA CDN URLs (`cdn.nba.com/logos/nba/{id}/global/L/logo.svg`).

Indexes: `home_team`, `away_team`, `(date, status)`, `nba_favorites(user_id)`.

## Project Structure

```
src/
  app/
    (auth)/login/         -- Login page (force-dynamic)
    (auth)/signup/        -- Signup page (force-dynamic)
    onboarding/           -- TeamPicker (force-dynamic)
    dashboard/            -- Main view (server component initial fetch)
    dashboard/loading.tsx -- Skeleton loading state
    api/teams/            -- GET all 30 teams (CDN cached 24h)
    api/user/favorites/   -- PATCH user's favorite team abbreviations
    api/cron/poll-scores/ -- Poller logic (fetches balldontlie, upserts nba_games)
  components/
    auth/                 -- LoginForm, SignupForm
    onboarding/           -- TeamPicker (grid of 30 teams by conference, multi-select)
    dashboard/            -- Dashboard, GameSection, LiveGameCard,
                             CompletedGameCard, UpcomingGameCard
  hooks/
    useRealtimeScores.ts  -- Supabase channel subscription on nba_games
    useFavoriteTeams.ts   -- Read nba_favorites from Supabase
  lib/
    supabase/client.ts    -- Browser Supabase client (@supabase/ssr)
    supabase/server.ts    -- Server Supabase client (cookies-based)
    supabase/middleware.ts -- Session refresh helper used by proxy
    sports-api/balldontlie.ts -- Typed wrapper for balldontlie.io v1
    nba-teams.ts          -- Static list of 30 NBA teams (id, abbreviation, city, conference)
    types.ts              -- Game, NbaFavorite types
    utils/game-status.ts  -- classifyGames(), formatGameTime()
  proxy.ts                -- Next.js 16 proxy (replaces middleware)
supabase/
  migrations/001_initial_schema.sql -- Original migration (superseded by MCP migration)
```

## Data Flow

1. **Dashboard load** (server): `DashboardPage` server component fetches user favorites from `nba_favorites` + today's games from `nba_games` filtered by favorite team abbreviations, passes as props to client `Dashboard`
2. **Realtime** (client): `useRealtimeScores` subscribes to `postgres_changes` on `nba_games` table, filters by favorite abbreviations client-side, merges updates into React state
3. **Poller** (Railway): Fetches balldontlie.io, maps response to `nba_games` row shape (with abbreviations, logos, game clock), upserts to Postgres. The upsert triggers WAL replication which Supabase Realtime picks up automatically.

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL      -- Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY -- Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY     -- Supabase service role key (server only, poller)
BALLDONTLIE_API_KEY           -- balldontlie.io key (optional for free tier)
CRON_SECRET                   -- Bearer token to secure the poll endpoint
```

Set these in Vercel (frontend) and Railway (worker). The service role key and CRON_SECRET must never be exposed to the client.

Currently set on Vercel for production environment (placeholder values -- replace with real Supabase credentials).

## Commands

```sh
npm run dev       # Start dev server (localhost:3000)
npm run build     # Production build
npm run lint      # ESLint
```

## Key Conventions

- Next.js 16 uses `proxy.ts` (not `middleware.ts`) -- exported function must be named `proxy`
- Supabase clients: use `lib/supabase/server.ts` in server components/route handlers, `lib/supabase/client.ts` in client components
- Teams are identified by abbreviation (e.g. `LAL`, `BOS`, `CHI`), not numeric IDs
- Game IDs are balldontlie.io game IDs (integers), used as the `nba_games` primary key
- All game writes go through the service role client (bypasses RLS)
- External API is balldontlie.io v1 (`https://api.balldontlie.io/v1`)
- Auth pages and onboarding are `force-dynamic` to avoid build-time prerender failures without env vars
- Vercel Hobby plan only supports daily crons; sub-minute polling must run on Railway
