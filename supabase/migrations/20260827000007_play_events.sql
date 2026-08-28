-- Phase 4 · FEAT-14 — listening history
--
-- NOT YET APPLIED. Run after migrations 1-6.
--
-- One row per time a track starts. Kept as an append-only event log rather
-- than a "last played" column on songs, because history is per-user and a
-- column could only ever hold one person's.

begin;

create table if not exists public.play_events (
  id        bigint generated always as identity primary key,
  user_id   uuid   not null references public.users (id) on delete cascade,
  song_id   bigint not null references public.songs (id) on delete cascade,
  played_at timestamptz not null default now()
);

-- The only query this table serves: a user's history, newest first.
create index if not exists play_events_user_played_at_idx
  on public.play_events (user_id, played_at desc);

-- Supports the cascade when a song is deleted.
create index if not exists play_events_song_id_idx
  on public.play_events (song_id);

-- ---------------------------------------------------------------------------
-- RLS — listening history is private. No update policy at all: an event log
-- is append-only, and a played_at that can be rewritten is not history.
-- ---------------------------------------------------------------------------
alter table public.play_events enable row level security;

drop policy if exists "play_events: read own" on public.play_events;
create policy "play_events: read own" on public.play_events
  for select using (auth.uid() = user_id);

drop policy if exists "play_events: insert own" on public.play_events;
create policy "play_events: insert own" on public.play_events
  for insert with check (auth.uid() = user_id);

drop policy if exists "play_events: delete own" on public.play_events;
create policy "play_events: delete own" on public.play_events
  for delete using (auth.uid() = user_id);

commit;

-- ---------------------------------------------------------------------------
-- Retention
-- ---------------------------------------------------------------------------
-- This table grows without bound — one row per play, forever. Once pg_cron is
-- enabled (see migration 3), schedule a trim:
--
-- select cron.schedule(
--   'trim-play-events',
--   '0 3 * * *',
--   $$ delete from public.play_events
--      where played_at < now() - interval '90 days' $$
-- );
