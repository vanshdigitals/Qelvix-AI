import { NextResponse, type NextRequest } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { POST_LOGIN_ROUTE } from '@/lib/supabase/config';

/**
 * Exchanges the code from an email verification, recovery, or OAuth redirect
 * for a session cookie, then forwards the user on.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  // Email/recovery flows pass this explicitly; OAuth does not.
  const explicitNext = searchParams.get('next');

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = createClient();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/login?error=not_configured`);
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=invalid_code`);
  }

  // Ensure the user has an org (covers Google OAuth and email-confirmation
  // signups, which land here rather than through actions.ts) and refresh so the
  // session cookie carries the new app_metadata.org_id claim. Idempotent.
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
  try {
    const res = await fetch(`${apiUrl}/auth/provision-org`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    });
    if (res.ok) {
      await supabase.auth.refreshSession();
    }
  } catch {
    // Non-fatal: the dashboard surfaces an auth error if the claim is still missing.
  }

  // Explicit next (e.g. email confirmation's next=/onboarding) is always honored.
  if (explicitNext) {
    return NextResponse.redirect(`${origin}${explicitNext}`);
  }

  // OAuth has no next: on a first-ever sign-in the account was just created, so
  // created_at and last_sign_in_at are effectively equal — send those users to
  // onboarding; everyone else goes to the dashboard.
  const user = data.session.user;
  const created = Date.parse(user.created_at);
  const lastSignIn = user.last_sign_in_at ? Date.parse(user.last_sign_in_at) : NaN;
  const isFirstSignIn =
    Number.isFinite(created) &&
    Number.isFinite(lastSignIn) &&
    Math.abs(lastSignIn - created) <= 5000;

  return NextResponse.redirect(`${origin}${isFirstSignIn ? '/onboarding' : POST_LOGIN_ROUTE}`);
}
