/**
 * Development-only demo helpers.
 *
 * Disabled in production builds unless the deployer explicitly opts in, so demo
 * credentials never leak into a real environment. The demo account still
 * authenticates through Supabase like any other user — nothing is bypassed.
 */
export const demoHelpersEnabled =
  process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_DEMO_HELPERS === 'true';

export const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL ?? '';
export const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? '';

/** True only when a real demo account is configured. */
export const demoAccountConfigured = DEMO_EMAIL !== '' && DEMO_PASSWORD !== '';

export const DEMO_PROFILE = {
  fullName: 'Aarav Sharma',
  company: 'Acme Technologies Pvt Ltd',
} as const;
