'use client';

import { ArrowLeft, Mail } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { AuthLayout } from '@/components/auth/AuthLayout';
import { resendVerification } from '@/lib/auth/actions';

function CheckEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? 'your business email';
  const isReset = searchParams.get('type') === 'reset';

  const [resendCountdown, setResendCountdown] = useState(60);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => prev - 1);
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, [resendCountdown]);

  function handleResend(): void {
    if (resendCountdown > 0) return;
    if (email.includes('@')) {
      void resendVerification(email);
    }
    setResent(true);
    setResendCountdown(60);
  }

  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 text-accent">
        <Mail className="h-7 w-7" />
      </div>

      <h1 className="mt-5 font-display text-h2 font-bold tracking-tight text-content-primary">
        Check your email
      </h1>

      <p className="mt-2 max-w-[36ch] text-body-sm leading-relaxed text-content-secondary">
        {isReset
          ? `We sent a password recovery link to ${email}`
          : `We sent a confirmation link to ${email}. Click the link inside to activate your workspace.`}
      </p>

      <div className="mt-8 w-full rounded-xl border border-border/80 bg-surface-inset p-4">
        <p className="text-caption text-content-secondary">
          Didn&rsquo;t receive the email? Check your spam folder or resend below.
        </p>

        <button
          type="button"
          onClick={handleResend}
          disabled={resendCountdown > 0}
          className="font-body mt-3 inline-flex h-9 items-center justify-center rounded-lg border border-border/80 bg-surface px-4 text-caption font-semibold text-content-primary transition-all hover:bg-surface-raised disabled:opacity-60"
        >
          {resendCountdown > 0
            ? `Resend email in ${resendCountdown.toString()}s`
            : resent
              ? 'Sent! Resend again'
              : 'Resend email link'}
        </button>
      </div>

      <Link
        href="/login"
        className="mt-8 inline-flex items-center gap-1.5 text-caption font-semibold text-content-secondary transition-colors hover:text-content-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to log in</span>
      </Link>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-surface-inset" />}>
        <CheckEmailContent />
      </Suspense>
    </AuthLayout>
  );
}
