'use client';

import { createClient } from '@/lib/supabase/client';
import { SUPABASE_NOT_CONFIGURED_MESSAGE } from '@/lib/supabase/config';

export interface AuthResult {
  ok: boolean;
  /** User-facing message. Never contains raw provider internals. */
  error?: string;
  sessionCreated?: boolean;
}

/**
 * Maps Supabase errors to language the primary persona can act on. Unknown
 * errors pass through their message rather than being swallowed.
 */
function toMessage(raw: string): string {
  const normalised = raw.toLowerCase();
  if (normalised.includes('invalid login credentials')) {
    return 'That email and password combination does not match an account.';
  }
  if (normalised.includes('email not confirmed')) {
    return 'Confirm your email address first — check your inbox for the verification link.';
  }
  if (normalised.includes('already registered') || normalised.includes('already been registered')) {
    return 'An account with this email already exists. Log in instead.';
  }
  if (normalised.includes('rate limit') || normalised.includes('too many')) {
    return 'Too many attempts. Wait a minute and try again.';
  }
  if (normalised.includes('password should be')) {
    return 'That password is too weak. Use at least 8 characters with a mix of types.';
  }
  return raw;
}

function siteUrl(path: string): string {
  // Prefer an explicit canonical origin so email/OAuth redirects are correct
  // even when built server-side (no window) or behind a proxy. Falls back to the
  // live origin in the browser. Supabase must still allowlist this URL.
  const trimmed = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  const configured = trimmed ? trimmed : undefined;
  const origin = configured ?? (typeof window === 'undefined' ? '' : window.location.origin);
  return `${origin}${path}`;
}

export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  const supabase = createClient();
  if (!supabase) return { ok: false, error: SUPABASE_NOT_CONFIGURED_MESSAGE };

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? { ok: false, error: toMessage(error.message) } : { ok: true };
}

export async function signUpWithPassword(
  email: string,
  password: string,
  metadata: { fullName: string; companyName: string },
): Promise<AuthResult> {
  const supabase = createClient();
  if (!supabase) return { ok: false, error: SUPABASE_NOT_CONFIGURED_MESSAGE };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: siteUrl('/auth/callback?next=/onboarding'),
      data: { full_name: metadata.fullName, company_name: metadata.companyName },
    },
  });
  if (error) {
    return { ok: false, error: toMessage(error.message) };
  }
  // With email confirmation off, signUp returns a session immediately — provision
  // the org now. With confirmation on, there's no session yet; the /auth/callback
  // route provisions after the user confirms.
  if (data.session) {
    await ensureOrgProvisioned();
  }
  return { ok: true, sessionCreated: !!data.session };
}

/**
 * Ensures the authenticated user has an organization and refreshes the Supabase
 * session so the new app_metadata.org_id claim lands in the JWT. Idempotent and
 * non-fatal — safe after any signup/login that has a session.
 */
export async function ensureOrgProvisioned(): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
  try {
    const res = await fetch(`${apiUrl}/auth/provision-org`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      // Pick up the new org_id claim before any protected API call runs.
      await supabase.auth.refreshSession();
    }
  } catch {
    // Non-fatal: the dashboard surfaces an auth error if the claim is still missing.
  }
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  const supabase = createClient();
  if (!supabase) return { ok: false, error: SUPABASE_NOT_CONFIGURED_MESSAGE };

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: siteUrl('/auth/callback?next=/reset-password'),
  });
  return error ? { ok: false, error: toMessage(error.message) } : { ok: true };
}

export async function updatePassword(password: string): Promise<AuthResult> {
  const supabase = createClient();
  if (!supabase) return { ok: false, error: SUPABASE_NOT_CONFIGURED_MESSAGE };

  const { error } = await supabase.auth.updateUser({ password });
  return error ? { ok: false, error: toMessage(error.message) } : { ok: true };
}

export async function resendVerification(email: string): Promise<AuthResult> {
  const supabase = createClient();
  if (!supabase) return { ok: false, error: SUPABASE_NOT_CONFIGURED_MESSAGE };

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: siteUrl('/auth/callback?next=/onboarding') },
  });
  return error ? { ok: false, error: toMessage(error.message) } : { ok: true };
}

export async function signOut(): Promise<AuthResult> {
  const supabase = createClient();
  if (!supabase) return { ok: false, error: SUPABASE_NOT_CONFIGURED_MESSAGE };

  const { error } = await supabase.auth.signOut();
  return error ? { ok: false, error: toMessage(error.message) } : { ok: true };
}
