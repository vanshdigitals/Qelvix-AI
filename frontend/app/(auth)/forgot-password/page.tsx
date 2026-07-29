'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { AuthLayout } from '@/components/auth/AuthLayout';
import { FloatingInput } from '@/components/auth/FloatingInput';
import { requestPasswordReset } from '@/lib/auth/actions';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError('');

    if (!email.includes('@')) {
      setError('Please enter a valid business email address');
      return;
    }

    setLoading(true);
    const result = await requestPasswordReset(email);

    if (!result.ok) {
      setError(result.error ?? 'Could not send the reset link. Try again.');
      setLoading(false);
      return;
    }

    router.push(`/check-email?type=reset&email=${encodeURIComponent(email)}`);
  }

  return (
    <AuthLayout>
      <div className="flex flex-col">
        <Link
          href="/login"
          className="mb-6 inline-flex items-center gap-1.5 text-caption font-semibold text-content-secondary transition-colors hover:text-content-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to log in</span>
        </Link>

        <div>
          <h1 className="font-display text-h2 font-bold tracking-tight text-content-primary">
            Reset your password
          </h1>
          <p className="mt-1.5 text-body-sm text-content-secondary">
            Enter the business email associated with your Qelvix account and we&rsquo;ll send you a recovery link.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="mt-6 flex flex-col gap-4"
        >
          <FloatingInput
            label="Business Email"
            type="email"
            name="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
            }}
            error={error}
            autoComplete="email"
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex h-11 w-full items-center justify-center rounded-lg bg-accent px-4 font-body text-body-sm font-semibold text-white shadow-2xs transition-[background-color,transform] duration-150 ease-out hover:bg-accent/90 active:scale-[.985] disabled:opacity-60 disabled:active:scale-100"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                <span>Sending link...</span>
              </span>
            ) : (
              'Send Password Reset Link'
            )}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}
