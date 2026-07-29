'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type FormEvent } from 'react';

import { AuthLayout } from '@/components/auth/AuthLayout';
import { FloatingInput } from '@/components/auth/FloatingInput';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { PasswordMeter, evaluatePassword } from '@/components/auth/PasswordMeter';
import { signUpWithPassword } from '@/lib/auth/actions';
import { isSupabaseConfigured } from '@/lib/supabase/config';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const domain = searchParams.get('domain');
    if (domain && !email) {
      if (domain.includes('@')) {
        setEmail(domain);
      } else {
        setEmail(`security@${domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '')}`);
      }
    }
  }, [searchParams, email]);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError('');

    if (!fullName) {
      setError('Please enter your full name');
      return;
    }
    if (!companyName) {
      setError('Please enter your business or organization name');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid business email address');
      return;
    }

    const { metCount } = evaluatePassword(password);
    if (metCount < 5) {
      setError('Please fulfill all password requirements below');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!termsAgreed) {
      setError('You must accept the Terms of Service and Privacy Policy');
      return;
    }

    setLoading(true);
    try {
      localStorage.removeItem('qelvix_onboarding_completed');
      document.cookie = 'qelvix_onboarding_completed=; path=/; max-age=0';
    } catch {
      // ignore storage errors
    }

    const result = await signUpWithPassword(email, password, { fullName, companyName });

    if (!result.ok) {
      setError(result.error ?? 'Could not create your account. Try again.');
      setLoading(false);
      return;
    }

    if (result.sessionCreated) {
      router.push('/onboarding');
    } else {
      router.push(`/check-email?email=${encodeURIComponent(email)}`);
    }
  }

  return (
    <div className="flex flex-col">
      {!isSupabaseConfigured && (
        <p className="mb-4 rounded-lg border border-medium-text bg-medium-bg px-3 py-2 text-caption text-medium-text">
          Authentication is not configured yet. Add your Supabase keys to
          <code className="mx-1 font-mono">frontend/.env.local</code>to enable sign-up.
        </p>
      )}
      <div className="mb-6">
        <h1 className="font-display text-h2 font-bold tracking-tight text-content-primary">
          Start your free scan
        </h1>
        <p className="mt-2 text-body-sm text-content-secondary">
          No credit card required. Scans ready in under 60 seconds.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="mt-3 flex flex-col gap-2"
      >
        <FloatingInput
          label="Full Name"
          type="text"
          name="fullName"
          value={fullName}
          onChange={(e) => {
            setFullName(e.target.value);
          }}
          placeholder="Aarav Sharma"
          valid={fullName.trim().length > 2}
          autoComplete="name"
          autoFocus
        />

        <FloatingInput
          label="Business / Organization Name"
          type="text"
          name="companyName"
          value={companyName}
          onChange={(e) => {
            setCompanyName(e.target.value);
          }}
          placeholder="Acme Technologies Pvt Ltd"
          valid={companyName.trim().length > 1}
          autoComplete="organization"
        />

        <FloatingInput
          label="Business Email"
          type="email"
          name="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
          }}
          placeholder="name@company.in"
          valid={/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)}
          autoComplete="email"
        />

        <FloatingInput
          label="Password"
          type="password"
          name="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
          }}
          placeholder="Minimum 8 characters"
          autoComplete="new-password"
        />

        <PasswordMeter password={password} />

        <FloatingInput
          label="Confirm Password"
          type="password"
          name="confirmPassword"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
          }}
          error={confirmPassword && password !== confirmPassword ? 'Passwords do not match' : undefined}
          autoComplete="new-password"
        />

        <label className="mt-1 flex items-start gap-2.5 cursor-pointer text-caption text-content-secondary">
          <input
            type="checkbox"
            checked={termsAgreed}
            onChange={(e) => {
              setTermsAgreed(e.target.checked);
            }}
            className="mt-0.5 h-4 w-4 rounded border-border/80 text-accent focus:ring-accent"
          />
          <span>
            I agree to the{' '}
            <Link href="/legal/terms" className="font-medium text-accent hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/legal/privacy" className="font-medium text-accent hover:underline">
              Privacy Policy
            </Link>.
          </span>
        </label>

        {error && (
          <p className="mt-1 text-caption text-critical-text flex items-center gap-1">
            <span aria-hidden>⚠</span> {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-1 flex h-10 w-full items-center justify-center rounded-lg bg-accent px-4 font-body text-body-sm font-semibold text-white shadow-2xs transition-[background-color,transform] duration-150 ease-out hover:bg-accent/90 active:scale-[.985] disabled:opacity-60 disabled:active:scale-100"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              <span>Creating Account...</span>
            </span>
          ) : (
            'Create Free Account'
          )}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-border/60" />
        <span className="text-caption uppercase tracking-[0.06em] text-content-muted">
          Or sign up with
        </span>
        <div className="h-px flex-1 bg-border/60" />
      </div>

      <GoogleButton label="Sign up with Google" />

      <p className="mt-4 text-center text-body-sm text-content-secondary">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-semibold text-accent hover:underline underline-offset-2"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-surface-inset" />}>
        <SignupForm />
      </Suspense>
    </AuthLayout>
  );
}
