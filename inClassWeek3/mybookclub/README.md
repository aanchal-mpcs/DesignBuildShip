# Book Club

A shared class book club built with Next.js 16, Clerk, Supabase, and the Open Library API. Search for books, build your reading list, track your progress, follow classmates, and discover what everyone is reading.

**Vercel URL:** https://mybookclub.vercel.app

**GitHub URL:** https://github.com/aanchal-mpcs/DesignBuildShip

---

## Features

- **Search** books via the Open Library API and people by name
- **Reading list** with status tracking (want to read / reading / finished)
- **Book detail pages** with descriptions, subjects, free reading links, and "readers also saved" recommendations
- **Reviews and ratings** (1--5 stars) per book
- **Discussion threads** with replies on each book
- **Recommendations** -- recommend books to classmates with a personal note
- **Custom shelves** -- organize books into named collections
- **Follow system** -- follow readers, see their activity in a personalized feed
- **Community page** -- browse all members, sorted by follower count
- **Weekly digest** -- trending books, recently finished, and activity feed
- **Reading challenges** -- set a yearly goal, track progress with a visual bar
- **Private notes** -- personal annotations per book
- **Reading dates** -- auto-tracked start/finish with duration
- **Public/private toggle** -- control which books others can see
- **Search history** -- recent and trending searches, deletable
- **CSV export** of your entire reading list
- **Dark/light mode** toggle with system preference detection
- **Editorial design** -- Bodoni Moda + EB Garamond, warm cream/gold palette

---

## Reflection Questions

### 1. Trace a request: a user searches, saves, and views it on their profile. What systems are involved?

**Search:** The browser (React client component) sends a fetch request to the Open Library API (`openlibrary.org/search.json?q=...`). Open Library returns JSON with book titles, authors, cover IDs, and work keys. The results render client-side using Next.js and `next/image` (which proxies cover images from `covers.openlibrary.org`). If the user is signed in, the search query is also inserted into the `search_history` table in Supabase.

**Save:** When the user clicks "+ Add to list", the client component calls Supabase's REST API (via `@supabase/supabase-js`) to insert a row into the `favorites` table with the user's Clerk ID, book title, author, cover URL, Open Library key, and a default status of `want_to_read`. Supabase validates the insert against the table schema and RLS policy, then returns the new row.

**View on profile:** When someone visits `/user/[id]`, Next.js renders a server component that creates a Supabase client and queries `favorites` (filtered to `is_public = true`) joined with `users` via the foreign key. It also queries `reviews` for the average rating, `challenges` for the reading goal, and `follows` for follower/following counts. The server returns fully rendered HTML to the browser. Clerk's middleware (`proxy.ts`) runs on every request to handle session validation.

**Systems involved:** Browser -> Clerk (auth session) -> Next.js server (SSR) -> Supabase (PostgreSQL) -> Open Library API (external) -> Vercel (hosting/CDN).

### 2. Why should your app call the external API from the server (API route) instead of directly from the browser?

There are several reasons to prefer server-side API calls:

