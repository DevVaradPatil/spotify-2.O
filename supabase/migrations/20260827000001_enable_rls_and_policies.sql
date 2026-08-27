-- Phase 1 · DB-2 / DB-3 — Row Level Security baseline
--
-- NOT YET APPLIED. Review before running.
--
-- The live policy set could not be read from this machine, so this migration
-- is written to be idempotent and self-contained: it drops any policy of the
-- same name before creating it. Run the audit query in
-- supabase/audit/inspect_schema.sql FIRST and compare — if a policy exists
-- that is not represented here, decide deliberately whether to keep it.
--
-- Apply with:  supabase db push
-- Or paste into the Supabase SQL editor.

begin;

-- ---------------------------------------------------------------------------
-- users — a person may read and update only their own profile row.
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;

drop policy if exists "users: read own" on public.users;
create policy "users: read own" on public.users
  for select using (auth.uid() = id);

drop policy if exists "users: update own" on public.users;
create policy "users: update own" on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- songs — the catalog is intentionally world-readable; writes are owner-only.
-- ---------------------------------------------------------------------------
alter table public.songs enable row level security;

drop policy if exists "songs: public read" on public.songs;
create policy "songs: public read" on public.songs
  for select using (true);

drop policy if exists "songs: insert own" on public.songs;
create policy "songs: insert own" on public.songs
  for insert with check (auth.uid() = user_id);

drop policy if exists "songs: update own" on public.songs;
create policy "songs: update own" on public.songs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "songs: delete own" on public.songs;
create policy "songs: delete own" on public.songs
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- liked_songs — strictly private to the owner.
-- ---------------------------------------------------------------------------
alter table public.liked_songs enable row level security;

drop policy if exists "liked_songs: read own" on public.liked_songs;
create policy "liked_songs: read own" on public.liked_songs
  for select using (auth.uid() = user_id);

drop policy if exists "liked_songs: insert own" on public.liked_songs;
create policy "liked_songs: insert own" on public.liked_songs
  for insert with check (auth.uid() = user_id);

drop policy if exists "liked_songs: delete own" on public.liked_songs;
create policy "liked_songs: delete own" on public.liked_songs
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- playlists — the important fix.
--
-- The app read every playlist in the table and filtered by owner in the
-- browser, which strongly suggests SELECT is currently open to everyone.
-- After this migration a playlist is visible only to its owner.
--
-- NOTE: if you later want public/shared playlists, add a `is_public boolean
-- not null default false` column and extend the select policy to
--   using (auth.uid() = user_id or is_public)
-- rather than loosening this one.
-- ---------------------------------------------------------------------------
alter table public.playlists enable row level security;

drop policy if exists "playlists: read own" on public.playlists;
create policy "playlists: read own" on public.playlists
  for select using (auth.uid() = user_id);

drop policy if exists "playlists: insert own" on public.playlists;
create policy "playlists: insert own" on public.playlists
  for insert with check (auth.uid() = user_id);

drop policy if exists "playlists: update own" on public.playlists;
create policy "playlists: update own" on public.playlists
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "playlists: delete own" on public.playlists;
create policy "playlists: delete own" on public.playlists
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- messages — room chat.
--
-- Writes come exclusively from the WebSocket server using the service role
-- key, which bypasses RLS, so no INSERT policy is granted to end users.
-- Reads are restricted to authenticated users; the server replays history
-- over the socket, so the browser no longer queries this table directly.
--
-- This is deliberately coarse: possession of a room code still implies
-- access. A real membership table is tracked as SEC-9 in IMPROVEMENT_PLAN.md.
-- ---------------------------------------------------------------------------
alter table public.messages enable row level security;

drop policy if exists "messages: authenticated read" on public.messages;
create policy "messages: authenticated read" on public.messages
  for select to authenticated using (true);

-- Explicitly no insert/update/delete policy: only the service role writes.

-- ---------------------------------------------------------------------------
-- Billing tables — read-only to the owner. All writes happen through the
-- Stripe webhook with the service role key.
-- ---------------------------------------------------------------------------
alter table public.customers enable row level security;
-- No policies at all: `customers` maps Supabase ids to Stripe customer ids
-- and is never read from the browser.

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions: read own" on public.subscriptions;
create policy "subscriptions: read own" on public.subscriptions
  for select using (auth.uid() = user_id);

-- Products and prices are the public pricing table shown in the subscribe
-- modal — readable by anyone, written only by the webhook.
alter table public.products enable row level security;

drop policy if exists "products: public read" on public.products;
create policy "products: public read" on public.products
  for select using (true);

alter table public.prices enable row level security;

drop policy if exists "prices: public read" on public.prices;
create policy "prices: public read" on public.prices
  for select using (true);

commit;
