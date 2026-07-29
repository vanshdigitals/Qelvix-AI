import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from '@/lib/supabase/config';

/** Server-side Supabase client bound to the request's cookie store. */
export function getSupabaseServerClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;

  const cookieStore = cookies();

  /* This call uses the modern getAll/setAll cookie API. typescript-eslint
     resolves to the deprecated get/set/remove overload (declared first in the
     .d.ts) even though only the current one structurally matches — tsc picks
     the correct signature, so the rule is suppressed for this call only. */
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component: middleware refreshes the session
          // instead, so this is safe to ignore.
        }
      },
    },
  });
}
