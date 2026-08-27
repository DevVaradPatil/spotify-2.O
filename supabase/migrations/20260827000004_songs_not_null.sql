-- Phase 2 · DB-6 — tighten songs nullability
--
-- NOT YET APPLIED.
--
-- Verified safe against the live table before writing this. The null audit
-- in supabase/audit/inspect_schema.sql returned:
--
--   total_songs | null_title | null_author | null_song_path | null_image_path | null_user_id
--   17          | 0          | 0           | 0              | 0               | 0
--
-- No backfill is required. Re-run query 9 immediately before applying to
-- confirm nothing has been inserted since.
--
-- Every one of these columns was nullable, which is why ExploreContent
-- crashes on `a.title.localeCompare(b.title)` — the type said the value was
-- always there, the schema did not agree.

begin;

alter table public.songs alter column title     set not null;
alter table public.songs alter column author    set not null;
alter table public.songs alter column song_path set not null;
alter table public.songs alter column user_id   set not null;

-- image_path stays nullable on purpose: cover art is genuinely optional and
-- the UI already falls back to a placeholder.

commit;
