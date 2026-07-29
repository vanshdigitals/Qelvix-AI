'use client';

import { useState } from 'react';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { cn } from '@/lib/utils/cn';

const GOOGLE_ENABLED =
  process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === 'true' && isSupabaseConfigured;

export interface GoogleButtonProps {
  label?: string;
  disabled?: boolean;
}

/**
 * Real Supabase OAuth. When the provider is not configured the control renders
 * disabled with an honest explanation rather than simulating a sign-in.
 */
export function GoogleButton({ label = 'Continue with Google', disabled }: GoogleButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleClick(): Promise<void> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setLoading(true);
    setError('');

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    if (oauthError) {
      setError('Could not start Google sign-in. Try email instead.');
      setLoading(false);
    }
    // On success the browser navigates to Google; no further state needed.
  }

  const unavailable = !GOOGLE_ENABLED;
  const isDisabled = (disabled ?? false) || loading || unavailable;

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          void handleClick();
        }}
        disabled={isDisabled}
        aria-describedby={unavailable ? 'google-unavailable' : undefined}
        className={cn(
          'relative flex h-10 w-full items-center justify-center gap-2.5 rounded-lg border border-border-strong bg-surface px-4 font-body text-body-sm font-semibold text-content-primary shadow-2xs transition-[border-color,background-color,box-shadow,transform] duration-150 ease-out',
          !isDisabled && 'hover:border-content-muted hover:bg-surface-inset hover:shadow-xs active:scale-[.985]',
          isDisabled && 'cursor-not-allowed opacity-60',
        )}
      >
        {loading ? (
          <span
            aria-hidden
            className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-border-strong border-t-accent"
          />
        ) : (
          <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
        )}
        <span>{loading ? 'Connecting to Google…' : label}</span>
      </button>

      {unavailable && (
        <p id="google-unavailable" className="mt-1.5 text-caption text-content-muted">
          Google sign-in is not configured yet. Use email and password.
        </p>
      )}

      {error && <p className="mt-1.5 text-caption text-critical-text">{error}</p>}
    </div>
  );
}
