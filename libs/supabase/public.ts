import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types_db";

/**
 * Cookie-free anon client for data that is public and identical for everyone.
 *
 * The cookie-bound client in ./server.ts reads cookies, which marks the whole
 * request dynamic and makes the result impossible to cache. Songs, products
 * and prices are all world-readable under RLS, so they do not need a session
 * at all — and without one they can sit behind unstable_cache and be shared
 * across requests.
 *
 * Never use this for anything user-scoped: with no session, RLS sees an
 * anonymous caller.
 */
export const createPublicClient = () =>
  createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
