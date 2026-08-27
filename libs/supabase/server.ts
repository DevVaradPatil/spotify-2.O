import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types_db";

/**
 * Supabase client for server components and route handlers.
 *
 * Replaces createServerComponentClient / createRouteHandlerClient from the
 * deprecated @supabase/auth-helpers-nextjs.
 *
 * Deliberately async even though `cookies()` is synchronous on Next 13:
 * it becomes async in Next 15+, and awaiting a non-promise is a no-op, so
 * every call site is already written the way the upgrade needs.
 */
export const createClient = async () => {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a server component, where cookies are read-only.
            // middleware.ts refreshes the session, so this is safe to ignore.
          }
        },
      },
    }
  );
};
