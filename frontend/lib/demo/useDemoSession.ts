'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { signInWithPassword } from '@/lib/auth/actions';
import { DEMO_EMAIL, DEMO_PASSWORD, demoAccountConfigured } from '@/lib/demo/helpers';
import { POST_LOGIN_ROUTE } from '@/lib/supabase/config';

/**
 * Signs into the configured demo account using the ordinary Supabase password
 * flow — no bypass, no weakened checks. Only the ergonomics are shortcut.
 */
export function useDemoSession() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const start = useCallback(async (): Promise<void> => {
    if (!demoAccountConfigured || busy) return;

    setBusy(true);
    setError('');

    const result = await signInWithPassword(DEMO_EMAIL, DEMO_PASSWORD);

    if (!result.ok) {
      setError(result.error ?? 'Demo sign-in failed.');
      setBusy(false);
      return;
    }

    router.replace(POST_LOGIN_ROUTE);
    router.refresh();
  }, [busy, router]);

  return { start, busy, error, available: demoAccountConfigured };
}
