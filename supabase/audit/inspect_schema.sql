-- Run this in the Supabase SQL editor and paste the output back.
--
-- These catalogs live in pg_catalog, which PostgREST does not expose, so they
-- cannot be read with the anon or service_role key over the REST API — only
-- through the SQL editor, `supabase db pull`, or a direct Postgres connection.
--
-- Together these answer DB-2 (RLS audit) and confirm what DB-7 still needs.

-- 1. Which tables have RLS switched on at all?
--    relrowsecurity = false means the table is wide open to anyone holding
--    the anon key, regardless of what policies exist.
select
  c.relname                as table_name,
  c.relrowsecurity         as rls_enabled,
  c.relforcerowsecurity    as rls_forced
from pg_class c
where c.relnamespace = 'public'::regnamespace
  and c.relkind = 'r'
order by c.relname;

-- 2. Every policy, in full.
select
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual        as using_expression,
  with_check  as with_check_expression
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 3. Existing indexes, so the DB-7 migration does not duplicate them.
select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;

-- 4. Full column list — confirms the real shape of `playlists` and
--    `messages`, which are missing from types_db.ts.
select
  table_name,
  ordinal_position,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;

-- 5. Constraints and foreign keys.
select
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name  as references_table,
  ccu.column_name as references_column
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
 and tc.table_schema = kcu.table_schema
left join information_schema.constraint_column_usage ccu
  on tc.constraint_name = ccu.constraint_name
 and tc.table_schema = ccu.table_schema
where tc.table_schema = 'public'
order by tc.table_name, tc.constraint_type, tc.constraint_name;

-- 6. Triggers and functions (is there a handle_new_user trigger?).
select event_object_table as table_name, trigger_name, action_timing,
       event_manipulation, action_statement
from information_schema.triggers
where trigger_schema = 'public'
order by event_object_table, trigger_name;

select routine_name, security_type, external_language
from information_schema.routines
where routine_schema = 'public'
order by routine_name;

-- 7. Storage buckets — is `songs` / `images` public, and what policies guard
--    uploads?
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
order by name;

select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;

-- 8. Row counts, for sizing the migrations.
select 'songs' as t, count(*) from public.songs
union all select 'users', count(*) from public.users
union all select 'liked_songs', count(*) from public.liked_songs
union all select 'playlists', count(*) from public.playlists
union all select 'messages', count(*) from public.messages
union all select 'subscriptions', count(*) from public.subscriptions
union all select 'customers', count(*) from public.customers;

-- 9. Nullability audit — how much backfill does DB-6 need?
select
  count(*)                                          as total_songs,
  count(*) filter (where title is null)             as null_title,
  count(*) filter (where author is null)            as null_author,
  count(*) filter (where song_path is null)         as null_song_path,
  count(*) filter (where image_path is null)        as null_image_path,
  count(*) filter (where user_id is null)           as null_user_id
from public.songs;
