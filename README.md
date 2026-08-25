# Spotify 2.O

Spotify 2.O is a full-stack music streaming application built with Next.js. Users can discover and search songs, play audio, manage liked songs and playlists, upload music, subscribe to a premium plan, and join shared music rooms with synchronized playback and chat.

> This repository is a personal project and is not affiliated with Spotify. The application requires external Supabase, Stripe, and WebSocket configuration before it can run as a complete service.

## Features

- Email magic-link, Google, and GitHub authentication through Supabase Auth.
- Home, explore, search, liked songs, library, and playlist views.
- Global audio player with play, pause, seek, volume, next, previous, random, and repeat controls.
- Song likes and user-created playlists with artwork and descriptions.
- MP3 and cover-art uploads to Supabase Storage for premium users.
- Stripe subscription checkout with a seven-day trial, promotion codes, and customer portal access.
- Music rooms with room codes, shared song selection, and chat over WebSockets.
- Responsive interface styled with Tailwind CSS and animated with Framer Motion.

## Technology

- Next.js 13.5 with the App Router
- React 18 and TypeScript
- Supabase Auth, Postgres, and Storage
- Stripe subscriptions and webhooks
- WebSocket server using `ws`
- Tailwind CSS, Radix UI, Framer Motion, Zustand, React Hook Form, and React Hot Toast
- Vercel Analytics and Speed Insights

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Home page with recent songs, playlists, and shortcuts |
| `/all` | Browse all songs and sort by title or creation date |
| `/search?title=...` | Search songs by title |
| `/liked` | View liked songs |
| `/library` | View songs uploaded by the current user |
| `/playlist/[id]` | View and play a playlist |
| `/account` | View profile, providers, subscription status, checkout, and billing portal |
| `/music-room` | Create or enter a music-room code |
| `/room/[id]` | Use synchronized playback and chat in a room |

The application also exposes these server endpoints:

- `GET /api/songs?title=...` searches songs by title.
- `POST /api/create-checkout-session` creates a Stripe subscription checkout session.
- `POST /api/create-portal-link` creates a Stripe customer portal link.
- `POST /api/webhooks` receives Stripe product, price, checkout, and subscription events.

## Prerequisites

- Node.js 18 or later
- npm
- A Supabase project with Auth, database tables, and Storage configured
- A Stripe account with at least one recurring price
- A WebSocket service for music rooms

## Configuration

Create a `.env.local` file in the project root. Do not commit it.

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
# Optional live-mode webhook secret. It takes precedence when set.
STRIPE_WEBHOOK_SECRET_LIVE=whsec_...

# Application URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
# Used as a fallback by Vercel deployments.
NEXT_PUBLIC_VERCEL_URL=
```

The service-role key is server-only and must never be exposed to the browser. The public Supabase values and Stripe publishable key are intended for client-side use; secret keys must remain private.

## Supabase Setup

The code expects these database tables and relationships:

- `users`
- `songs`
- `liked_songs`
- `playlists`
- `subscriptions`
- `products`
- `prices`
- `customers`
- `messages` for room chat

The generated database types are kept in [`types_db.ts`](types_db.ts). This repository does not include migrations or seed data, so create the schema separately and configure Row Level Security policies appropriate for your deployment.

Create two Storage buckets:

- `songs` for uploaded MP3 files
- `images` for cover art and playlist images

The application reads public Storage URLs, so configure bucket visibility and Storage policies accordingly. Configure email, Google, and GitHub providers in Supabase Auth if those sign-in methods are required. Add the local and production callback URLs to each provider configuration.

## Install and Run

Install dependencies:

```bash
npm install
```

Start the Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For a production build:

```bash
npm run build
npm start
```

## Stripe Setup

1. Create a recurring Stripe price.
2. Configure the price and product records so they are available to the application.
3. Set the Stripe keys in `.env.local`.
4. Configure a Stripe webhook pointing to `/api/webhooks`.
5. Subscribe the webhook to product, price, checkout, and subscription events handled in [`app/api/webhooks/route.ts`](app/api/webhooks/route.ts).

Checkout creates a subscription with a seven-day trial and allows promotion codes. The webhook synchronizes Stripe products, prices, customers, and subscription status into Supabase.

For local webhook testing, use the [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward events to `http://localhost:3000/api/webhooks` and use the generated signing secret as `STRIPE_WEBHOOK_SECRET`.

## Music Room WebSocket Service

The room client currently connects to the external endpoint configured directly in [`app/room/[id]/page.tsx`](app/room/[id]/page.tsx) and [`app/room/[id]/components/Chat.tsx`](app/room/[id]/components/Chat.tsx):

```text
wss://spotify-backend-r813.onrender.com
```

The repository also contains [`server.js`](server.js), a standalone `ws` server that listens on port `8080`, persists chat messages in Supabase, broadcasts song selections, and removes messages older than one hour. Run it directly when using that server locally:

```bash
node server.js
```

The current `start:ws` script references `server.ts`, which is not present in the repository. Until that script is corrected, use `node server.js` directly or update the script to match the service you deploy. A normal Vercel serverless deployment should not be expected to host this long-running WebSocket process; deploy it to a persistent Node-compatible host and update the client endpoint for that host.

## Project Structure

```text
app/             App Router pages, layouts, API routes, and route components
actions/         Server-side data-access functions
components/      Shared UI, player, modal, and upload components
hooks/           Playback, authentication, upload, subscription, and room hooks
libs/            Supabase admin, Stripe, URL, and helper integrations
providers/       Supabase, user, modal, and toast providers
public/          Static images and other public assets
server.js        Standalone WebSocket server for music rooms
types.ts         Application TypeScript types
types_db.ts      Supabase database type definitions
```

Playback state is managed with Zustand in [`hooks/usePlayer.ts`](hooks/usePlayer.ts). Audio and artwork URLs are generated from Supabase Storage paths by [`hooks/useLoadSongUrl.ts`](hooks/useLoadSongUrl.ts) and [`hooks/useLoadImage.ts`](hooks/useLoadImage.ts). Authentication sessions are refreshed by [`middleware.ts`](middleware.ts).

## NPM Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Create a production build |
| `npm start` | Start the production Next.js server |
| `npm run lint` | Run Next.js linting |
| `npm run start:ws` | Intended to start the WebSocket service; currently references missing `server.ts` |

## Deployment Checklist

- Add all required environment variables to the hosting platform.
- Configure Supabase Auth providers, database tables, RLS policies, and Storage buckets.
- Configure Stripe products, recurring prices, and the production webhook secret.
- Set `NEXT_PUBLIC_SITE_URL` to the public application URL.
- Deploy the WebSocket service separately and point the room client at its `wss://` endpoint.
- Verify that Supabase Storage URLs, OAuth callbacks, checkout redirects, and Stripe webhooks work in production.

## Current Limitations

- No automated test suite or database migrations are included.
- The WebSocket client and the included server are not wired through a shared environment variable.
- Room playback synchronization and chat currently use separate client connection paths.
- The `start:ws` npm script is out of sync with the checked-in server filename.
- Some browse sections intentionally display a limited number of songs or playlists.

## License

No license file is currently included. Add a license before distributing or reusing the project publicly.
