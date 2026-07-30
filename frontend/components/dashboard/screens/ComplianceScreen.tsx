'use client';

import { AlertTriangle, Check, Info, Minus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { useToast } from '@/components/dashboard/AppShell';
import { GhostButton, Panel, PanelTitle, ScreenHeader } from '@/components/dashboard/shared';
import { DPDP_CLAUSES, type DpdpClause } from '@/lib/data/dashboard';
import { cn } from '@/lib/utils/cn';

const STATE_STYLE: Record<DpdpClause['state'], { icon: typeof Check; tag: string; ring: string }> =
  {
    Met: { icon: Check, tag: 'bg-success-bg text-success-text', ring: 'border-success-text/30' },
    Gap: { icon: AlertTriangle, tag: 'bg-high-bg text-high-text', ring: 'border-high-text/30' },
    Manual: { icon: Minus, tag: 'bg-surface-inset text-content-muted', ring: 'border-border' },
  };

export function ComplianceScreen() {
  const toast = useToast();
  const [open, setOpen] = useState<string | null>(DPDP_CLAUSES[0]?.clause ?? null);

  const met = DPDP_CLAUSES.filter((c) => c.state === 'Met').length;
  const legend = [
    { label: 'Met', count: met, color: 'bg-success-text' },
    {
      label: 'Gaps',
      count: DPDP_CLAUSES.filter((c) => c.state === 'Gap').length,
      color: 'bg-high-text',
    },
    {
      label: 'Needs evidence',
      count: DPDP_CLAUSES.filter((c) => c.state === 'Manual').length,
      color: 'bg-content-muted',
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <ScreenHeader
        title="DPDP readiness"
        caption={`Digital Personal Data Protection Act 2023 · ${String(met)} of ${String(DPDP_CLAUSES.length)} clauses met`}
        actions={
          <GhostButton
            onClick={() => {
              toast('Evidence pack export started.');
            }}
          >
            Export evidence pack
          </GhostButton>
        }
      />

      <div
        role="note"
        className="flex items-start gap-3 rounded-xl border border-border bg-surface-inset p-4 text-body-sm text-content-secondary"
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-content-muted" />
        <p>
          <span className="font-medium text-content-primary">
            This is a readiness indicator, not certification.
          </span>{' '}
          Qelvix maps what it can observe from outside your perimeter to DPDP obligations. Clauses
          needing internal policy evidence are marked as such.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-2">
          {DPDP_CLAUSES.map((c) => {
            const style = STATE_STYLE[c.state];
            const Icon = style.icon;
            const isOpen = open === c.clause;
            return (
              <div
                key={c.clause}
                className={cn(
                  'overflow-hidden rounded-2xl border bg-surface shadow-xs',
                  style.ring,
                )}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => {
                    setOpen(isOpen ? null : c.clause);
                  }}
                  className="flex w-full items-start gap-3.5 p-5 text-left"
                >
                  <span
                    className={cn(
                      'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full',
                      style.tag,
                    )}
                  >
                    <Icon className="h-3 w-3" />
                  </span>
                  <span className="flex flex-1 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-caption text-content-muted">{c.clause}</span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-caption font-medium',
                          style.tag,
                        )}
                      >
                        {c.state}
                      </span>
                    </span>
                    <span className="text-body-md font-medium text-content-primary">{c.title}</span>
                    <span className="text-body-sm leading-relaxed text-content-secondary">
                      {c.summary}
                    </span>
                  </span>
                </button>
                {isOpen && c.state !== 'Met' && (
                  <div className="flex items-center gap-3 border-t border-border/60 bg-surface-inset px-5 py-3">
                    <span className="flex-1 text-body-sm text-content-secondary">
                      {c.state === 'Gap'
                        ? 'Resolve the linked finding to close this clause.'
                        : 'Attach internal policy evidence to mark this clause satisfied.'}
                    </span>
                    <Link
                      href="/findings"
                      className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-caption font-semibold text-accent transition-colors hover:bg-surface"
                    >
                      {c.state === 'Gap' ? 'View finding' : 'Add evidence'}
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-5">
          <Panel className="flex flex-col gap-4">
            <PanelTitle>Readiness</PanelTitle>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[32px] font-medium tabular-nums leading-none text-content-primary">
                {met}
              </span>
              <span className="text-body-sm text-content-muted">
                of {DPDP_CLAUSES.length} clauses met
              </span>
            </div>
            <div className="flex gap-1">
              {DPDP_CLAUSES.map((c) => (
                <span
                  key={c.clause}
                  className={cn(
                    'h-1.5 flex-1 rounded-full',
                    c.state === 'Met'
                      ? 'bg-success-text'
                      : c.state === 'Gap'
                        ? 'bg-high-text'
                        : 'bg-content-muted',
                  )}
                />
              ))}
            </div>
            <div className="flex flex-col">
              {legend.map((l) => (
                <div
                  key={l.label}
                  className="flex items-center gap-2.5 border-t border-border/60 py-2 text-body-sm first:border-0"
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', l.color)} />
                  <span className="flex-1 text-content-secondary">{l.label}</span>
                  <span className="font-mono text-content-primary">{l.count}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="flex flex-col gap-2">
            <PanelTitle>Breach clock</PanelTitle>
            <p className="text-body-sm leading-relaxed text-content-secondary">
              DPDP requires notification to the Data Protection Board without delay. Your registered
              contact is{' '}
              <span className="font-mono text-caption text-content-primary">
                priya@vardhmanexports.in
              </span>
              .
            </p>
            <Link href="/notifications" className="text-body-sm font-medium text-accent">
              Edit notification contact
            </Link>
          </Panel>
        </div>
      </div>
    </div>
  );
}
