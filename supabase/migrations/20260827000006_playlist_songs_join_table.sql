-- Phase 4 · DB-8 — replace playlists.song_ids with a join table
--
-- NOT YET APPLIED. Run after migrations 1-5.
--
-- `song_ids` is an int8[] mutated read-modify-write in the browser: read the
-- array, splice or push, write the whole thing back. Two tabs adding
-- different songs at the same time means the second write silently discards
-- the first. There is also no foreign key, so deleting a song leaves a
-- dangling id in every playlist that referenced it, and no ordering beyond
-- whatever order things happened to be appended in.
--
-- This migration is deliberately additive: `song_ids` is left in place and
-- populated so a rollback is just pointing the code back at it. Dropping it
-- is a separate step once the join table has been running cleanly — see the
-- bottom of this file.

begin;

create table if not exists public.playlist_songs (
  playlist_id bigint not null references public.playlists (id) on delete cascade,
  song_id     bigint not null references public.songs (id) on delete cascade,
  position    integer not null default 0,
  added_at    timestamptz not null default now(),
  primary key (playlist_id, song_id)
);

-- Expand the existing arrays, preserving their order as `position`.
insert into public.playlist_songs (playlist_id, song_id, position)
select
  p.id,
  s.song_id,
  s.ordinality - 1
from public.playlists p
cross join lateral unnest(coalesce(p.song_ids, '{}')) with ordinality as s(song_id, ordinality)
-- Skip ids that no longer exist: the array had no foreign key, so it can
-- reference deleted songs.
where exists (select 1 from public.songs where id = s.song_id)
on conflict (playlist_id, song_id) do nothing;

create index if not exists playlist_songs_playlist_position_idx
  on public.playlist_songs (playlist_id, position);

create index if not exists playlist_songs_song_id_idx
  on public.playlist_songs (song_id);

-- ---------------------------------------------------------------------------
-- RLS — membership is owned by whoever owns the playlist.
-- ---------------------------------------------------------------------------
alter table public.playlist_songs enable row level security;

drop policy if exists "playlist_songs: read own" on public.playlist_songs;
create policy "playlist_songs: read own" on public.playlist_songs
  for select using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "playlist_songs: insert own" on public.playlist_songs;
create policy "playlist_songs: insert own" on public.playlist_songs
  for insert with check (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "playlist_songs: update own" on public.playlist_songs;
create policy "playlist_songs: update own" on public.playlist_songs
  for update using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "playlist_songs: delete own" on public.playlist_songs;
create policy "playlist_songs: delete own" on public.playlist_songs
  for delete using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and p.user_id = auth.uid()
    )
  );

commit;

-- ---------------------------------------------------------------------------
-- Verification — run before considering this done.
-- ---------------------------------------------------------------------------
-- Every array entry that pointed at a real song should now have a row.
-- Expect zero:
--
--   select p.id, cardinality(coalesce(p.song_ids,'{}')) as array_len,
--          count(ps.song_id) as row_count
--   from public.playlists p
--   left join public.playlist_songs ps on ps.playlist_id = p.id
--   group by p.id, p.song_ids
--   having cardinality(coalesce(p.song_ids,'{}')) <> count(ps.song_id);
--
-- Any difference is dangling ids the array held for deleted songs, which is
-- expected and is exactly what the foreign key now prevents.

-- ---------------------------------------------------------------------------
-- Follow-up, NOT part of this migration.
-- ---------------------------------------------------------------------------
-- Once the app has been running on playlist_songs and the counts above check
-- out, drop the old column:
--
--   alter table public.playlists drop column song_ids;
--
-- Do that in its own migration, and regenerate types_db.ts afterwards.
