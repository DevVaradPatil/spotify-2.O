# IMPROVEMENT_PLAN.md

Audit date: 2026-08-27 · Branch `main` @ `d75b6e2` · 38 commits, first 2023-10-07, last 2026-08-25

---

## 1. Executive Summary

Spotify 2.O is a feature-rich Next.js 13.5 App Router music streaming app backed by Supabase (auth, Postgres, storage) and Stripe (subscriptions), plus a hand-rolled `ws` server for shared "music rooms." The feature surface is genuinely broad for a personal project — auth with three providers, uploads, playlists, likes, a full global player, subscriptions, and realtime rooms — and most of it works.

The problem is that nothing underneath it has been maintained. **A live Supabase `service_role` key and live Stripe secrets are committed to the git repository.** The framework is three major versions behind and carries a critical authentication-bypass CVE that this app's middleware is directly exposed to. The Supabase auth packages in use have been formally deprecated. Authorization is enforced in the browser rather than the database, and the WebSocket layer has no authentication at all — any client can join any room and impersonate any user in chat.

Performance has one dominant flaw: the entire song table is fetched on every page load and then truncated to six rows in the browser, while the player writes playback position into a global store twice a second with no selectors, re-rendering every subscribed component. Accessibility is effectively absent — one `aria-label` exists in the whole codebase, and the player's controls are unlabeled `<div>`s.

**Overall health: poor foundations, good bones.** The product design and feature ambition are worth preserving. The security posture requires action today, not in a planned phase. Estimated total: ~4–6 weeks of focused work to reach a modern, safe, maintainable baseline.

> **Do this before reading further:** the credentials in `.env` are live and in git history. Rotate them now. Details in §3.0.

---

## 2. Audit Findings

### 2.1 Stack & Tooling (Step 1)

| Item       | Current                                  | Notes                                          |
| ---------- | ---------------------------------------- | ---------------------------------------------- |
| Framework  | **Next.js 13.5.4**, App Router           | 3 majors behind (15.x current). Critical CVEs. |
| React      | 18.2.0                                   | 19.x current                                   |
| TypeScript | 5.2.2, `strict: true`                    | Strictness widely bypassed with `as any`       |
| Styling    | Tailwind 3.3.3 + 2 global CSS files      | Consistent; no design tokens                   |
| State      | Zustand 4.4.3 (5 stores) + React Context | No server-state library; no Zustand selectors  |
| Node       | v22.15.0 local                           | **No `engines` field, no `.nvmrc`**            |
| Deploy     | Vercel (`spotify-2-o.vercel.app`)        | No `vercel.json`; WS server has no host        |
| Lint       | `next/core-web-vitals` only              | No Prettier, no import rules, no a11y plugin   |
| Tests      | **None**                                 | 0% coverage. No runner installed.              |
| CI/CD      | **None**                                 | No `.github/`, no hooks, no pre-commit         |

**Architecture:** `app/` (routes + API) · `actions/` (server data access) · `components/` (shared UI) · `hooks/` · `libs/` (Stripe/Supabase admin) · `providers/` · `middleware.ts` · `server.js` (standalone WS). Path alias `@/*` → repo root.

**Client/server split is badly skewed:** 47 of ~60 component files are `"use client"`. Three route pages (`music-room`, `playlist/[id]`, `room/[id]`) are fully client-rendered and fetch their own data.

**Dependency risk — `npm audit`: 25 vulnerabilities (2 critical, 15 high, 7 moderate, 1 low)**

