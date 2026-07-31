'use client';

import { CheckCircle2, ShieldAlert, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { AuthLayout } from '@/components/auth/AuthLayout';
import { useAuth } from '@/components/providers/AuthProvider';

/**
 * Landing point after the emailed confirmation link. /auth/callback has already
 * exchanged the code for a session, so state is read from the session rather
 * than simulated.
 */
export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const verified = !loading && user !== null;

  return (
    <AuthLayout>
      <div className="flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 text-accent">
          {loading ? (
            <ShieldCheck className="h-7 w-7" />
          ) : verified ? (
            <CheckCircle2 className="h-7 w-7 text-success-text" />
          ) : (
            <ShieldAlert className="h-7 w-7 text-medium-text" />
          )}
        </div>

        <h1 className="mt-5 font-display text-h2 font-bold tracking-tight text-content-primary">
          {loading ? 'Checking your link' : verified ? 'Email verified' : 'Link not valid'}
        </h1>

        <p className="mt-2 max-w-[34ch] text-body-sm leading-relaxed text-content-secondary">
          {loading
            ? 'Confirming your verification link.'
            : verified
              ? 'Your email address is confirmed and your account is active.'
              : 'This verification link is invalid or has expired. Request a new one from the login screen.'}
        </p>

        {loading && (
          <div className="mt-8 flex items-center gap-2 font-mono text-caption text-content-muted">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-content-muted border-t-accent" />
            <span>Verifying...</span>
          </div>
        )}

        {!loading &&
          (verified ? (
            <button
              type="button"
              onClick={() => {
                router.push('/onboarding');
              }}
              className="font-body mt-6 flex h-11 w-full items-center justify-center rounded-lg bg-accent px-4 text-body-sm font-semibold text-white shadow-2xs transition-all duration-200 hover:shadow-xs"
            >
              Continue
            </button>
          ) : (
            <Link
              href="/login"
              className="font-body mt-6 flex h-11 w-full items-center justify-center rounded-lg border border-border-strong px-4 text-body-sm font-semibold text-content-primary transition-colors duration-200 hover:bg-surface-inset"
            >
              Back to log in
            </Link>
          ))}
      </div>
    </AuthLayout>
  );
}
