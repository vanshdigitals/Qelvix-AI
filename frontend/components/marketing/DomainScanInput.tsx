'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Globe, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';

import type { SurfaceFieldState } from '@/components/marketing/SurfaceField';
import { cn } from '@/lib/utils/cn';
import { isValidDomain, normaliseDomain } from '@/lib/utils/domain';

interface DomainScanInputProps {
  accessibleName: string;
  submitLabel: string;
  onFieldStateChange?: (state: SurfaceFieldState) => void;
}

export function DomainScanInput({
  accessibleName,
  submitLabel,
  onFieldStateChange,
}: DomainScanInputProps) {
  const router = useRouter();
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const reduceMotion = useReducedMotion();

  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState(false);

  const valid = isValidDomain(normaliseDomain(value));

  function report(state: SurfaceFieldState): void {
    onFieldStateChange?.(state);
  }

  function handleChange(next: string): void {
    setValue(next);
    if (error) setError(null);
    report(isValidDomain(normaliseDomain(next)) ? 'valid' : 'focus');
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (submitting) return;

    const domain = normaliseDomain(value);
    if (!isValidDomain(domain)) {
      setError('Enter a valid domain, like yourbusiness.in');
      return;
    }

    setSubmitting(true);
    report('submit');
    router.push(`/signup?domain=${encodeURIComponent(domain)}`);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="relative w-full">
      <label htmlFor={inputId} className="sr-only">
        {accessibleName}
      </label>

      <div
        className={cn(
          'flex w-full flex-col gap-2 rounded-xl border bg-surface p-1.5 shadow-sm transition-all duration-200 sm:flex-row sm:items-center sm:gap-2',
          error
            ? 'ring-critical-text/20 border-critical-text ring-1'
            : focused
              ? 'border-accent ring-2 ring-accent/15'
              : 'border-border/80 hover:border-border-strong',
        )}
      >
        <div className="flex flex-1 items-center gap-2.5 px-3 py-2 sm:py-1">
          <span
            className={cn(
              'flex shrink-0 transition-colors duration-200',
              focused || valid ? 'text-accent' : 'text-content-muted',
            )}
          >
            <Globe className="h-4 w-4" aria-hidden />
          </span>

          <input
            id={inputId}
            name="domain"
            type="text"
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            value={value}
            disabled={submitting}
            onChange={(event) => {
              handleChange(event.target.value);
            }}
            onFocus={() => {
              setFocused(true);
              report(valid ? 'valid' : 'focus');
            }}
            onBlur={() => {
              setFocused(false);
              report(valid ? 'valid' : 'rest');
            }}
            placeholder="yourbusiness.in"
            aria-invalid={error !== null}
            aria-describedby={error ? errorId : undefined}
            className="w-full min-w-0 bg-transparent text-body-md text-content-primary outline-none placeholder:text-content-muted disabled:opacity-40"
          />

          {valid && !submitting && (
            <span
              aria-hidden
              className="relative flex h-2 w-2 shrink-0 items-center justify-center"
            >
              <span className="h-2 w-2 rounded-full bg-accent" />
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="font-body flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-accent px-5 text-body-sm font-semibold text-white transition-colors duration-200 hover:bg-accent/90 disabled:opacity-40 sm:w-auto"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {submitLabel}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            id={errorId}
            role="alert"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="mt-2 text-body-sm text-critical-text"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </form>
  );
}