| Package                            | Version | Status                                                                                                                                                                                                                           |
| ---------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `next`                             | 13.5.4  | **CRITICAL** — ~30 advisories incl. middleware auth bypass [GHSA-f82v-jwr5-mffw](https://github.com/advisories/GHSA-f82v-jwr5-mffw) (CVE-2025-29927), cache poisoning, SSRF. Patch `13.5.11` available (non-major); 13.x is EOL. |
| `@supabase/auth-helpers-nextjs`    | 0.8.1   | **DEPRECATED** by Supabase → replaced by `@supabase/ssr`                                                                                                                                                                         |
| `@supabase/auth-helpers-react`     | 0.4.2   | **DEPRECATED** → same                                                                                                                                                                                                            |
| `tar` (via `supabase` CLI 1.100.1) | —       | **CRITICAL** — 13 advisories (path traversal, arbitrary file write)                                                                                                                                                              |
| `react-router-dom`                 | 6.17.0  | HIGH (XSS via open redirect) — **and completely unused**                                                                                                                                                                         |
| `socket.io-client`                 | 4.8.1   | HIGH (`socket.io-parser` memory exhaustion) — **and completely unused**                                                                                                                                                          |
| `ws`                               | 8.18.0  | HIGH — uninitialized memory disclosure, DoS                                                                                                                                                                                      |
| `stripe`                           | 13.9.0  | ~6 majors behind (19.x); API pinned to `2023-08-16`                                                                                                                                                                              |
| `@stripe/stripe-js`                | 2.1.7   | ~5 majors behind (7.x)                                                                                                                                                                                                           |
| `use-sound`                        | 4.0.1   | Effectively unmaintained; requires `@ts-ignore` to import                                                                                                                                                                        |
| `uniqid`                           | 5.4.0   | Abandoned; `crypto.randomUUID()` is built in                                                                                                                                                                                     |
| `tailwindcss`                      | 3.3.3   | v4 available                                                                                                                                                                                                                     |

### 2.2 Database & Supabase (Step 2)

> **Scope limitation, stated plainly:** this repository contains **no migrations, no `supabase/` directory, no `config.toml`, and no SQL files**. The live database was not queried. Everything below is reconstructed from `types_db.ts` and from how the code actually uses the client. **RLS policies, triggers, and indexes cannot be verified from the repo** — I have flagged what the code _implies_ about them and listed verification as the first open question (§6). I have not invented policy definitions.

**Two problems with the type definitions themselves:**

1. `types_db.ts` is **stale** — it does not contain `playlists` or `messages`, both of which the app queries in production.
2. `types_db.ts` is encoded **UTF-16LE**, unlike every other file in the repo. It breaks `grep`, diffs, and some tooling.

#### Schema (reconstructed)

```
auth.users (Supabase managed)
     │
     └─1:1─> users ─────────────────────────────────────────┐
             id            uuid PK → auth.users.id          │
             full_name     text                             │
             avatar_url    text                             │
             billing_address jsonb                          │
             payment_method  jsonb                          │
                │                                           │
     ┌──────────┼───────────────┬──────────────┬────────────┤
     │          │               │              │            │
     ▼          ▼               ▼              ▼            ▼
  customers  songs          playlists*     subscriptions  liked_songs
  id uuid PK id  int8 PK    id             id text PK     user_id uuid FK
    → users  user_id FK     user_id FK     user_id FK     song_id int8 FK
  stripe_    author  text   song_ids  []   price_id FK    created_at
  customer_  title   text   name           status enum    (PK likely composite)
  id text    song_path text desc           quantity
             image_path text image_path    cancel_at_period_end
             created_at ts   created_at    current_period_start/end
                                           trial_start/end
                                           canceled_at, ended_at
                                           cancel_at, created, metadata
                                                  │
  products ──1:N──> prices ──────────────────────┘
  id text PK        id text PK
  active bool       product_id FK → products.id
  name text         active, currency, description
  description       unit_amount int8
  image text        type enum (one_time|recurring)
  metadata jsonb    interval enum (day|week|month|year)
                    interval_count, trial_period_days, metadata

  messages*  (room chat — undocumented)
  id, room_code text, email text, content text,
  full_name text, avatar_url text, created_at ts

  * = used in code but ABSENT from types_db.ts
```

**Enums:** `pricing_plan_interval` · `pricing_type` · `subscription_status`
**Views:** none. **Functions:** none declared. **Triggers:** none in repo (a `handle_new_user` trigger is implied by `users` rows existing for OAuth signups, but is unverified).

**Nullability smell:** every meaningful column on `songs` (`title`, `author`, `song_path`, `image_path`, `user_id`) is nullable. `ExploreContent` calls `a.title.localeCompare(b.title)` — a single null title crashes the Explore page.

#### RLS — what the code implies

| Table                                                | Evidence                                                                                                                                     | Implication                                                                                                                                        |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `playlists`                                          | `actions/getPlaylists.ts` selects **all playlists with no `user_id` filter**; `PlaylistContent.tsx` then filters by owner **in the browser** | SELECT policy is almost certainly permissive. Every user's playlist names, descriptions, image paths, and `user_id`s are shipped to every visitor. |
| `playlists`                                          | `app/playlist/[id]/page.tsx` fetches any playlist by id client-side, _then_ redirects if `user_id !== user.id`                               | Ownership check happens **after** the data is already in the browser. Not a security boundary.                                                     |
| `messages`                                           | `Chat.tsx` reads with the **anon key**, filtered only by `room_code`                                                                         | Any anonymous client with a room code reads that room's entire chat history.                                                                       |
| `messages`                                           | `server.js` writes with the **service role key**                                                                                             | All chat writes bypass RLS entirely.                                                                                                               |
| `songs`                                              | Global read is intended                                                                                                                      | Fine by design.                                                                                                                                    |
| `liked_songs`, `subscriptions`, `customers`, `users` | Per-user access assumed                                                                                                                      | **Unverified.**                                                                                                                                    |

**Storage:** two buckets, `songs` and `images`, both read via `getPublicUrl()` → both public. Upload keys are `song-${values.title}-${uniqid}` and `image-${values.title}-${uniqid}`:

- User-controlled `title` goes straight into the object key with **no sanitization**.
- **No ownership prefix** (`${user.id}/…`), so storage policies cannot scope by owner path.
- **No size limit, no MIME validation** — the "mp3 upload" accepts any file of any size.
- In `PlaylistModal.tsx` the key interpolates `values.title`, but the form field is named `name` → every playlist image is uploaded as `image-undefined-<uniqid>`.
- No avatar bucket; avatars come from OAuth provider metadata.

**Auth:** Supabase Auth — email magic link, Google, GitHub (per `AuthModal`). Cookie sessions via the deprecated auth-helpers; `middleware.ts` calls `getSession()` on every request purely to refresh. Frontend sync: `SessionContextProvider` → `MyUserContextProvider` (loads `users` + active `subscriptions`).

**Service-role key in client-exposed code — verified negative.** I grepped the built client bundles for the full key. It is **not** present in `.next/static`; only the anon key is, which is correct. _(An initial 40-character prefix match was a false positive — the anon and service-role JWTs share a 110-character prefix. The full-key check is the reliable one.)_ The key is used only in `libs/supabaseAdmin.ts`, `app/api/websocket/route.ts`, and `server.js`, all server-side. **The exposure is the committed `.env` file, not the bundle.**

**Realtime:** not used anywhere. The rooms feature reimplements it with a bespoke `ws` server — Supabase Realtime (broadcast + presence) is a direct replacement.

**Indexes:** unverifiable. Based on query patterns, these are likely missing and needed:

| Table           | Column(s)                    | Driven by                                      |
| --------------- | ---------------------------- | ---------------------------------------------- |
| `songs`         | `created_at DESC`            | every list query orders by it                  |
| `songs`         | `title` (GIN + `pg_trgm`)    | `ilike '%term%'` search — currently a seq scan |
| `songs`         | `user_id`                    | library page                                   |
| `liked_songs`   | `(user_id, created_at DESC)` | liked page                                     |
| `playlists`     | `user_id`                    | playlist listing                               |
| `messages`      | `(room_code, created_at)`    | every chat load + hourly cleanup               |
| `subscriptions` | `(user_id, status)`          | `useUser` on every page load                   |
| `customers`     | `stripe_customer_id`         | every webhook delivery                         |

### 2.3 Feature Inventory (Step 3)

| Feature                                        | State                 | Notes                                                                                                  |
| ---------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------ |
| Auth — magic link / Google / GitHub            | ✅ Working            | Via Supabase Auth UI                                                                                   |
| Home — newest songs                            | ⚠️ Capped             | Fetches **all** songs, renders `.slice(0, 6)`                                                          |
| Explore all + 4 sort modes                     | ⚠️ Fragile            | Crashes on any null `title`                                                                            |
| Search by title                                | ⚠️ Capped             | `ilike` unindexed; **results hard-capped at 6**                                                        |
| Liked songs                                    | 🐛 Buggy              | `useEffect(() => onPlay(songs[0].id), [])` — **throws on an empty list**, and force-autoplays on visit |
| Library (own uploads)                          | ✅ Working            | Empty state incorrectly reads "No Liked Songs"                                                         |
| Upload mp3 + cover art                         | ⚠️ Unvalidated        | No size/type/duration checks                                                                           |
| Playlists — create                             | ⚠️ Buggy              | Insert `error` destructured but **never checked**; image key uses undefined field                      |
| Playlists — add/remove song                    | ⚠️ Fragile            | Read-modify-write on `song_ids` array; **string/number `indexOf` mismatch**; lost-update race          |
| Playlists — view                               | ⚠️ Client-only        | Ownership enforced after fetch                                                                         |
| Player — play/pause/next/prev/seek/volume/mute | ✅ Working            | Seek + prev/next **hidden on mobile**                                                                  |
| Random song button                             | ✅ Working            | Home page only                                                                                         |
| Repeat / shuffle                               | ❌ **Does not exist** | README claims both                                                                                     |
| Queue UI                                       | ❌ Not built          | Queue exists in state only                                                                             |
| Stripe subscribe                               | ⚠️ Working            | Checkout route **never checks the user is authenticated**                                              |
| Stripe customer portal                         | 🐛 Buggy              | `catch` block is missing `return` → route returns `undefined`                                          |
| Account page                                   | ⚠️ Fragile            | `app_metadata.providers.includes()` throws if undefined                                                |
| Music room — create/join by code               | ✅ Working            | 6-char client-generated code, no server registry                                                       |
| Music room — shared playback                   | 🐛 Broken             | Broadcasts to **all connected clients globally**, not per-room                                         |
| Music room — chat                              | 🐛 Broken             | Same global broadcast; **two sockets per member**; no auth                                             |
| Premium gating on playback                     | ❌ Disabled           | Commented out in `hooks/useOnPlay.ts`                                                                  |
| Follows / artists / albums / lyrics            | ❌ Not built          | —                                                                                                      |

**Dead code confirmed unused:** `actions/getPlaylistsById.ts` (also _fundamentally broken_ — `"use client"` + calls `useUser()` inside a non-component async function + imports `next/headers`), `actions/getPlaylistsByTitle.ts`, `actions/getPlaylistSongs.ts`, `hooks/useWebSocket.ts`, `app/room/[id]/components/Song.tsx` (uses a _third_, different WS URL scheme), `app/api/websocket/route.ts` (reaches for `req.socket.server`, which does not exist in App Router), empty `src/components/`, and the `react-router-dom` + `socket.io-client` dependencies.

**Missing asset:** `SongItem.tsx` and `PlaylistItem.tsx` fall back to `/images/music-placeholder.png`, which **does not exist** in `public/images/`. Every song without cover art renders a 404.

### 2.4 Cross-Cutting Concerns (Step 4)

#### Security

| #   | Severity        | Finding                                                                                                                                                                                                                                                                                                                                                      |
| --- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1  | 🔴 **CRITICAL** | **`.env` is tracked in git** (`.gitignore` only excludes `.env*.local`) containing a live `SUPABASE_SERVICE_ROLE_KEY` (decoded `role: service_role`, valid to 2033), `STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET`. Committed in `18efdaf` and present in history. Full RLS-bypassing DB read/write + Stripe account control for anyone with repo access. |
| S2  | 🔴 **CRITICAL** | `next@13.5.4` — middleware authentication bypass (CVE-2025-29927). This app uses `middleware.ts`. Plus cache poisoning, SSRF, and DoS advisories.                                                                                                                                                                                                            |
| S3  | 🟠 **HIGH**     | **WebSocket server has zero authentication.** No token, no session check. The client supplies its own `email`, `full_name`, and `avatar_url` in the CHAT payload and the server trusts and persists them → trivial identity spoofing.                                                                                                                        |
| S4  | 🟠 **HIGH**     | `server.js` broadcasts over `server.clients` — **every connected client across every room**. Room A's chat and track changes leak into Room B.                                                                                                                                                                                                               |
| S5  | 🟠 **HIGH**     | **Authorization is client-side.** `getPlaylists()` returns all users' playlists; the owner filter runs in the browser. Playlist detail redirects only _after_ fetching.                                                                                                                                                                                      |
| S6  | 🟡 MED          | **No input validation anywhere** — no schema validation library. Uploads accept arbitrary files/sizes; unsanitized user input goes into storage object keys.                                                                                                                                                                                                 |
| S7  | 🟡 MED          | `/api/create-checkout-session` never checks `user` exists — passes `uuid: ''` to `createOrRetrieveCustomer`, creating an orphan Stripe customer.                                                                                                                                                                                                             |
| S8  | 🟡 MED          | Chat history readable with the anon key given only a 6-character, client-generated room code.                                                                                                                                                                                                                                                                |
| S9  | 🟡 MED          | 25 npm vulnerabilities — two of which (`react-router-dom`, `socket.io-client`) come from **dependencies the app never imports**.                                                                                                                                                                                                                             |
| S10 | 🟢 LOW          | No security headers / CSP. No rate limiting on `/api/songs`. Raw `console.log(err)` of Stripe errors.                                                                                                                                                                                                                                                        |

**Checked and clean:** No `dangerouslySetInnerHTML` and no raw HTML injection anywhere — React's escaping covers the chat XSS surface. Stripe webhook signature verification is correctly implemented. The service-role key does not reach the client bundle. CSRF risk is limited by SameSite cookie defaults, though POST routes carry no origin check.

#### Performance

- **No pagination or `LIMIT` anywhere in the codebase** (`.limit(` / `.range(` appear zero times). `getSongs()` selects the entire `songs` table on every home and explore render, ships every row to the browser, and then calls `.slice(0, 6)`. `getPlaylists()` does the same for _all users'_ playlists.
- **Zustand is used with no selectors.** Every consumer calls `usePlayer()` and receives the whole store. Combined with the player's 500ms `setInterval` writing `soundPosition`, **every subscribed component in the tree re-renders twice per second** — Sidebar, Library, and every `MediaItem`/`SongItem` on screen. This is the single largest performance defect.
- **`LikeButton` issues one query per rendered row.** A 50-song list fires 50 separate `liked_songs` selects on mount. Classic N+1.
- `revalidate = 0` on every route plus a root layout that re-runs `getSongsByUserId()` and `getActiveProductsWithPrices()` on **every navigation** → 2 extra round-trips per page, zero caching, no ISR, no streaming, no `<Suspense>`.
- Search runs `ilike '%term%'` against an unindexed column — sequential scan that degrades linearly with the catalog.
- 47 client components; `react-icons` imported in 19 files and `framer-motion` in 6. Animation delays are computed as `index * 0.25s`, so the 20th grid item begins animating **five seconds** after load.
- No audio strategy: full MP3 fetched from a public URL with no range-request tuning or preloading; `sound.unload()` on every track change discards the buffer.
- `fill` images are missing `sizes` props. One raw `<img>` (Header avatar) bypasses optimization. The placeholder image 404s.
- Rooms open **two WebSocket connections per member**; `Chat.tsx`'s effect depends on `[roomCode, socket]` where `socket` is a reassigned prop → reconnect churn.

#### UI/UX

- **Accessibility is essentially absent.** Exactly **one** `aria-*` attribute exists in the entire app (`aria-label="Volume"` on the Slider).
  - Player controls — play/pause, next, previous, seek — are `<div onClick>` and `<svg onClick>`, not buttons: unreachable by keyboard, invisible to screen readers.
  - The progress bar is a `<div>` with a click handler — no `role="slider"`, no keyboard seeking, no value announcement.
  - `focus:outline-none` is applied globally to `Input` and `Modal` with **no replacement focus ring**.
  - Icon-only buttons (logout, nav, menu, send) have no accessible names.
  - Alt text is decorative filler (`alt="image"`, `alt="Image"`, `alt=""` on the user's avatar).
  - No skip link, no landmarks, no live region for toasts.
  - `text-neutral-400` on `bg-neutral-900` ≈ 4.2:1 — below WCAG AA for normal text.
- **Mobile gaps:** prev/next, seek, and volume are all `hidden md:flex`. Mobile users can play and pause and nothing else.
- **Error states are non-functional:** every route has an `error.tsx`, but none accept the `error`/`reset` props Next.js passes — so there is no retry affordance and no error surfaced.
- Empty states exist but are wrong in places (the Library page says "No Liked Songs").
- The animated four-colour gradient header (`.css-selector`, 45s infinite loop) runs on every page — dated, and a constant repaint.
- Dark-only, with colours hardcoded per component rather than tokenized.

#### Code Quality

- `strict: true` is set and then routinely defeated: `as any` in **all 7** action files, `@ts-ignore` ×4 in `libs/supabaseAdmin.ts` and ×1 in `PlayerContent.tsx`, pervasive `any` in the dead websocket route.
- **The hand-written types contradict the database.** `types.ts` declares `Song.id: string`; the DB column is `int8` and `types_db.ts` says `number`. `Playlist.song_ids: string[]` holds what are really numeric ids. `AddToPlaylist` does `songsIds.indexOf(songId)` across that mismatch — **the add/remove toggle can silently fail**.
- Actions create Supabase clients **without** the `<Database>` generic, so no query is type-checked — which is why every one of them ends in `as any`.
- No error boundaries beyond the non-functional route `error.tsx` files.
- Inconsistent conventions: `PlaylistModal` omits `"use client"` and works only incidentally; 2-space and 4-space indentation mixed; semicolons inconsistent; no Prettier.
- Typos frozen into the public module surface: `libs/stripeClientl.ts`, `hooks/useAuthModel.ts` (should be `Modal`).
- Commented-out code left in `hooks/useOnPlay.ts` and `app/room/[id]/page.tsx`.
- Zero tests.

---

## 3. Improvement Plan by Category

### 3.0 🔴 URGENT — Do Today, Before Any Other Work

These are not phase-one items. They are today items.

1. **Rotate every committed credential.** In order:
   - Supabase Dashboard → Settings → API → roll the `service_role` key (and the anon key). _Note: this project still uses legacy JWT-format keys; roll onto the new publishable/secret key format at the same time._
   - Stripe Dashboard → Developers → API keys → roll the secret key.
   - Stripe → Webhooks → roll the signing secret.
   - Update the values in Vercel's environment settings, **not** in a file.
2. **Untrack the file:** `git rm --cached .env`, add `.env` to `.gitignore`, commit. Keep a committed `.env.example` with keys and empty values.
3. **Decide on history.** The secrets remain in commit `18efdaf` forever unless history is rewritten (`git filter-repo`). If this repo is or ever becomes public, rewriting is mandatory. Rotation in step 1 is what actually neutralizes the risk; rewriting is cleanup. **See §6, Q1.**
4. **Patch Next.js immediately:** `npm i next@13.5.11` — a non-major bump that closes the middleware auth bypass. The full upgrade to 15.x is planned work; this is the stopgap.
5. **Remove two unused vulnerable dependencies:** `npm uninstall react-router-dom socket.io-client`. Zero code changes required — nothing imports them.

### 3.1 Security

| ID     | Action                                                                                                                                                                                                                                                                      | Effort        |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| SEC-1  | Rotate all credentials; untrack `.env`; add `.env.example`; move config to Vercel env vars                                                                                                                                                                                  | **S**         |
| SEC-2  | Upgrade `next` → 13.5.11 now, then 15.x in Phase 2                                                                                                                                                                                                                          | **S** / **L** |
| SEC-3  | **Authenticate the WebSocket server.** Client sends its Supabase access token on connect; server verifies with `supabase.auth.getUser(token)`; derive `email`/`full_name`/`avatar_url` **server-side from the verified session** and stop trusting client-supplied identity | **M**         |
| SEC-4  | Scope WS broadcasts per room — track `Map<roomCode, Set<socket>>` instead of broadcasting to `server.clients`                                                                                                                                                               | **S**         |
| SEC-5  | Move all authorization into RLS. Filter `getPlaylists()` by `user_id` server-side; delete the client-side owner filter in `PlaylistContent.tsx`; make `playlist/[id]` a server component that 404s on non-owned rows                                                        | **M**         |
| SEC-6  | Add Zod validation at every trust boundary: API route inputs, upload metadata, WS message payloads, playlist/song forms                                                                                                                                                     | **M**         |
| SEC-7  | Enforce upload limits — max file size, MIME allow-list (`audio/mpeg`, `image/*`), magic-byte check; sanitize object keys and prefix with `${user.id}/`                                                                                                                      | **M**         |
| SEC-8  | Add the missing auth guard to `/api/create-checkout-session` (return 401 when `user` is null)                                                                                                                                                                               | **S**         |
| SEC-9  | Gate `messages` reads behind room membership rather than possession of a room code; consider server-issued room codes with an owner and a TTL                                                                                                                               | **M**         |
| SEC-10 | `npm audit fix`; upgrade `ws`, `stripe`, `@stripe/stripe-js`, `supabase` CLI; replace `uniqid` with `crypto.randomUUID()`                                                                                                                                                   | **M**         |
| SEC-11 | Add security headers via `next.config.js` — CSP, HSTS, `X-Frame-Options`, `Referrer-Policy`                                                                                                                                                                                 | **S**         |
| SEC-12 | Rate-limit `/api/songs` and the checkout route (Upstash Ratelimit or Vercel middleware)                                                                                                                                                                                     | **S**         |
| SEC-13 | Add `npm audit --audit-level=high` + Dependabot/Renovate to CI                                                                                                                                                                                                              | **S**         |

### 3.2 Database & Backend

| ID    | Action                                                                                                                                                                                                                                                                         | Effort |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| DB-1  | **Adopt migrations.** `supabase init`, capture current schema via `supabase db pull`, commit `supabase/migrations/`. Nothing else in this section is safe or repeatable without it.                                                                                            | **M**  |
| DB-2  | **Audit and document every RLS policy** (`select * from pg_policies`). Verify per-table, write the results into migrations. Highest-suspicion tables: `playlists`, `messages`, `liked_songs`                                                                                   | **M**  |
| DB-3  | Write explicit owner-scoped policies: `playlists` (owner CRUD), `messages` (room-member read, authenticated insert), `liked_songs` (owner CRUD), `songs` (public read, owner write), `subscriptions`/`customers`/`users` (owner read-only)                                     | **M**  |
| DB-4  | **Regenerate `types_db.ts`** — it is missing `playlists` and `messages` — and **re-save it as UTF-8**                                                                                                                                                                          | **S**  |
| DB-5  | **Fix the id type mismatch.** Reconcile `types.ts` (`Song.id: string`) with the DB (`int8`). Pick one — recommend migrating `songs.id` to `uuid` for a public music app, or standardize on `number` throughout. This resolves the silent playlist add/remove failure           | **M**  |
| DB-6  | Add `NOT NULL` + defaults to `songs.title`, `songs.author`, `songs.song_path`, `songs.user_id` (backfill first)                                                                                                                                                                | **S**  |
| DB-7  | **Add the missing indexes** — `songs(created_at DESC)`, `songs(user_id)`, GIN `pg_trgm` on `songs(title)`, `liked_songs(user_id, created_at DESC)`, `playlists(user_id)`, `messages(room_code, created_at)`, `subscriptions(user_id, status)`, `customers(stripe_customer_id)` | **S**  |
| DB-8  | **Replace `playlists.song_ids` array with a `playlist_songs` join table** (`playlist_id`, `song_id`, `position`, `added_at`). Eliminates the read-modify-write lost-update race and enables ordering and FK integrity                                                          | **L**  |
| DB-9  | **Migrate off deprecated auth helpers** → `@supabase/ssr` (`createBrowserClient` / `createServerClient`), rewrite `middleware.ts` to the documented cookie-refresh pattern                                                                                                     | **L**  |
| DB-10 | Parameterize every Supabase client with `<Database>` and delete all seven `as any` casts in `actions/`                                                                                                                                                                         | **S**  |
| DB-11 | **Replace the custom WS server with Supabase Realtime** (broadcast + presence) — deletes `server.js`, the dead route, the unused hook, and the hardcoded Render endpoint in one move; auth comes free                                                                          | **L**  |
| DB-12 | If keeping the WS server: read its URL from `NEXT_PUBLIC_WS_URL`, fix `package.json`'s `start:ws` (it points at a nonexistent `server.ts`), and open exactly one connection per room member                                                                                    | **M**  |
| DB-13 | Replace the hourly `setInterval` message cleanup with a `pg_cron` job                                                                                                                                                                                                          | **S**  |
| DB-14 | Add Postgres full-text search (`tsvector` + GIN) or trigram search to replace `ilike '%…%'`                                                                                                                                                                                    | **M**  |
| DB-15 | Fix the `create-portal-link` `catch` block — it constructs a response without `return`ing it                                                                                                                                                                                   | **S**  |

### 3.3 Performance

| ID      | Action                                                                                                                                                                                                                      | Effort |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| PERF-1  | **Add server-side pagination** — `.range()` on every list query. Stop fetching whole tables to `.slice(0, 6)` in the browser. Infinite scroll or "load more" on home, explore, search, library, liked                       | **L**  |
| PERF-2  | **Use Zustand selectors everywhere** (`usePlayer(s => s.activeId)`). Move `soundPosition` out of the global store into `PlayerContent` local state, or subscribe transiently. Kills the twice-a-second whole-tree re-render | **M**  |
| PERF-3  | **Fix the `LikeButton` N+1** — fetch the user's liked song ids once into a store/context and have each button read from it                                                                                                  | **M**  |
| PERF-4  | Replace `revalidate = 0` with real caching — tagged `revalidate` + `revalidateTag()` on mutation. Stop re-fetching layout data on every navigation                                                                          | **M**  |
| PERF-5  | Convert the three client-rendered pages (`playlist/[id]`, `music-room`, `room/[id]`) to server components with client leaves                                                                                                | **M**  |
| PERF-6  | Add `<Suspense>` streaming boundaries so the header/sidebar paint before data resolves                                                                                                                                      | **S**  |
| PERF-7  | **Cap animation stagger** at `Math.min(index, 8) * 0.05s`; drop framer-motion from list items entirely in favour of CSS                                                                                                     | **S**  |
| PERF-8  | Raise the search debounce to 500ms, cancel in-flight requests with `AbortController`, and stop rebuilding the debounced function on every render in the room page                                                           | **S**  |
| PERF-9  | Add `sizes` to all `fill` images; convert the Header avatar `<img>` to `next/image`; **add the missing `music-placeholder.png`**                                                                                            | **S**  |
| PERF-10 | Add `@next/bundle-analyzer`, set a bundle budget, audit the `react-icons` footprint across 19 files                                                                                                                         | **S**  |
| PERF-11 | Evaluate replacing `use-sound`/howler with a plain `<audio>` element + Media Session API — smaller, maintained, and unlocks lock-screen controls                                                                            | **M**  |

### 3.4 UI/UX

| ID    | Action                                                                                                                                                                                     | Effort |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| UX-1  | **Accessibility pass on the player** — real `<button>`s with `aria-label`s for play/pause/next/prev; convert the progress bar to a Radix Slider with keyboard seeking and `aria-valuetext` | **M**  |
| UX-2  | **Restore focus visibility** — replace every bare `focus:outline-none` with a visible `focus-visible:ring`                                                                                 | **S**  |
| UX-3  | Accessible names on all icon-only buttons; meaningful `alt` text (song/playlist titles, not `"image"`); `alt=""` only for genuinely decorative art                                         | **S**  |
| UX-4  | Raise muted text from `neutral-400` to `neutral-300` to clear WCAG AA; audit contrast globally                                                                                             | **S**  |
| UX-5  | Add landmarks (`<nav>`, `<main>`, `<aside>`), a skip link, and an `aria-live` region for toasts                                                                                            | **S**  |
| UX-6  | **Bring player controls to mobile** — next/prev/seek are currently desktop-only. Add a full-screen "now playing" sheet                                                                     | **M**  |
| UX-7  | **Make `error.tsx` functional** — accept `{ error, reset }`, show a retry button, log to a reporting service                                                                               | **S**  |
| UX-8  | Replace spinner-only loading with skeleton screens matching each grid/list                                                                                                                 | **M**  |
| UX-9  | Fix wrong empty-state copy ("No Liked Songs" on the Library page); add illustrations and a clear CTA to each                                                                               | **S**  |
| UX-10 | **Retire the 45s animated rainbow gradient header**; move to a per-page palette derived from cover art or a flat modern gradient                                                           | **S**  |
| UX-11 | Extract design tokens (colour, spacing, radius, type scale) into the Tailwind theme; stop hardcoding `neutral-*` per component                                                             | **M**  |
| UX-12 | Add keyboard shortcuts — space to play/pause, arrows to seek, `m` to mute                                                                                                                  | **S**  |
| UX-13 | Run axe DevTools + Lighthouse and fix to a ≥95 a11y score                                                                                                                                  | **M**  |

### 3.5 Features

**Fixes to broken features (do these before adding anything new):**

| ID     | Action                                                                                                                                                                           | Effort |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| FEAT-1 | **Remove the crashing autoplay effect** in `LikedContent.tsx` — `onPlay(songs[0].id)` throws on an empty list and hijacks the page on every visit                                | **S**  |
| FEAT-2 | **Uncap search results** (currently hard-limited to 6) and home/playlist grids — pair with PERF-1                                                                                | **S**  |
| FEAT-3 | Fix `PlaylistModal` — check the insert `error`, and correct `values.title` → `values.name` in the image key                                                                      | **S**  |
| FEAT-4 | Guard `ExploreContent` sorting against null titles                                                                                                                               | **S**  |
| FEAT-5 | Guard `AccountContent` against undefined `app_metadata.providers`                                                                                                                | **S**  |
| FEAT-6 | **Fix music rooms end-to-end** — per-room broadcast, one socket per member, authenticated identity, synced play/pause/seek (the position-sync effect is currently commented out) | **L**  |
| FEAT-7 | Decide the fate of premium gating — the check in `useOnPlay` is commented out while `Header`/`Library` still gate uploads. **See §6, Q4**                                        | **S**  |
| FEAT-8 | Correct the README (it advertises repeat and shuffle, which do not exist)                                                                                                        | **S**  |

**New features worth adding:**

| ID      | Action                                                                                                  | Effort |
| ------- | ------------------------------------------------------------------------------------------------------- | ------ |
| FEAT-9  | **Shuffle and repeat** (off/one/all) — the README already claims them                                   | **M**  |
| FEAT-10 | **Visible queue** — view, reorder, "play next", "add to queue"                                          | **L**  |
| FEAT-11 | **Media Session API** — lock-screen art and controls, hardware media keys                               | **S**  |
| FEAT-12 | **Persist player state** across reloads (Zustand `persist`) — resume where the user left off            | **S**  |
| FEAT-13 | Playlist covers, drag-to-reorder, public/private toggle, shareable links                                | **M**  |
| FEAT-14 | Recently played + listening history (needs a `play_events` table)                                       | **M**  |
| FEAT-15 | Follows / artist pages / album grouping — the `songs.author` text column is doing an entity's job today | **L**  |
| FEAT-16 | Search improvements — filter by author, search playlists, recent searches, keyboard-navigable results   | **M**  |
| FEAT-17 | PWA + offline shell + installability                                                                    | **M**  |
| FEAT-18 | Crossfade / gapless playback                                                                            | **M**  |

### 3.6 Code Quality & Architecture

| ID    | Action                                                                                                                                                                                                                                                                                | Effort |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| CQ-1  | **Delete all dead code** — `getPlaylistsById.ts`, `getPlaylistsByTitle.ts`, `getPlaylistSongs.ts`, `hooks/useWebSocket.ts`, `app/room/[id]/components/Song.tsx`, `app/api/websocket/route.ts`, empty `src/components/`, and the commented-out blocks in `useOnPlay` and the room page | **S**  |
| CQ-2  | **Eliminate every `as any` and `@ts-ignore`** — 7 in actions (fixed by DB-10), 4 in `supabaseAdmin.ts`, 1 in `PlayerContent.tsx`. Add `@typescript-eslint/no-explicit-any` as an error                                                                                                | **M**  |
| CQ-3  | Tighten `tsconfig` — `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes`; raise `target` from `es5` to `es2022`                                                                                                                                            | **S**  |
| CQ-4  | **Make `types_db.ts` the single source of truth**; derive `types.ts` from it (`Tables<'songs'>`) instead of maintaining a contradictory parallel set                                                                                                                                  | **M**  |
| CQ-5  | Add Prettier + `eslint-plugin-jsx-a11y` + `eslint-plugin-import`; run `--fix` across the repo                                                                                                                                                                                         | **S**  |
| CQ-6  | Rename the typo'd modules — `libs/stripeClientl.ts` → `stripeClient.ts`, `hooks/useAuthModel.ts` → `useAuthModal.ts`                                                                                                                                                                  | **S**  |
| CQ-7  | **Migrate mutations to Server Actions** — uploads, likes, playlist edits currently run as inline client-side Supabase calls with no server validation                                                                                                                                 | **L**  |
| CQ-8  | Add a root `error.tsx` + a React error boundary around the player                                                                                                                                                                                                                     | **S**  |
| CQ-9  | **Set up testing** — Vitest + React Testing Library for hooks/components (start with `usePlayer`, `useOnPlay`, `LikeButton`, `AddToPlaylist`), Playwright for auth → play → like → playlist. Target 60% on business logic                                                             | **L**  |
| CQ-10 | **Add CI** — GitHub Actions running typecheck, lint, test, build, and `npm audit` on every PR                                                                                                                                                                                         | **M**  |
| CQ-11 | Pin the runtime — `engines.node` in `package.json` + `.nvmrc`                                                                                                                                                                                                                         | **S**  |
| CQ-12 | **Upgrade Next.js 13 → 15** and React 18 → 19 (async `cookies()`/`headers()`, caching-default changes)                                                                                                                                                                                | **L**  |
| CQ-13 | Consolidate the two global CSS files; drop the unused `.centered-modal` class                                                                                                                                                                                                         | **S**  |
| CQ-14 | Add structured logging + Sentry; replace the ~30 `console.log`/`console.error` calls                                                                                                                                                                                                  | **M**  |
| CQ-15 | Standardize data access — one pattern (Server Components + Server Actions) instead of today's mix of server actions, client-side queries, and API routes                                                                                                                              | **L**  |

---

## 4. Prioritized Roadmap

### Phase 0 — Emergency (today, ~2 hours) — ⏳ IN PROGRESS

> Nothing else starts until this is done.

Executed on branch `phase-0-security` (3 commits, not pushed):

| Item                                                                             | Effort | Status                                                                                                               |
| -------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------- |
| Rotate Supabase service-role + anon keys, Stripe secret + webhook secret (SEC-1) | S      | 🔴 **BLOCKED — requires you.** Dashboard access; cannot be automated. **This is the only step that revokes access.** |
| `git rm --cached .env`, gitignore it, add `.env.example` (SEC-1)                 | S      | ✅ Done — `d3ac0ac`                                                                                                  |
| `npm i next@13.5.11` — close the middleware auth bypass (SEC-2)                  | S      | ✅ Done — `dceb2a7`. CVE-2025-29927 confirmed cleared; typecheck + build pass                                        |
| `npm uninstall react-router-dom socket.io-client` (SEC-9)                        | S      | ✅ Done — `dceb2a7`. audit 25 → 20, critical 2 → 1                                                                   |
| Decide on git history rewrite (§6 Q1)                                            | S      | ⚠️ **Your decision.** Repo confirmed **PUBLIC**, exposed **604 days** — see §6 Q1                                    |

### Phase 1 — Critical Security & Data Integrity (week 1–2) — ⏳ IN PROGRESS

Commits `c12e48d` · `bf6ac9f` · `668e1f4` · `572ad0a` · `8b27f1b` on `phase-0-security`.

| Item                                                                    | Effort | Status                                                                                                                     |
| ----------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------- |
| Adopt Supabase migrations; capture current schema (DB-1)                | M      | ◐ `supabase/migrations/` created. `supabase db pull` still needs running against the live project                          |
| Audit + document every RLS policy (DB-2)                                | M      | 🔴 **BLOCKED — needs you.** `pg_policies` is not reachable over REST with any key. Run `supabase/audit/inspect_schema.sql` |
| Write owner-scoped RLS policies (DB-3)                                  | M      | ◐ Written, **not applied** — `20260827000001`. Verify against DB-2 output first                                            |
| Move playlist authorization server-side (SEC-5)                         | M      | ✅ `668e1f4`                                                                                                               |
| Authenticate the WebSocket layer; stop trusting client identity (SEC-3) | M      | ✅ `bf6ac9f`                                                                                                               |
| Scope WS broadcasts per room (SEC-4)                                    | S      | ✅ `bf6ac9f`                                                                                                               |
| Auth guard on the checkout route (SEC-8)                                | S      | ✅ `c12e48d` — plus server-side price validation                                                                           |
| Zod validation at all trust boundaries (SEC-6)                          | M      | ✅ `c12e48d`, `572ad0a`                                                                                                    |
| Upload size/MIME/key-sanitization limits (SEC-7)                        | M      | ✅ `572ad0a`                                                                                                               |
| `npm audit fix` + upgrade `ws`/`stripe`/`supabase` CLI (SEC-10)         | M      | ◐ `uniqid` removed. `ws`/`stripe`/`supabase` upgrades outstanding                                                          |
| Security headers (SEC-11)                                               | S      | ✅ `572ad0a` — CSP is report-only pending tuning                                                                           |
| Rate limiting (SEC-12)                                                  | S      | ⬜ Not started — needs a decision on Upstash vs. alternative                                                               |
| Regenerate `types_db.ts` as UTF-8 (DB-4)                                | S      | ⬜ Blocked on DB-2 output / `supabase gen types`                                                                           |
| Add all missing indexes (DB-7)                                          | S      | ◐ Written, **not applied** — `20260827000002`                                                                              |

### Phase 2 — Stability, Correctness & Performance (week 2–4) — ✅ COMPLETE

| Item                                                                   | Effort | Status                                                                                      |
| ---------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| **Remove the Render host — rooms on Supabase Realtime (DB-11, DB-13)** | L      | ✅ `adac2b6` — pulled forward from Phase 4                                                  |
| Fix crashing/buggy features — FEAT-1, 4, 5, UX-7, UX-9                 | S each | ✅ `b460600`                                                                                |
| `NOT NULL` constraints (DB-6)                                          | S      | ✅ Migration 4 applied                                                                      |
| Server-side query limits (PERF-1)                                      | L      | ◐ `d592df4` — limits added, search uncapped. Cursor pagination / infinite scroll still open |
| Zustand selectors; playback position out of the global store (PERF-2)  | M      | ✅ `d592df4`                                                                                |
| Fix the `LikeButton` N+1 (PERF-3)                                      | M      | ✅ `d592df4`                                                                                |
| Prettier + a11y lint + CI + pinned runtime (CQ-5, CQ-10, CQ-11)        | M      | ✅ `fcea9e8`, ESLint 9 flat config in `a016599`                                             |
| Regenerate `types_db.ts` (DB-4)                                        | S      | ✅ `b0a26d7`, `b34fb0c` — UTF-8, with `playlists` + `messages`                              |
| Fix the id type mismatch (DB-5)                                        | M      | ✅ `b0a26d7` — song ids are `number` end to end                                             |
| Remove `as any` / `@ts-ignore` (CQ-2, DB-10)                           | M      | ✅ `b0a26d7` — only the `use-sound` one remains, and that package genuinely ships no types  |
| Migrate to `@supabase/ssr` (DB-9)                                      | L      | ✅ `8a29801`                                                                                |
| **Upgrade Next 16 + React 19 (CQ-12)**                                 | L      | ✅ `a016599` — **runtime advisories now 0**                                                 |
| Convert client-rendered pages to server components (PERF-5)            | M      | ✅ `a016599` — `playlist/[id]` was the last one                                             |
| `npm audit` (SEC-10)                                                   | M      | ✅ 0 runtime advisories; 5 dev-only remain, none critical                                   |
| Real caching strategy (PERF-4)                                         | M      | ⬜ **Not started** — every route still `revalidate = 0`                                     |
| Test foundation — Vitest + first suites (CQ-9)                         | L      | ⬜ **Not started**                                                                          |
| Delete remaining dead code (CQ-1)                                      | S      | ◐ `getPlaylistsByTitle` still unused                                                        |

**Regression introduced:** `@supabase/ssr` adds roughly 70 kB of first-load JS per route versus the auth helpers it replaced. Tracked under PERF-10.

### Phase 3 — UX & Accessibility (week 4–5) — ⏳ MOSTLY COMPLETE

Commit `7a24f62`, plus player work that landed in `a016599`.

| Item                                                            | Effort | Status                                                                                   |
| --------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------- |
| Player accessibility — real buttons, keyboard seeking (UX-1)    | M      | ✅ `a016599` — transport is buttons, progress bar is `role="slider"` with arrow/Home/End |
| Focus rings, accessible names, alt text, contrast (UX-2 → UX-5) | S each | ✅ `7a24f62`                                                                             |
| Mobile player controls (UX-6)                                   | M      | ◐ prev/next/seek/mute now on mobile. Full-screen now-playing sheet not built             |
| Functional error boundaries + skeletons (UX-7, UX-8, CQ-8)      | M      | ✅ `b460600` + `7a24f62`                                                                 |
| Empty-state copy (UX-9)                                         | S      | ✅ `b460600`                                                                             |
| Retire the animated gradient; design tokens (UX-10, UX-11)      | M      | ✅ `7a24f62` — plus a `prefers-reduced-motion` block that was missing entirely           |
| Keyboard shortcuts (UX-12)                                      | S      | ✅ `7a24f62` — space, arrows, M/N/P                                                      |
| axe + Lighthouse to ≥95 (UX-13)                                 | M      | ◐ Verified against the live a11y tree; no automated axe/Lighthouse run yet               |
| Full-text / trigram search (DB-14)                              | M      | ◐ `pg_trgm` GIN index applied, which `ilike '%term%'` uses. `tsvector` ranking not done  |

**Caught only by inspecting the live accessibility tree:** song tiles and media rows were clickable `motion.div`s — invisible to keyboards and announcing nothing. `jsx-a11y` does not inspect `motion.*` elements, so lint had been passing clean over them the whole time. Worth remembering that a green lint run is not an accessibility check.

### Phase 4 — Features & Architecture (week 5+) — ⏳ IN PROGRESS

Commits `8cd3c90`, `c52f869`.

| Item                                                          | Effort | Status                                                                                          |
| ------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| `playlist_songs` join table migration (DB-8)                  | L      | ✅ `c52f869` — migration 6 applied                                                              |
| Rooms rebuilt on Supabase Realtime (DB-11)                    | L      | ✅ Phase 2, `adac2b6`                                                                           |
| Shuffle + repeat (FEAT-9)                                     | M      | ✅ `8cd3c90`                                                                                    |
| Visible queue (FEAT-10)                                       | L      | ✅ `8cd3c90`, `62d3d96` — view, jump, remove, drag-reorder + keyboard move                      |
| Media Session API + persisted player state (FEAT-11, FEAT-12) | S      | ✅ `8cd3c90`                                                                                    |
| Test foundation — Vitest (CQ-9)                               | L      | ◐ 58 tests over queue rules, the player store and three components. **No e2e yet**              |
| Fix room sync end-to-end (FEAT-6)                             | L      | ◐ `62d3d96` — track, chat, play/pause and position sync. **Not verified with two live clients** |
| Playlist enhancements (FEAT-13)                               | M      | ◐ Queue reorder done. Persisted playlist reorder, public/private and share links not started    |
| Recently played / history (FEAT-14)                           | M      | ✅ `624fc46` — migration 7 applied and verified                                                 |
| Artists & follows (FEAT-15)                                   | L      | ✅ `624fc46` — migration 8 applied, 12 artists backfilled                                       |
| Search improvements (FEAT-16)                                 | M      | ✅ `HEAD` — title _or_ author, artist results, filters, recent searches                         |
| Migrate mutations to Server Actions (CQ-7, CQ-15)             | L      | ✅ `HEAD` — every write goes through a validated action. Uploads stay client→storage            |
| PWA / offline (FEAT-17)                                       | M      | ✅ Manifest, offline page, conservative service worker                                          |
| Sentry + structured logging (CQ-14)                           | M      | ◐ Structured logger with redaction; Sentry left unwired (needs a DSN)                           |
| Real caching strategy (PERF-4)                                | M      | ⬜ Not started — carried over from Phase 2                                                      |

## 5. Breaking Changes / Risks

| Change                                           | Risk                                                                                                                                         | Mitigation                                                                                                        |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Credential rotation (Phase 0)**                | Production breaks the moment old keys die if Vercel env vars aren't updated in the same window                                               | Update Vercel env vars first, redeploy, verify, _then_ revoke the old keys                                        |
| **Git history rewrite**                          | Rewrites every commit SHA; breaks clones, forks, and open PRs                                                                                | Coordinate; force-push once; have collaborators re-clone. Rotation already neutralizes the risk — this is cleanup |
| **`songs.id` type change (DB-5)**                | Touches `liked_songs.song_id`, `playlists.song_ids`, and every client cast. **Data migration with FK rewrites**                              | Migrate in a transaction with a mapping table; keep the old column until verified; full backup first              |
| **`playlists.song_ids` → join table (DB-8)**     | Backfill required; array data must be expanded into rows with positions preserved                                                            | Dual-write during transition; verify counts match before dropping the array column                                |
| **Tightening RLS (DB-3)**                        | If current policies are permissive, correct policies **will** break queries that silently relied on cross-user reads (e.g. `getPlaylists()`) | Roll out on a staging branch; fix client queries first, then tighten policies                                     |
| **`NOT NULL` constraints (DB-6)**                | Fails outright if existing rows contain nulls                                                                                                | Audit and backfill before applying                                                                                |
| **`@supabase/ssr` migration (DB-9)**             | Different cookie handling — **all users are logged out** on deploy                                                                           | Ship during low traffic; communicate; verify all three auth providers in staging                                  |
| **Next.js 15 upgrade (CQ-12)**                   | `cookies()`/`headers()` become async; caching defaults invert; every action file touched                                                     | Use the official codemod; upgrade on a branch; full manual regression pass                                        |
| **Supabase Realtime migration (DB-11)**          | Rooms are the flagship feature; a regression is highly visible                                                                               | Feature-flag; run both paths in parallel; migrate room-by-room                                                    |
| **Storage key change to `${user.id}/…` (SEC-7)** | Existing objects live at flat paths; old URLs break                                                                                          | Apply to new uploads only; migrate old objects with a background script and update `song_path`/`image_path`       |
| **Pagination (PERF-1)**                          | Changes every list component's data contract                                                                                                 | Ship per-route behind a flag                                                                                      |
| **Upload validation (SEC-7)**                    | Files that were previously accepted will now be rejected                                                                                     | Communicate limits in the UI before enforcing                                                                     |

**Standing risks:** there is no staging environment, no backup/restore procedure documented, and no test suite to catch regressions from any of the above. Phase 1 should establish at least the first and third.

---

## 6. Open Questions

1. ~~**Git history — rewrite or rotate-only?**~~ **ANSWERED during Phase 0 — and it is worse than assumed.** `github.com/DevVaradPatil/spotify-2.O` is **PUBLIC**, and `.env` has been live on the public default branch for **604 days** (committed `18efdaf`, 2024-12-31). The credentials must be treated as **already harvested**, not merely at risk — public-repo secret scrapers index new commits within minutes.
   - **Rotation is mandatory and urgent.** It is the only action that actually revokes access.
   - **History rewrite is now cleanup, not remedy.** GitHub retains unreferenced commits, forks keep full copies, and 604 days of scraping cannot be undone. Rewrite only after rotation, and only if you also want the secrets gone from the visible history. **Still your call — see the decision in §4 Phase 0.**

2. ◐ **Partially answered.** The null audit and the `playlists`/`messages` id types came back; queries 1–8 of `audit/inspect_schema.sql` (full policy text, existing indexes, constraints, triggers, storage bucket policies) have not. Migrations 1–5 are all applied and the app works against them, so this is now confirmation rather than a blocker. Original ask: This is the single biggest gap in the audit — no policies exist in the repo, so I inferred them from query behaviour and did not guess at definitions. Please run this in the Supabase SQL editor and share the output:

   ```sql
   select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
   from pg_policies where schemaname = 'public' order by tablename, policyname;

   select relname, relrowsecurity, relforcerowsecurity
   from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r';
   ```

   Same for indexes (`select * from pg_indexes where schemaname='public'`) and storage bucket policies. I can then write exact migrations rather than proposed ones.

3. **Is the app currently deployed and in use by real people?** `NEXT_PUBLIC_SITE_URL` points at `spotify-2-o.vercel.app`. If there are real users and real uploaded content, the data migrations in Phase 2/4 need backups and staged rollout. If it's dormant, we can move much faster and destructively.

4. **Should premium gating be real?** The subscription check in `useOnPlay` is commented out, so playback is free while uploads are still gated. Three options: (a) drop Stripe entirely and make everything free, (b) restore gating on uploads only, (c) restore full gating on playback. This decides whether Stripe stays in the stack at all.

5. ~~**Music rooms: rebuild on Supabase Realtime, or harden the standalone `ws` server?**~~ **DECIDED — Realtime, done in `adac2b6`.** `server.js` and the Render host are gone. Vercel cannot host a long-lived socket process on any runtime, so this was the only way to keep the feature on a single free host. No functionality was lost; presence (a live listener count) came free.

6. **How far do you want to go on Next.js?** _(Corrected during Phase 0: the current major is **16.x**, not 15.x as originally written. `npm audit` names `next@16.3.3` as the only full fix.)_ Options: (a) stay on 13.5.11 patched, (b) move to 15.x, (c) move to 16.x + React 19. **My recommendation: (c)** — 13.x is EOL, and **29 high-severity advisories remain open at 13.5.11** (SSRF in Server Actions, cache poisoning, XSS via CSP nonces, request smuggling in rewrites). Only the critical middleware bypass was closed by the patch. Staying costs more over time than upgrading once.

7. **Uploads: who can upload, and what are the limits?** Any authenticated user today, with no size cap, no duration cap, and no moderation. What should max file size be, and does user-uploaded audio need any review before it's publicly playable?

8. **What is the actual product goal?** A portfolio piece, a real product for real listeners, or a learning sandbox? This changes the priority order significantly — a portfolio piece weights UI/UX and code quality; a real product weights security, tests, and observability first.

9. ~~**`songs.id` — migrate to `uuid` or standardize on `number`?**~~ **DECIDED — standardized on `number`, `b0a26d7`.** No data migration, and it fixed the silent playlist add/remove failure. Moving to `uuid` later remains possible but is now a deliberate choice rather than a correctness fix.

10. **Is there a staging environment, or budget for a second Supabase project?** Several Phase 2/4 items (RLS tightening, `@supabase/ssr`, the id migration) really should not be tested against production.

---

_End of plan. No code has been changed. Awaiting review before Phase 0._
