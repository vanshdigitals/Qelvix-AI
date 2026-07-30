'use client';

import { AlertTriangle, Check } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Panel, PanelTitle } from '@/components/dashboard/shared';
import { SCANS } from '@/lib/data/dashboard';
import { cn } from '@/lib/utils/cn';

type AgentState = 'done' | 'active' | 'pending' | 'failed';

const AGENTS: { label: string; meta: string; state: AgentState }[] = [
  { label: 'DNS enumeration', meta: '0.9s', state: 'done' },
  { label: 'TLS / certificate audit', meta: '1.4s', state: 'done' },
  { label: 'Email auth (SPF/DKIM/DMARC)', meta: '1.1s', state: 'done' },
  { label: 'HTTP security headers', meta: '2.0s', state: 'done' },
  { label: 'Port & service exposure', meta: '3.2s', state: 'done' },
  { label: 'Breach corpus lookup', meta: '1.7s', state: 'done' },
  { label: 'Subdomain takeover check', meta: 'running', state: 'active' },
  { label: 'Content & privacy crawl', meta: 'queued', state: 'pending' },
];

export function ScanDetailScreen({ id }: { id: string }) {
  const scan = SCANS.find((s) => s.id === id);
  if (!scan) notFound();

  const meta = [
    { label: 'Scan id', value: scan.id, mono: true },
    { label: 'Started', value: scan.started },
    { label: 'Trigger', value: scan.trigger },
    { label: 'Status', value: scan.status },
    { label: 'Duration', value: scan.duration },
    { label: 'Findings', value: scan.findings, mono: true },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-body-sm text-content-muted">
        <Link href="/scans" className="text-accent">
          Scans
        </Link>
        <span>/</span>
        <span className="font-mono text-caption">{scan.id}</span>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="font-display text-h1 tracking-tight text-content-primary">
          {scan.trigger} scan
        </h1>
        <span className="text-body-sm text-content-secondary">
          vardhmanexports.in · {scan.started} · {scan.status}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between gap-3">
            <PanelTitle>Agent pipeline</PanelTitle>
            <span className="font-mono text-caption text-content-muted">6 / 13</span>
          </div>
          <div role="status" aria-live="polite" className="flex flex-col">
            {AGENTS.map((a) => (
              <div
                key={a.label}
                className={cn(
                  'flex items-center gap-3 border-t border-border/60 py-2.5 first:border-0',
                  a.state === 'pending' && 'opacity-60',
                )}
              >
                <span className="grid h-3.5 w-3.5 shrink-0 place-items-center">
                  {a.state === 'done' && <Check className="h-3.5 w-3.5 text-content-secondary" />}
                  {a.state === 'active' && (
                    <span className="relative grid place-items-center">
                      <span className="absolute h-1.5 w-1.5 animate-ping rounded-full bg-accent" />
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    </span>
                  )}
                  {a.state === 'pending' && (
                    <span className="h-1.5 w-1.5 rounded-full border border-border-strong" />
                  )}
                  {a.state === 'failed' && <AlertTriangle className="h-3.5 w-3.5 text-high-text" />}
                </span>
                <span
                  className={cn(
                    'flex-1 text-body-sm',
                    a.state === 'active' ? 'text-content-primary' : 'text-content-secondary',
                  )}
                >
                  {a.label}
                </span>
                <span className="shrink-0 font-mono text-caption text-content-muted">{a.meta}</span>
              </div>
            ))}
          </div>
        </Panel>

        <div className="flex flex-col gap-5">
          <Panel>
            <PanelTitle>Run details</PanelTitle>
            <div className="mt-2 flex flex-col">
              {meta.map((m) => (
                <div
                  key={m.label}
                  className="flex items-baseline justify-between gap-3 border-t border-border/60 py-2.5 text-body-sm"
                >
                  <span className="text-content-secondary">{m.label}</span>
                  <span
                    className={`text-right font-medium text-content-primary ${m.mono ? 'font-mono text-caption' : ''}`}
                  >
                    {m.value}
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          {scan.status === 'Partial' && (
            <div
              role="alert"
              className="border-high-text/40 flex items-start gap-3 rounded-2xl border bg-high-bg p-4 text-body-sm text-content-secondary"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-high-text" />
              <p>
                <span className="font-medium text-content-primary">Partial result.</span> DNS
                analysis timed out on two subdomains after three retries. Those hosts are excluded
                from this run and retried at the next scheduled scan.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
