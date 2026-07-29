'use client';

import { Sparkles } from 'lucide-react';

import { DEMO_EMAIL, demoAccountConfigured, demoHelpersEnabled } from '@/lib/demo/helpers';

export interface QuickFillCardProps {
  label: string;
  onActivate: () => void;
  busy?: boolean;
  error?: string;
}

/** One compact demo card. Renders nothing unless demo helpers are enabled. */
export function QuickFillCard({ label, onActivate, busy = false, error }: QuickFillCardProps) {
  if (!demoHelpersEnabled) return null;

  return (
    <div className="mt-3 rounded-lg border border-border bg-surface-inset px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-3 w-3 text-accent" aria-hidden />
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-content-secondary">
          Demo mode
        </span>
      </div>

      {demoAccountConfigured ? (
        <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-[11px]">
          <dt className="text-content-muted">Email</dt>
          <dd className="truncate text-content-secondary">{DEMO_EMAIL}</dd>
          <dt className="text-content-muted">Password</dt>
          <dd className="text-content-secondary">••••••••</dd>
        </dl>
      ) : (
        <p className="mt-1.5 text-[11px] text-content-muted">
          Demo account not configured. Set NEXT_PUBLIC_DEMO_EMAIL and
          NEXT_PUBLIC_DEMO_PASSWORD.
        </p>
      )}

      <button
        type="button"
        onClick={onActivate}
        disabled={!demoAccountConfigured || busy}
        className="mt-2 flex h-7 w-full items-center justify-center gap-2 rounded-md border border-border-strong bg-surface text-[11px] font-semibold text-content-primary transition-colors duration-150 ease-out hover:border-focus hover:bg-surface-inset disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy && (
          <span
            aria-hidden
            className="h-3 w-3 animate-spin rounded-full border-2 border-border-strong border-t-accent"
          />
        )}
        {busy ? 'Preparing demo workspace…' : label}
      </button>

      {error && <p className="mt-1.5 text-[11px] text-critical-text">{error}</p>}
    </div>
  );
}
