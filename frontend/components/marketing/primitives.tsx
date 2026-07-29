import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

/**
 * Shared compositional primitives for the marketing surfaces. Server
 * components, CSS-only — no animation. These establish the premium visual
 * language: structured backgrounds, eyebrow pills, section kickers, hairline
 * dividers, and light bands.
 */

/* -------------------------------------------------------------------------- */
/* GridBackdrop — structured background lighting                              */
/* -------------------------------------------------------------------------- */

interface GridBackdropProps {
  /** 'dots' is quieter; 'lines' reads more technical. */
  pattern?: 'dots' | 'lines';
  /** Where the horizon glow is anchored. */
  glow?: 'top' | 'center' | 'bottom' | 'none';
  className?: string;
}

export function GridBackdrop({ pattern = 'dots', glow = 'top', className }: GridBackdropProps) {
  const grid =
    pattern === 'dots'
      ? {
          backgroundImage: 'radial-gradient(var(--color-border-default) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }
      : {
          backgroundImage:
            'linear-gradient(var(--color-border-default) 1px, transparent 1px), linear-gradient(90deg, var(--color-border-default) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        };

  const glowPosition =
    glow === 'top'
      ? '50% -10%'
      : glow === 'center'
        ? '50% 40%'
        : glow === 'bottom'
          ? '50% 110%'
          : null;

  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      <div
        className="absolute inset-0 opacity-60"
        style={{
          ...grid,
          maskImage: 'radial-gradient(120% 80% at 50% 0%, black 20%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(120% 80% at 50% 0%, black 20%, transparent 75%)',
        }}
      />
      {glowPosition && (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(60% 50% at ${glowPosition}, rgb(var(--color-accent-primary-rgb) / 0.10), transparent 70%)`,
          }}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Eyebrow — bordered pill with a signal dot                                  */
/* -------------------------------------------------------------------------- */

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1.5 rounded-full border border-border/80 bg-surface/90 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-content-secondary shadow-2xs backdrop-blur-sm',
        className,
      )}
    >
      <span aria-hidden className="relative flex h-1 w-1 shrink-0">
        <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-40" />
        <span className="relative inline-flex h-1 w-1 rounded-full bg-accent" />
      </span>
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* SectionHeader — kicker number + eyebrow + heading, one composition         */
/* -------------------------------------------------------------------------- */

interface SectionHeaderProps {
  eyebrow?: string;
  heading: ReactNode;
  headingId?: string;
  lede?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
  headingClassName?: string;
}

export function SectionHeader({
  eyebrow,
  heading,
  headingId,
  lede,
  align = 'left',
  className,
  headingClassName,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-5',
        align === 'center' && 'items-center text-center',
        className,
      )}
    >
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2
        id={headingId}
        className={cn(
          'font-display text-h2 tracking-tight text-content-primary md:text-display-lg',
          align === 'center' ? 'max-w-[20ch]' : 'max-w-[16ch]',
          headingClassName,
        )}
      >
        {heading}
      </h2>
      {lede && (
        <p
          className={cn(
            'text-body-lg text-content-secondary',
            align === 'center' ? 'max-w-measure-centered' : 'max-w-measure',
          )}
        >
          {lede}
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Hairline — gradient divider that fades at both ends                        */
/* -------------------------------------------------------------------------- */

export function Hairline({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('h-px w-full', className)}
      style={{
        background:
          'linear-gradient(90deg, transparent, var(--color-border-default) 20%, var(--color-border-default) 80%, transparent)',
      }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* WindowChrome — macOS-style frame for the product stage                     */
/* -------------------------------------------------------------------------- */

export function WindowChrome({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-border bg-surface-inset px-4 py-3">
      <div className="flex items-center gap-1.5" aria-hidden>
        <span className="h-3 w-3 rounded-full bg-critical-text" />
        <span className="h-3 w-3 rounded-full bg-medium-text" />
        <span className="h-3 w-3 rounded-full bg-success-text" />
      </div>
      <div className="flex min-w-0 flex-1 justify-center">
        <span className="inline-flex max-w-full items-center gap-2 truncate rounded-md border border-border bg-surface px-3 py-1 font-mono text-mono-data text-content-secondary">
          {label}
        </span>
      </div>
      <div aria-hidden className="w-14" />
    </div>
  );
}
