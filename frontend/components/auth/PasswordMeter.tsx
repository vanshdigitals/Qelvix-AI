'use client';

import { useMemo } from 'react';

import { cn } from '@/lib/utils/cn';

export interface PasswordMeterProps {
  password: string;
}

export function evaluatePassword(password: string) {
  const reqs = [
    { id: 'min', label: '8+ characters', met: password.length >= 8 },
    { id: 'upper', label: 'Uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { id: 'lower', label: 'Lowercase letter (a-z)', met: /[a-z]/.test(password) },
    { id: 'number', label: 'Number (0-9)', met: /[0-9]/.test(password) },
    { id: 'special', label: 'Special character (!@#$...)', met: /[^A-Za-z0-9]/.test(password) },
  ];

  const metCount = reqs.filter((r) => r.met).length;

  let strengthLabel = '';
  let barColor = 'bg-critical-text';
  let percentage = 0;

  if (metCount > 0 && metCount <= 2) {
    strengthLabel = 'Weak';
    percentage = (metCount / 5) * 100;
  } else if (metCount === 3 || metCount === 4) {
    strengthLabel = 'Medium';
    barColor = 'bg-medium-text';
    percentage = (metCount / 5) * 100;
  } else if (metCount === 5) {
    strengthLabel = 'Strong';
    barColor = 'bg-success-text';
    percentage = 100;
  }

  return { reqs, metCount, strengthLabel, barColor, percentage };
}

/** Compact strength pill — no progress bar, no checklist wall. */
export function PasswordMeter({ password }: PasswordMeterProps) {
  const { metCount, strengthLabel } = useMemo(() => evaluatePassword(password), [password]);

  if (!password) return null;

  const tone =
    metCount === 5
      ? 'bg-success-bg text-success-text'
      : metCount >= 3
        ? 'bg-medium-bg text-medium-text'
        : 'bg-critical-bg text-critical-text';

  return (
    <div className="-mt-1 flex items-center gap-2">
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors duration-150 ease-out',
          tone,
        )}
      >
        <span aria-hidden className="h-1 w-1 rounded-full bg-current" />
        {strengthLabel}
      </span>
      <span className="text-caption text-content-muted">{metCount}/5 requirements met</span>
    </div>
  );
}
