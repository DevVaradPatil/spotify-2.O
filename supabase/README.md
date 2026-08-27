# Database migrations

No migration tooling is wired up yet — these are written to be pasted into the
Supabase SQL editor (Dashboard → SQL Editor) in filename order. Track what you
have applied here as you go.

## Apply order and status

| #   | File                                                | Status         | Notes                                         |
| --- | --------------------------------------------------- | -------------- | --------------------------------------------- |
| 1   | `20260827000001_enable_rls_and_policies.sql`        | ✅ **Applied** | RLS on all nine tables, owner-scoped policies |
| 2   | `20260827000002_add_missing_indexes.sql`            | ⬜ Not applied | Ten indexes + `pg_trgm`                       |
| 3   | `20260827000003_messages_identity_and_realtime.sql` | ⬜ Not applied | **Required for room chat to work at all**     |
| 4   | `20260827000004_songs_not_null.sql`                 | ⬜ Not applied | Verified zero backfill needed                 |

## Known gotchas

**`CREATE INDEX CONCURRENTLY` does not work in the SQL editor.** The editor
wraps whatever you paste in a transaction, and `CONCURRENTLY` is illegal
inside one:

```
ERROR: 25001: CREATE INDEX CONCURRENTLY cannot run inside a transaction block
```

Migration 2 uses plain `CREATE INDEX` for this reason. At current table sizes
(17 songs) the build is single-digit milliseconds, so the lock is irrelevant.
If these tables ever get large, rebuild with `CONCURRENTLY` from `psql` or
`supabase db push`, sending statements one at a time.

**Migrations 1 and 3 are a pair.** Migration 1 enabled RLS on `messages` with
a read policy and no insert policy, which was correct while the WebSocket
server wrote chat with the service role key. That server has been deleted —
the browser now inserts directly — so between migration 1 and migration 3
**chat inserts fail**: no insert policy, and no `user_id` column to insert
into. Apply 3 promptly.

**Migration 3's check constraints are `NOT VALID` on purpose.** They apply to
new rows only. Validating retroactively would abort the migration if any
legacy chat row has an empty body or a non-conforming room code. Those rows
age out within the hour; promote the constraints afterwards with
`ALTER TABLE ... VALIDATE CONSTRAINT ...`.

## Still outstanding

`audit/inspect_schema.sql` has not been run in full. Queries 1–8 — RLS state,
policy text, existing indexes, columns, constraints, triggers, storage bucket
policies, row counts — are still needed to confirm the live schema matches
what these migrations assume, and to regenerate `types_db.ts`, which is
missing the `playlists` and `messages` tables entirely.

Only query 9 (the null audit) has been run so far. It returned 17 songs and
zero nulls in every column, which is what made migration 4 safe to write
without a backfill step.
