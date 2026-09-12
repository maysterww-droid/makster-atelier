import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function redirectToLogin(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  return NextResponse.redirect(url);
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith('/api/webhooks/lemonsqueezy')) {
    return NextResponse.next({ request });
  }

  const isPublicRoute = pathname.startsWith('/login')
    || pathname.startsWith('/auth')
    || pathname.startsWith('/q/');

  // Public pages do not need an auth lookup. Keeping them independent from
  // Supabase session refresh prevents a transient auth failure from taking
  // down the login or public quote experience.
  if (isPublicRoute) {
    return NextResponse.next({ request });
  }

  // Supabase SSR stores sessions in sb-*-auth-token cookies. If no session
  // cookie exists, redirect immediately instead of asking Auth to decode an
  // absent token. This keeps anonymous protected-route requests deterministic.
  const hasAuthCookie = request.cookies
    .getAll()
    .some(({ name }) => name.startsWith('sb-') && name.includes('-auth-token'));

  if (!hasAuthCookie) {
    return redirectToLogin(request);
  }

  let response = NextResponse.next({ request });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet, headers) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
            Object.entries(headers).forEach(([key, value]) => {
              response.headers.set(key, value);
            });
          },
        },
      },
    );

    const { data, error } = await supabase.auth.getClaims();
    const claims = data?.claims;

    if (error || !claims) {
      return redirectToLogin(request);
    }
  } catch {
    // Invalid, expired, or otherwise unreadable session state must never turn
    // an anonymous navigation into a 5xx page. Treat it as signed-out.
    return redirectToLogin(request);
  }

  return response;
}
