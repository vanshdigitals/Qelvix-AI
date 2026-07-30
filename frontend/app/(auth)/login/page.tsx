'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';

import { AuthLayout } from '@/components/auth/AuthLayout';
import { FloatingInput } from '@/components/auth/FloatingInput';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { DemoHelperCard } from '@/components/auth/DemoHelperCard';
import { signInWithPassword } from '@/lib/auth/actions';
import { POST_LOGIN_ROUTE, isSupabaseConfigured } from '@/lib/supabase/config';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your business email');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    const result = await signInWithPassword(email, password);

    if (!result.ok) {
      setError(result.error ?? 'Could not sign you in. Try again.');
      setLoading(false);
      return;
    }

    // Full navigation so middleware re-reads the new session cookie.
    let redirectTo = searchParams.get('redirectTo') ?? POST_LOGIN_ROUTE;
    if (redirectTo === '/login' || redirectTo === '/signup' || redirectTo === '/success') {
      redirectTo = POST_LOGIN_ROUTE;
    }
    router.replace(redirectTo);
    router.refresh();
  }

  return (
    <div className="flex flex-col">
      {!isSupabaseConfigured && (
        <p className="mb-4 rounded-lg border border-medium-text bg-medium-bg px-3 py-2 text-caption text-medium-text">
          Authentication is not configured yet. Add your Supabase keys to
          <code className="mx-1 font-mono">frontend/.env.local</code>to enable sign-in.
        </p>
      )}
      <div className="mb-6">
        <h1 className="font-display text-h2 font-bold tracking-tight text-content-primary">
          Welcome back
        </h1>
        <p className="mt-2 text-body-sm text-content-secondary">
          Log in to monitor your security footprint
        </p>
        <DemoHelperCard
          email="demo@qelvix.com"
          onFill={() => {
            setEmail('demo@qelvix.com');
            setPassword('DemoQelvix2026!');
          }}
        />
      </div>
      {/* Form Container */}
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="mt-5 flex flex-col gap-3"
      >
        <FloatingInput
          label="Business Email"
          type="email"
          name="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
          }}
          error={error && !email ? error : undefined}
          valid={/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)}
          placeholder="name@company.in"
          autoComplete="email"
          autoFocus
        />

        <FloatingInput
          label="Password"
          type="password"
          name="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
          }}
          error={error && email && !password ? error : undefined}
          placeholder="Minimum 8 characters"
          autoComplete="current-password"
        />

        {/* Remember me & Forgot password row */}
        <div className="flex items-center justify-between text-caption">
          <label className="flex cursor-pointer items-center gap-2 text-content-secondary hover:text-content-primary">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => {
                setRememberMe(e.target.checked);
              }}
              className="h-4 w-4 rounded border-border/80 text-accent focus:ring-accent"
            />
            <span>Remember me for 30 days</span>
          </label>

          <Link
            href="/forgot-password"
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        {/* Main Error Alert line if any */}
        {error && email && password && (
          <p className="flex items-center gap-1 text-caption text-critical-text">
            <span aria-hidden>⚠</span> {error}
          </p>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="font-body mt-1 flex h-10 w-full items-center justify-center rounded-lg bg-accent px-4 text-body-sm font-semibold text-[#0B0E16] shadow-2xs transition-[background-color,transform] duration-150 ease-out hover:bg-accent/90 active:scale-[.985] disabled:opacity-60 disabled:active:scale-100"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0B0E16]/30 border-t-[#0B0E16]" />
              <span>Signing in...</span>
            </span>
          ) : (
            'Log in'
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-border/60" />
        <span className="text-caption uppercase tracking-[0.06em] text-content-muted">
          Or continue with
        </span>
        <div className="h-px flex-1 bg-border/60" />
      </div>

      {/* Google OAuth Button */}
      <GoogleButton label="Continue with Google" />

      {/* Sign up prompt footer */}
      <p className="mt-5 text-center text-body-sm text-content-secondary">
        Don&rsquo;t have an account?{' '}
        <Link
          href="/signup"
          className="font-semibold text-accent underline-offset-2 hover:underline"
        >
          Create account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-surface-inset" />}>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
