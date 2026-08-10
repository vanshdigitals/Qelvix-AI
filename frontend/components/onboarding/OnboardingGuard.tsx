'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { getOnboarding, OnboardingError } from '@/lib/api/onboarding';

const CACHE_KEY = 'qelvix_onboarded';

/**
 * Client gate for the (app) group: no dashboard access until the backend says
 * onboarding_completed. The backend enforces the same rule (403), so this is UX.
 *
 * Hydration-safe: the initial render is ALWAYS 'checking' on both server and
 * client (no browser-only reads during render). The session cache is read inside
 * the effect (client-only), so server and client initial markup match exactly.
 */
export function OnboardingGuard({ children }: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'allowed'>('checking');

  useEffect(() => {
    let active = true;
    // Fast path (post-mount, so no hydration mismatch): a completed check earlier
    // in this tab lets us reveal the app immediately while we revalidate.
    if (sessionStorage.getItem(CACHE_KEY) === 'true') setStatus('allowed');

    async function check(): Promise<void> {
      try {
        const state = await getOnboarding();
        if (!active) return;
        if (state.onboarding_completed) {
          sessionStorage.setItem(CACHE_KEY, 'true');
          setStatus('allowed');
        } else {
          sessionStorage.removeItem(CACHE_KEY);
          router.replace('/onboarding');
        }
      } catch (e) {
        if (!active) return;
        if (
          e instanceof OnboardingError &&
          (e.status === 401 || e.status === 403 || e.status === 404)
        ) {
          sessionStorage.removeItem(CACHE_KEY);
          router.replace('/onboarding');
        } else {
          // Transient/backend error: backend still gates data (403); don't hard-lock.
          setStatus('allowed');
        }
      }
    }
    void check();
    return () => {
      active = false;
    };
  }, [router]);

  if (status === 'checking') {
    // Content-area loader only — the shell around it (rendered by AppShell) stays
    // visible, so the app never appears fully frozen.
    return (
      <div className="flex items-center justify-center py-24">
        <span className="text-body-sm text-content-muted">Loading…</span>
      </div>
    );
  }
  return <>{children}</>;
}
