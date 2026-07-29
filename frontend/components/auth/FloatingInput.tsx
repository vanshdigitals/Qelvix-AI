'use client';

import { Check, Eye, EyeOff } from 'lucide-react';
import { forwardRef, useState, type InputHTMLAttributes } from 'react';

import { cn } from '@/lib/utils/cn';

export interface FloatingInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  success?: string;
  helperText?: string;
  /** Optional right-aligned link beside the label (e.g. "Forgot password?"). */
  aside?: React.ReactNode;
  /** Shows a subtle check when the field passes validation. */
  valid?: boolean;
}

/**
 * Top-label auth input matching the frozen design: 13px label, 44px field,
 * 12px radius, reserved 16px message row, password reveal toggle. Same props
 * as before, so pages need no changes.
 */
export const FloatingInput = forwardRef<HTMLInputElement, FloatingInputProps>(
  (
    { label, id, name, type = 'text', error, success, helperText, aside, valid, className, disabled, value, onChange, ...props },
    ref,
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPasswordType = type === 'password';
    const activeType = isPasswordType ? (showPassword ? 'text' : 'password') : type;
    const inputId = id ?? name ?? label.toLowerCase().replace(/\s+/g, '-');
    const msgId = `${inputId}-msg`;

    return (
      <div className="flex w-full flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={inputId} className="text-label font-medium text-content-secondary">
            {label}
          </label>
          {aside}
        </div>

        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            name={name}
            type={activeType}
            disabled={disabled}
            value={value}
            onChange={onChange}
            aria-invalid={error ? true : undefined}
            aria-describedby={msgId}
            className={cn(
              'h-10 w-full rounded-lg border bg-surface px-3.5 font-body text-body-sm text-content-primary outline-none transition-[border-color,box-shadow] duration-150 ease-out',
              'placeholder:text-content-muted',
              'focus:border-focus focus:ring-2 focus:ring-focus/25',
              error
                ? 'border-critical-text focus:border-critical-text focus:ring-critical-text/25'
                : success
                  ? 'border-success-text focus:border-success-text focus:ring-success-text/25'
                  : 'border-border-strong hover:border-content-muted',
              'disabled:cursor-not-allowed disabled:opacity-40',
              (isPasswordType || (valid && !error)) && 'pr-10',
              className,
            )}
            {...props}
          />

          {valid && !error && !isPasswordType && (
            <span
              aria-hidden
              className="pointer-events-none absolute right-0 top-0 grid h-10 w-10 place-items-center text-success-text"
            >
              <Check className="h-4 w-4" />
            </span>
          )}

          {isPasswordType && (
            <button
              type="button"
              onClick={() => {
                setShowPassword((prev) => !prev);
              }}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              className="absolute right-0 top-0 grid h-10 w-10 place-items-center rounded-r-lg text-content-muted transition-colors duration-150 hover:text-content-primary"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden />
              ) : (
                <Eye className="h-4 w-4" aria-hidden />
              )}
            </button>
          )}
        </div>

        {/* Only occupies space when there is something to announce. */}
        <div id={msgId} aria-live="polite">
          {error ? (
            <p className="text-caption text-critical-text">{error}</p>
          ) : success ? (
            <p className="text-caption text-success-text">{success}</p>
          ) : helperText ? (
            <p className="text-caption text-content-muted">{helperText}</p>
          ) : null}
        </div>
      </div>
    );
  },
);

FloatingInput.displayName = 'FloatingInput';
