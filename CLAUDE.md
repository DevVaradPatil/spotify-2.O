# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Next.js dev server on :3000
npm run build        # production build
npm start            # serve the production build
npm run lint         # next lint + jsx-a11y
npm run typecheck    # tsc --noEmit
npm run format       # prettier --write .
npm run format:check # prettier --check . (CI gate)
```

Everything runs on Vercel — there is no second host and no separate process to
start. CI (`.github/workflows/ci.yml`) gates on typecheck, lint, format, build,
and `npm audit --omit=dev --audit-level=high`.

There is still no test suite or test runner. Migrations live in
`supabase/migrations/`; several are written but **not yet applied** — check
`IMPROVEMENT_PLAN.md` before assuming the live schema matches them.

## Environment

Env vars live in `.env`, which is gitignored. `.env.example` documents every
key and which are server-only. See `IMPROVEMENT_PLAN.md` §3.0 for the history:
`.env` was tracked and public for 604 days.

`next.config.js` derives the Supabase image hostname from
`NEXT_PUBLIC_SUPABASE_URL` via `remotePatterns`, so pointing at a different
project no longer needs a code edit. It also sets the security headers,
including a **report-only** CSP that has not yet been promoted to enforcing.

## Architecture

Next.js 13.5 App Router, TypeScript, `@/*` aliased to the repo root.

### Composition root

`app/layout.tsx` is an async server component with `export const revalidate = 0` (nothing is cached anywhere). It fetches the sidebar's song list and the Stripe product list on every request and wires the provider stack:

`ToasterProvider` → `SupabaseProvider` (`SessionContextProvider` with a browser client) → `UserProvider` (`MyUserContextProvider` from `hooks/useUser.tsx`) → `ModalProvider` + `Sidebar` (wraps all page content) + `Player`.

`ModalProvider` mounts every modal globally behind a hydration guard; modals are opened from anywhere through Zustand toggle hooks (`useAuthModel`, `useUploadModal`, `useSubscribeModal`, `usePlaylistModal`). `useUser` layers Supabase `users` + active `subscriptions` rows on top of the Supabase session and throws if used outside its provider. `middleware.ts` exists solely to refresh the auth session cookie.

### Data access

Two separate paths, with no shared repository layer:

- **Server**: `actions/*.ts` — each is a standalone async function creating `createServerComponentClient({ cookies })` and returning plain rows. Called from server page components (and from `app/api/songs/route.ts`).
- **Client**: components call `useSupabaseClient()` / `useSessionContext()` directly and run their own inline mutations (`UploadModal`, `AddToPlaylist`, `PlaylistModal`), then `router.refresh()` to re-run the server components.

Likes are the exception: `hooks/useLikedSongs.tsx` fetches the user's liked ids
once at the layout level and every `LikeButton` reads from that set with
optimistic updates. Do not reintroduce a per-row query.

Tables: `users`, `songs`, `liked_songs`, `playlists`, `subscriptions`, `products`, `prices`, `customers`, `messages`. `types_db.ts` is generated from Supabase; `types.ts` holds the hand-written app-level shapes actually used in components.

Storage uses two buckets, `songs` and `images`. Rows store bucket-relative paths (`song_path`, `image_path`); URLs are resolved client-side via `getPublicUrl` in `hooks/useLoadSongUrl.ts` and `hooks/useLoadImage.ts` — never store full URLs in the DB.

Playlists keep membership in a `song_ids` array column, mutated read-modify-write with toggle semantics in `components/AddToPlaylist.tsx`.

### Playback

`hooks/usePlayer.ts` is a Zustand store holding only `ids` (the queue),
`activeId`, `isPlaying`, and `volume`. There is no audio element in the store.

**Always subscribe with a selector** — `usePlayer((s) => s.activeId)`, never
`usePlayer()`. Playback position is deliberately _not_ in this store; it ticks
every 500ms and lives in `PlayerContent` local state. Putting it back would
re-render every subscriber twice a second.

`components/Player.tsx` resolves `activeId` → song row → public URL, then renders `PlayerContent` **keyed by `songUrl`**. Switching tracks therefore remounts `PlayerContent` and its `use-sound` (howler) instance — this remount _is_ the track-change mechanism, so preserve the `key` when editing. Position is polled from howler every 500ms into the store.

`hooks/useOnPlay.ts` is the single entry point for starting playback from any list: it opens the auth modal when signed out, then sets `activeId` plus the full list as the queue. The subscription gate in it is commented out, so premium gating is currently inactive even though Stripe checkout works.

### Stripe

All Stripe↔Supabase syncing lives in `libs/supabaseAdmin.ts` (service-role client): product/price upserts, customer creation, and `manageSubscriptionStatusChange`. It is driven by `app/api/webhooks/route.ts`. The client side goes `libs/helpers.ts#postData` → `/api/create-checkout-session` → `libs/stripeClientl.ts` (filename typo is intentional/load-bearing for imports) → `redirectToCheckout`. Checkout is created with a 7-day trial and promotion codes enabled.

### Music rooms — Supabase Realtime

There is no separate WebSocket server. `server.js` and its Render deployment
were removed: Vercel cannot host a long-lived socket process, and the room
feature did not need one.

`hooks/useRoomChannel.ts` is the whole implementation. It opens one Supabase
Realtime channel per room (`room:<CODE>`) carrying three things:

- **`broadcast`** on the `PLAY_SONG` event for track changes — ephemeral, since
  a late joiner does not need history.
- **`postgres_changes`** on `INSERT` into `messages` filtered by `room_code`,
  so chat persistence and delivery are the same mechanism. `messages.user_id`
  plus an RLS `with check (auth.uid() = user_id)` is what prevents the
  impersonation the old server allowed — never trust `full_name`/`avatar_url`
  on a row as proof of authorship.
- **`presence`** for the listener count.

`messages` must stay in the `supabase_realtime` publication or chat silently
stops arriving. Retention is a `pg_cron` job, not application code.

`app/room/[id]/page.tsx` owns the channel and passes messages down to
`Chat.tsx`, which is presentational. `lastSyncedId` guards against echoing a
received track straight back out.

## Conventions

- Every route directory carries its own `loading.tsx` and `error.tsx`; add both when creating a route. `error.tsx` takes `{ error, reset }` and renders a retry button.
- Prettier is enforced in CI. Run `npm run format` before committing.
- `jsx-a11y/recommended` is on and its violations are errors: interactive things are `<button>`, icon-only controls carry `aria-label`, and `focus:outline-none` always pairs with a `focus-visible:ring`.
- Page components are server components that call `actions/*` and delegate to a `components/` child marked `"use client"` for interactivity.
- User feedback is `react-hot-toast` throughout; Supabase errors are surfaced with `toast.error(error.message)` rather than thrown.
- Shared framer-motion variants live in `variants.js` at the repo root.
- `src/components/` is empty and unused — components belong in the root-level `components/` directory.
