'use client';

import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { AuthLayout } from '@/components/auth/AuthLayout';

function SuccessContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type');

  let title = 'Authentication Successful';
  let description = 'Welcome back to your Qelvix enterprise security workspace.';

  if (type === 'verified') {
    title = 'Account Email Verified!';
    description =
      'Your organization workspace is fully configured and ready for automated scanning.';
  } else if (type === 'reset') {
    title = 'Password Reset Complete';
    description = 'Your new password has been updated securely. You may now access your dashboard.';
  } else if (type === 'login') {
    title = 'Welcome Back';
    description = 'You have authenticated successfully. Accessing enterprise intelligence...';
  }

  return (
    <div className="flex flex-col items-center text-center">
      <div className="border-success-text/30 flex h-16 w-16 items-center justify-center rounded-2xl border bg-success-bg text-success-text shadow-2xs">
        <CheckCircle2 className="h-9 w-9" />
      </div>

      <h1 className="mt-6 font-display text-h2 font-bold tracking-tight text-content-primary">
        {title}
      </h1>

      <p className="mt-2 max-w-[34ch] text-body-sm leading-relaxed text-content-secondary">
        {description}
      </p>

      <div className="mt-8 w-full">
        <Link
          href="/dashboard"
          className="font-body flex h-11 w-full items-center justify-center rounded-lg bg-accent px-4 text-body-sm font-semibold text-[#0B0E16] shadow-2xs transition-colors duration-200 hover:bg-accent/90"
        >
          Continue to Dashboard →
        </Link>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-surface-inset" />}>
        <SuccessContent />
      </Suspense>
    </AuthLayout>
  );
}
