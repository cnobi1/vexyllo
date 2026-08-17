import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and getClaims — a stray
  // early return here would drop the refreshed session silently.
  const { data } = await supabase.auth.getClaims();
  const isAuthed = !!data?.claims;

  const path = request.nextUrl.pathname;
  const isAuthRoute = path.startsWith("/login") || path.startsWith("/signup") || path.startsWith("/auth");
  // Admin has its own separate login (src/app/admin/login/), distinct from
  // the regular /login — checked before isAdminRoute below so an
  // unauthenticated visit to /admin/login itself isn't redirected away.
  const isAdminLoginRoute = path.startsWith("/admin/login");
  const isAdminRoute = path.startsWith("/admin");
  // The public marketing site (src/app/(marketing)/) — reachable logged out,
  // and redirected away from once logged in (see below) so authed users
  // land in the app instead of the logged-out marketing chrome.
  const isPublicMarketingRoute =
    path === "/" || path.startsWith("/services") || path.startsWith("/pricing") || path.startsWith("/about");

  if (!isAuthed && !isAuthRoute && !isAdminLoginRoute && !isPublicMarketingRoute) {
    const url = request.nextUrl.clone();
    url.pathname = isAdminRoute ? "/admin/login" : "/login";
    return NextResponse.redirect(url);
  }

  if (isAuthed && isPublicMarketingRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