- **API keys and secrets:** If an external API requires authentication, server-side calls keep secrets out of the browser. Anyone can inspect network requests in DevTools and extract keys embedded in client-side code.
- **CORS restrictions:** Many APIs don't set permissive CORS headers. Server-side calls bypass CORS entirely since it's a server-to-server request.
- **Rate limiting:** A server can centralize and throttle requests, whereas N browser clients hitting an API directly means N times the traffic and risk of hitting rate limits.
- **Data transformation:** The server can filter, reshape, or cache API responses before sending a smaller, cleaner payload to the client, reducing bandwidth and hiding internal data structures.
- **Caching:** Server-side responses can be cached at the edge (via Vercel's caching or ISR), so repeated requests for the same data don't hit the external API at all.

In this app, the Open Library API is called directly from the browser because it's a public API with no authentication, permissive CORS, and the search results are user-specific (not cacheable). For the CSV export endpoint (`/api/export`), we use a server-side API route because it queries Supabase and builds a file download.

### 3. A classmate signs up on your app. What data does Clerk store vs. what does Supabase store? How are they connected?

**Clerk stores:**
- Authentication credentials (password hash, OAuth tokens)
- Email address, name, profile picture
- Session tokens and JWTs
- Sign-in/sign-up history and security events
- The unique user ID (e.g., `user_3C3JAbzQApFOuSqG0FU1btpIBQW`)

**Supabase stores:**
- A mirror row in the `users` table with `clerk_id`, `email`, and `name`
- All application data: favorites, reviews, discussions, recommendations, follows, shelves, challenges, search history

**How they're connected:** When a user signs in, the `SyncUser` client component checks if a row with their `clerk_id` exists in Supabase's `users` table. If not, it inserts one. The `clerk_id` is the foreign key that links all application tables back to the user. Clerk owns the identity (who is this person?), Supabase owns the data (what have they done in the app?). A Clerk JWT template signed with the Supabase JWT secret allows authenticated Supabase queries via the `accessToken` callback, enabling Row Level Security policies to verify the user's identity.

### 4. Ask Claude (with MCP) to describe your database. Paste the response. Does it match your mental model?

**Claude's response via Supabase MCP (`list_tables` + `execute_sql`):**

> The database has 10 tables in the public schema, all with RLS enabled:
>
> | Table | Rows | Description |
> |---|---|---|
> | **users** | 2 | `id` (uuid PK), `clerk_id` (text unique), `email`, `name`, `created_at` |
> | **favorites** | 4 | `id` (uuid PK), `user_id` (text FK->users.clerk_id), `title`, `author`, `cover_url`, `ol_key`, `status` (want_to_read/reading/finished), `is_public` (bool), `notes`, `started_at`, `finished_at`, `created_at` |
> | **reviews** | 0 | `id` (uuid PK), `user_id` (FK), `ol_key`, `rating` (1--5), `body`, `created_at`. Unique on (user_id, ol_key). |
> | **discussions** | 0 | `id` (uuid PK), `ol_key`, `user_id` (FK), `body`, `parent_id` (self-referencing FK for replies), `created_at` |
> | **recommendations** | 0 | `id` (uuid PK), `from_user_id` (FK), `to_user_id` (FK), `ol_key`, `title`, `author`, `cover_url`, `note`, `is_read` (bool), `created_at` |
> | **follows** | 1 | `id` (uuid PK), `follower_id` (FK), `following_id` (FK), `created_at`. Unique on (follower_id, following_id), check constraint prevents self-follows. |
> | **challenges** | 0 | `id` (uuid PK), `user_id` (FK), `goal` (int), `year` (int), `created_at`. Unique on (user_id, year). |
> | **shelves** | 0 | `id` (uuid PK), `user_id` (FK), `name`, `created_at` |
> | **shelf_books** | 0 | `id` (uuid PK), `shelf_id` (FK->shelves), `favorite_id` (FK->favorites). Unique on (shelf_id, favorite_id). |
> | **search_history** | 0 | `id` (uuid PK), `user_id` (FK), `query`, `searched_at`. Indexed on (user_id, searched_at DESC). |

**Does it match my mental model?** Yes. The schema reflects the exact feature set: `users` as the identity bridge to Clerk, `favorites` as the core reading list with status tracking and visibility, and then a constellation of social tables (`reviews`, `discussions`, `recommendations`, `follows`) and organizational tables (`shelves`, `shelf_books`, `challenges`, `search_history`) that all reference users via `clerk_id`. The foreign key from `favorites.user_id` to `users.clerk_id` is the central join that makes the homepage and community views work. The self-referencing `parent_id` on `discussions` enables threaded replies without a separate table.

---

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Auth:** Clerk (`@clerk/nextjs` v7)
- **Database:** Supabase (PostgreSQL)
- **External API:** Open Library (search + book details + covers)
- **Styling:** Tailwind CSS 4
- **Fonts:** Bodoni Moda (display), EB Garamond (body)
- **Hosting:** Vercel
