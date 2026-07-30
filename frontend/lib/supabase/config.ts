/**
 * Supabase environment configuration.
 *
 * Only NEXT_PUBLIC_* values live here — nothing secret is ever given that
 * prefix (06 §3). The service key is backend-only and never reaches this file.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * True only when both values are present. The UI uses this to disable auth
 * actions with an honest message rather than failing at request time.
 */
export const isSupabaseConfigured = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

export const SUPABASE_NOT_CONFIGURED_MESSAGE =
  'Authentication is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in frontend/.env.local.';

/** Routes that require an authenticated session. */
export const PROTECTED_PREFIXES = [
  '/dashboard',
  '/findings',
  '/scans',
  '/assets',
  '/compliance',
  '/reports',
  '/notifications',
  '/settings',
  '/team',
  '/billing',
  '/audit',
  '/profile',
  '/onboarding',
] as const;

/** Auth screens an already-authenticated user should not sit on. */
export const AUTH_ROUTES = ['/login', '/signup', '/forgot-password'] as const;

/**
 * Where a user lands after authenticating.
 */
export const POST_LOGIN_ROUTE = '/dashboard';
