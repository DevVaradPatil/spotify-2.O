-- Phase 4 · FEAT-15 — artists as entities, and following them
--
-- NOT YET APPLIED. Run after migration 7.
--
-- `songs.author` is free text doing an entity's job: it cannot be followed,
-- browsed, deduplicated or renamed, and "Arijit Singh" typed two ways is two
-- different artists as far as the app is concerned.
--
-- Additive on purpose. `songs.author` is left in place and kept authoritative
-- for display until the app has been reading artist_id for a while, so a
-- rollback is just pointing the code back at it.

begin;

-- ---------------------------------------------------------------------------
-- artists
-- ---------------------------------------------------------------------------
create table if not exists public.artists (
  id         bigint generated always as identity primary key,
  name       text not null,
  slug       text not null unique,
  image_path text,
  created_at timestamptz not null default now()
);

create index if not exists artists_name_idx on public.artists (lower(name));

-- ---------------------------------------------------------------------------
-- Backfill from the distinct author strings already in songs.
--
-- One artist per distinct author, deliberately NOT split on separators.
-- Values like "Pritam - Arijit Singh" are a composer and a singer, and
-- splitting on " - " or "," would invent artists that do not exist and
-- mangle names that legitimately contain those characters. Splitting
-- credits properly is a data-cleaning exercise, not a migration.
-- ---------------------------------------------------------------------------
insert into public.artists (name, slug)
select
  distinct on (lower(btrim(s.author)))
  btrim(s.author) as name,
  -- Slug: lowercase, non-alphanumerics collapsed to hyphens, trimmed.
  btrim(regexp_replace(lower(btrim(s.author)), '[^a-z0-9]+', '-', 'g'), '-') as slug
from public.songs s
where s.author is not null
  and btrim(s.author) <> ''
order by lower(btrim(s.author))
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Link songs to artists
-- ---------------------------------------------------------------------------
alter table public.songs
  add column if not exists artist_id bigint references public.artists (id) on delete set null;

update public.songs s
set artist_id = a.id
from public.artists a
where s.artist_id is null
  and lower(btrim(s.author)) = lower(a.name);

create index if not exists songs_artist_id_idx on public.songs (artist_id);

-- ---------------------------------------------------------------------------
-- follows
-- ---------------------------------------------------------------------------
create table if not exists public.follows (
  user_id    uuid   not null references public.users (id) on delete cascade,
  artist_id  bigint not null references public.artists (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, artist_id)
);

create index if not exists follows_artist_id_idx on public.follows (artist_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.artists enable row level security;

-- Artists are catalog data, like songs: world-readable, written only by the
-- service role (the backfill above, and whatever creates them on upload).
drop policy if exists "artists: public read" on public.artists;
create policy "artists: public read" on public.artists
  for select using (true);

alter table public.follows enable row level security;

-- Who follows whom is public, so an artist page can show a follower count.
drop policy if exists "follows: public read" on public.follows;
create policy "follows: public read" on public.follows
  for select using (true);

drop policy if exists "follows: insert own" on public.follows;
create policy "follows: insert own" on public.follows
  for insert with check (auth.uid() = user_id);

drop policy if exists "follows: delete own" on public.follows;
create policy "follows: delete own" on public.follows
  for delete using (auth.uid() = user_id);

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- Every song with an author should have an artist. Expect zero rows:
--
--   select id, title, author from public.songs
--   where author is not null and btrim(author) <> '' and artist_id is null;
--
-- And the artist count should match the distinct author count:
--
--   select
--     (select count(distinct lower(btrim(author))) from public.songs
--       where author is not null and btrim(author) <> '') as distinct_authors,
--     (select count(*) from public.artists) as artists;
