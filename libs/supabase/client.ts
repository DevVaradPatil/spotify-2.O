import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types_db";

/**
 * Browser Supabase client. Replaces createClientComponentClient from the
 * deprecated @supabase/auth-helpers-nextjs.
 *
 * createBrowserClient memoises internally, so repeated calls return the same
 * instance — but SupabaseProvider still holds one in state and shares it
 * through context so every consumer is provably on the same client.
 */
export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
