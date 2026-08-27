# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Next.js dev server on :3000
npm run build      # production build
npm start          # serve the production build
npm run lint       # next lint (eslint-config-next/core-web-vitals only)
node server.js     # WebSocket server for music rooms, port 8080
```

`npm run start:ws` is broken — it points at `server.ts`, which does not exist. Use `node server.js`.

There is no test suite, no test runner, and no database migrations in this repo.

## Environment

Env vars live in `.env` at the repo root (**this file is tracked by git** — `.gitignore` only excludes `.env*.local`). Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_SITE_URL`.

`next.config.js` hardcodes the Supabase project hostname in `images.domains`. Pointing the app at a different Supabase project requires editing that list or `next/image` will reject every cover-art URL.

## Architecture

Next.js 13.5 App Router, TypeScript, `@/*` aliased to the repo root.

### Composition root

`app/layout.tsx` is an async server component with `export const revalidate = 0` (nothing is cached anywhere). It fetches the sidebar's song list and the Stripe product list on every request and wires the provider stack:

`ToasterProvider` → `SupabaseProvider` (`SessionContextProvider` with a browser client) → `UserProvider` (`MyUserContextProvider` from `hooks/useUser.tsx`) → `ModalProvider` + `Sidebar` (wraps all page content) + `Player`.

`ModalProvider` mounts every modal globally behind a hydration guard; modals are opened from anywhere through Zustand toggle hooks (`useAuthModel`, `useUploadModal`, `useSubscribeModal`, `usePlaylistModal`). `useUser` layers Supabase `users` + active `subscriptions` rows on top of the Supabase session and throws if used outside its provider. `middleware.ts` exists solely to refresh the auth session cookie.

### Data access

Two separate paths, with no shared repository layer:

- **Server**: `actions/*.ts` — each is a standalone async function creating `createServerComponentClient({ cookies })` and returning plain rows. Called from server page components (and from `app/api/songs/route.ts`).
- **Client**: components call `useSupabaseClient()` / `useSessionContext()` directly and run their own inline mutations (`LikeButton`, `UploadModal`, `AddToPlaylist`, `PlaylistModal`), then `router.refresh()` to re-run the server components.

Tables: `users`, `songs`, `liked_songs`, `playlists`, `subscriptions`, `products`, `prices`, `customers`, `messages`. `types_db.ts` is generated from Supabase; `types.ts` holds the hand-written app-level shapes actually used in components.

Storage uses two buckets, `songs` and `images`. Rows store bucket-relative paths (`song_path`, `image_path`); URLs are resolved client-side via `getPublicUrl` in `hooks/useLoadSongUrl.ts` and `hooks/useLoadImage.ts` — never store full URLs in the DB.

Playlists keep membership in a `song_ids` array column, mutated read-modify-write with toggle semantics in `components/AddToPlaylist.tsx`.

### Playback

`hooks/usePlayer.ts` is a Zustand store holding only `ids` (the queue), `activeId`, `isPlaying`, `volume`, `soundPosition`, `soundDuration`. There is no audio element in the store.

`components/Player.tsx` resolves `activeId` → song row → public URL, then renders `PlayerContent` **keyed by `songUrl`**. Switching tracks therefore remounts `PlayerContent` and its `use-sound` (howler) instance — this remount *is* the track-change mechanism, so preserve the `key` when editing. Position is polled from howler every 500ms into the store.

`hooks/useOnPlay.ts` is the single entry point for starting playback from any list: it opens the auth modal when signed out, then sets `activeId` plus the full list as the queue. The subscription gate in it is commented out, so premium gating is currently inactive even though Stripe checkout works.

### Stripe

All Stripe↔Supabase syncing lives in `libs/supabaseAdmin.ts` (service-role client): product/price upserts, customer creation, and `manageSubscriptionStatusChange`. It is driven by `app/api/webhooks/route.ts`. The client side goes `libs/helpers.ts#postData` → `/api/create-checkout-session` → `libs/stripeClientl.ts` (filename typo is intentional/load-bearing for imports) → `redirectToCheckout`. Checkout is created with a 7-day trial and promotion codes enabled.

### Music rooms — three overlapping WebSocket implementations

Only `server.js` is real. When touching room features, know which is which:

- **`server.js`** — the working server. Plain `ws` on port 8080, reads the room code from the URL path segment, replays that room's `messages` rows on connect, broadcasts `{type:'PLAY_SONG', songId}` and `{type:'CHAT', email, content, full_name, avatar_url}` to **all** clients (not scoped per room), persists chat to Supabase, and deletes messages older than an hour on an interval.
- **`app/api/websocket/route.ts`** — a non-functional port of the same logic; it reaches for `req.socket.server`, which does not exist in an App Router route handler. Dead code.
- **`hooks/useWebSocket.ts`** — a generic hook that the room pages do not use.

`app/room/[id]/page.tsx` and `app/room/[id]/components/Chat.tsx` each open their **own** connection to the hardcoded endpoint `wss://spotify-backend-r813.onrender.com/<roomCode>` — the URL is not read from an env var, and there are two sockets per room member. `Chat.tsx` additionally fetches history straight from Supabase with its own anon-key client, duplicating the server's replay. Room codes are 6-character client-generated strings with no server-side room registry.

## Conventions

- Every route directory carries its own `loading.tsx` and `error.tsx`; add both when creating a route.
- Page components are server components that call `actions/*` and delegate to a `components/` child marked `"use client"` for interactivity.
- User feedback is `react-hot-toast` throughout; Supabase errors are surfaced with `toast.error(error.message)` rather than thrown.
- Shared framer-motion variants live in `variants.js` at the repo root.
- `src/components/` is empty and unused — components belong in the root-level `components/` directory.
