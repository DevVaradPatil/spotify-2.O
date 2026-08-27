-- Phase 1 · DB-7 — indexes for the queries this app actually runs
--
-- Safe to paste straight into the Supabase SQL editor.
--
-- An earlier version of this file used CREATE INDEX CONCURRENTLY, which
-- fails there with:
--   ERROR: 25001: CREATE INDEX CONCURRENTLY cannot run inside a transaction block
-- The SQL editor wraps whatever you paste in a transaction, and
-- CONCURRENTLY is not allowed inside one.
--
-- Plain CREATE INDEX is the right call here anyway. CONCURRENTLY exists to
-- avoid holding a write lock on a big table; `songs` currently holds 17
-- rows, so every index below builds in single-digit milliseconds. If these
-- tables ever grow into the millions, see the note at the bottom.
--
-- Check what already exists first:
--   select indexname, indexdef from pg_indexes where schemaname = 'public';

-- Required for the trigram index on songs.title below.
create extension if not exists pg_trgm;

-- Every song listing orders by created_at desc.
--   actions/getSongs.ts, getSongsByTitle.ts, getSongsByUserId.ts
create index if not exists songs_created_at_desc_idx
  on public.songs (created_at desc);

-- The library page filters by owner, then orders by recency.
--   actions/getSongsByUserId.ts
create index if not exists songs_user_id_created_at_idx
  on public.songs (user_id, created_at desc);

-- Search runs `ilike '%term%'`, which cannot use a btree index at all and
-- currently forces a sequential scan of the whole table.
--   actions/getSongsByTitle.ts
create index if not exists songs_title_trgm_idx
  on public.songs using gin (title gin_trgm_ops);

-- The liked page filters by user and orders by recency.
--   actions/getLikedSongs.ts
create index if not exists liked_songs_user_id_created_at_idx
  on public.liked_songs (user_id, created_at desc);

-- The liked-songs set is loaded once per session by user.
--   hooks/useLikedSongs.tsx
create index if not exists liked_songs_user_id_song_id_idx
  on public.liked_songs (user_id, song_id);

-- Playlist listing, now filtered server-side by owner.
--   actions/getPlaylists.ts
create index if not exists playlists_user_id_created_at_idx
  on public.playlists (user_id, created_at desc);

-- Chat replay on join, and the hourly retention delete.
--   hooks/useRoomChannel.ts
create index if not exists messages_room_code_created_at_idx
  on public.messages (room_code, created_at);

create index if not exists messages_created_at_idx
  on public.messages (created_at);

-- useUser() loads the active subscription on every page load.
--   hooks/useUser.tsx
create index if not exists subscriptions_user_id_status_idx
  on public.subscriptions (user_id, status);

-- Every Stripe webhook delivery resolves a customer by its Stripe id.
--   libs/supabaseAdmin.ts#manageSubscriptionStatusChange
create index if not exists customers_stripe_customer_id_idx
  on public.customers (stripe_customer_id);


-- ---------------------------------------------------------------------------
-- Optional follow-ups
-- ---------------------------------------------------------------------------
--
-- 1. customers.stripe_customer_id should arguably be UNIQUE — one Stripe
--    customer maps to exactly one user. It is a plain index above so this
--    script cannot fail on pre-existing duplicates. To tighten it, first
--    check:
--
--      select stripe_customer_id, count(*)
--      from public.customers
--      where stripe_customer_id is not null
--      group by stripe_customer_id having count(*) > 1;
--
--    If that returns no rows:
--
--      drop index if exists public.customers_stripe_customer_id_idx;
--      create unique index customers_stripe_customer_id_idx
--        on public.customers (stripe_customer_id);
--
-- 2. If any of these tables ever gets large, rebuild with CONCURRENTLY from
--    a client that does not open a transaction — `psql` or `supabase db
--    push`, not the SQL editor. Statements must be sent one at a time.
