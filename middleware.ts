import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

/**
 * Refreshes the auth session cookie on every request.
 *
 * The cookie plumbing is more involved than the old createMiddlewareClient
 * one-liner because @supabase/ssr requires the refreshed cookies to be
 * written onto both the request (so downstream server components see them)
 * and the response (so the browser stores them).
 */
export async function middleware(req: NextRequest) {
  let response = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          response = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser(), not getSession(): it revalidates the token against the auth
  // server rather than trusting whatever the cookie claims.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and image files, which never need a
    // session refresh and were needlessly paying for one before.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|mp3)$).*)",
  ],
};
