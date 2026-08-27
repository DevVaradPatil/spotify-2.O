-- Phase 2 · DB-11 / DB-13 — move music rooms onto Supabase Realtime
--
-- Run after 20260827000001 (RLS) and 20260827000002 (indexes).
-- Safe to paste into the Supabase SQL editor.
--
-- ⚠ ROOM CHAT IS BROKEN UNTIL THIS RUNS.
-- 20260827000001 enabled RLS on `messages` with a read policy and no insert
-- policy, because at that point the only writer was the ws server using the
-- service role key, which bypasses RLS. That server is gone; the browser now
-- inserts chat directly. Without this migration those inserts fail twice
-- over — no insert policy, and no user_id column to insert into.
--
-- Replaces the standalone ws server. Two things have to change for the
-- browser to talk to Realtime directly and safely:
--
--   1. messages must carry user_id, so RLS can prove who wrote a row.
--      Identity previously lived only in denormalised email/full_name/
--      avatar_url columns supplied by the client, which is exactly why the
--      old server could be impersonated.
--   2. messages must be in the supabase_realtime publication for
--      postgres_changes subscriptions to fire.

begin;

-- ---------------------------------------------------------------------------
-- 1. Identity column
-- ---------------------------------------------------------------------------
alter table public.messages
  add column if not exists user_id uuid references public.users (id) on delete cascade;

-- Backfill from the denormalised email.
--
-- Joined through public.users rather than auth.users on purpose: the foreign
-- key points at public.users, so matching against auth.users could produce an
-- id with no corresponding public.users row and fail the constraint.
update public.messages m
set user_id = u.id
from public.users u
join auth.users au on au.id = u.id
where m.user_id is null
  and m.email is not null
  and lower(au.email) = lower(m.email);

create index if not exists messages_user_id_idx on public.messages (user_id);

-- ---------------------------------------------------------------------------
-- 2. RLS — a client may insert only rows attributed to itself
-- ---------------------------------------------------------------------------
alter table public.messages enable row level security;

drop policy if exists "messages: authenticated read" on public.messages;
create policy "messages: authenticated read" on public.messages
  for select to authenticated using (true);

-- This is what makes impersonation impossible now that no server verifies
-- tokens: the row's user_id must match the caller's verified JWT subject.
-- full_name / avatar_url become display copies rather than claims.
drop policy if exists "messages: insert own" on public.messages;
create policy "messages: insert own" on public.messages
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "messages: delete own" on public.messages;
create policy "messages: delete own" on public.messages
  for delete to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. Content guard rails, previously enforced only in the ws server
--
-- Added NOT VALID deliberately. These are checked on every new row, but not
-- retroactively validated against rows already in the table — legacy chat
-- with an empty body or a lowercase room code would otherwise abort this
-- whole migration. Those rows age out within the hour via retention.
--
-- Once the table has turned over you can promote them:
--   alter table public.messages validate constraint messages_content_length_check;
--   alter table public.messages validate constraint messages_room_code_format_check;
-- ---------------------------------------------------------------------------
alter table public.messages
  drop constraint if exists messages_content_length_check;
alter table public.messages
  add constraint messages_content_length_check
  check (char_length(content) between 1 and 2000) not valid;

alter table public.messages
  drop constraint if exists messages_room_code_format_check;
alter table public.messages
  add constraint messages_room_code_format_check
  check (room_code ~ '^[A-Z0-9]{6}$') not valid;

-- ---------------------------------------------------------------------------
-- 4. Publish to Realtime
-- ---------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end $$;

-- Realtime sends only the primary key on update/delete unless the replica
-- identity is full; harmless here but makes payloads complete.
alter table public.messages replica identity full;

commit;

-- ---------------------------------------------------------------------------
-- 5. Retention — replaces the setInterval in the deleted server.js
-- ---------------------------------------------------------------------------
-- pg_cron must be enabled once for the project:
--   Dashboard -> Database -> Extensions -> enable `pg_cron`
-- then run:
--
-- create extension if not exists pg_cron;
--
-- select cron.schedule(
--   'purge-old-room-messages',
--   '0 * * * *',
--   $$ delete from public.messages where created_at < now() - interval '1 hour' $$
-- );
