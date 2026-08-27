-- Phase 1 · DB-7 — indexes for the queries this app actually runs
--
-- NOT YET APPLIED. Review before running.
--
-- Every index is created CONCURRENTLY so it will not lock writes on a live
-- table. CONCURRENTLY cannot run inside a transaction block, so there is no
-- begin/commit here — run the statements one at a time if your client wraps
-- scripts in a transaction (the Supabase SQL editor does not).
--
-- Check what already exists first:
--   select indexname, indexdef from pg_indexes where schemaname = 'public';

-- Required for the trigram index on songs.title below.
create extension if not exists pg_trgm;

-- Every song listing orders by created_at desc.
--   actions/getSongs.ts, getSongsByTitle.ts, getSongsByUserId.ts
create index concurrently if not exists songs_created_at_desc_idx
  on public.songs (created_at desc);

-- The library page filters by owner, then orders by recency.
--   actions/getSongsByUserId.ts
create index concurrently if not exists songs_user_id_created_at_idx
  on public.songs (user_id, created_at desc);

-- Search runs `ilike '%term%'`, which cannot use a btree index at all and
-- currently forces a sequential scan of the whole table.
--   actions/getSongsByTitle.ts
create index concurrently if not exists songs_title_trgm_idx
  on public.songs using gin (title gin_trgm_ops);

-- The liked page filters by user and orders by recency.
--   actions/getLikedSongs.ts
create index concurrently if not exists liked_songs_user_id_created_at_idx
  on public.liked_songs (user_id, created_at desc);

-- LikeButton looks up a single (user, song) pair on every rendered row.
--   components/LikeButton.tsx
create index concurrently if not exists liked_songs_user_id_song_id_idx
  on public.liked_songs (user_id, song_id);

-- Playlist listing, now filtered server-side by owner.
--   actions/getPlaylists.ts
create index concurrently if not exists playlists_user_id_created_at_idx
  on public.playlists (user_id, created_at desc);

-- Chat replay on join, and the hourly cleanup delete.
--   server.js
create index concurrently if not exists messages_room_code_created_at_idx
  on public.messages (room_code, created_at);

create index concurrently if not exists messages_created_at_idx
  on public.messages (created_at);

-- useUser() loads the active subscription on every page load.
--   hooks/useUser.tsx
create index concurrently if not exists subscriptions_user_id_status_idx
  on public.subscriptions (user_id, status);

-- Every Stripe webhook delivery resolves a customer by its Stripe id.
--   libs/supabaseAdmin.ts#manageSubscriptionStatusChange
create unique index concurrently if not exists customers_stripe_customer_id_idx
  on public.customers (stripe_customer_id);
