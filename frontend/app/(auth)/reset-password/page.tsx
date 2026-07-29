'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { AuthLayout } from '@/components/auth/AuthLayout';
import { FloatingInput } from '@/components/auth/FloatingInput';
import { PasswordMeter, evaluatePassword } from '@/components/auth/PasswordMeter';
import { updatePassword } from '@/lib/auth/actions';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError('');

    const { metCount } = evaluatePassword(password);
    if (metCount < 5) {
      setError('Please fulfill all password requirements below');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    // The recovery link puts a session in place; updateUser applies the change.
    const result = await updatePassword(password);

    if (!result.ok) {
      setError(
        result.error ??
          'Could not reset your password. Request a fresh link and try again.',
      );
      setLoading(false);
      return;
    }

    router.push('/success?type=reset');
  }

  return (
    <AuthLayout>
      <div className="flex flex-col">
        <div>
          <h1 className="font-display text-h2 font-bold tracking-tight text-content-primary">
            Set new password
          </h1>
          <p className="mt-1.5 text-body-sm text-content-secondary">
            Your new password must fulfill enterprise security requirements below.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="mt-6 flex flex-col gap-4"
        >
          <FloatingInput
            label="New Password"
            type="password"
            name="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
            }}
            autoComplete="new-password"
          />

          <PasswordMeter password={password} />

          <FloatingInput
            label="Confirm New Password"
            type="password"
            name="confirmPassword"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
            }}
            error={confirmPassword && password !== confirmPassword ? 'Passwords do not match' : undefined}
            autoComplete="new-password"
          />

          {error && (
            <p className="text-caption text-critical-text flex items-center gap-1">
              <span aria-hidden>⚠</span> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex h-11 w-full items-center justify-center rounded-lg bg-accent px-4 font-body text-body-sm font-semibold text-white shadow-2xs transition-[background-color,transform] duration-150 ease-out hover:bg-accent/90 active:scale-[.985] disabled:opacity-60 disabled:active:scale-100"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                <span>Resetting password...</span>
              </span>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}
