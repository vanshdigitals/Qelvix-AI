'use client';

import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';

import { Panel, PanelTitle } from '@/components/dashboard/shared';
import { type ApiScan, useApi } from '@/lib/api/client';
import { cn } from '@/lib/utils/cn';

function findingCount(fs: Record<string, unknown> | null): string {
  if (!fs) return '0';
  const total = Object.values(fs)
    .filter((v): v is number => typeof v === 'number')
    .reduce((a, b) => a + b, 0);
  return String(total);
}

export function ScanDetailScreen({ id }: { id: string }) {
  const { data: scan, loading, error } = useApi<ApiScan>(`/scans/${id}`);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-content-muted" />
      </div>
    );
  }

  if (error || !scan) {
    return (
      <div className="flex flex-col gap-5">
        <p className="text-body-sm text-content-muted">{error ?? 'Scan not found.'}</p>
      </div>
    );
  }

  const durationStr = scan.completed_at 
    ? `${((new Date(scan.completed_at).getTime() - new Date(scan.started_at).getTime()) / 1000).toFixed(1)}s` 
    : '—';

  const meta = [
    { label: 'Scan id', value: scan.id.slice(0, 8), mono: true },
    { label: 'Started', value: new Date(scan.started_at).toLocaleString() },
    { label: 'Status', value: scan.status, capitalize: true },
    { label: 'Duration', value: durationStr },
    { label: 'Findings', value: findingCount(scan.finding_summary), mono: true },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-body-sm text-content-muted">
        <Link href="/scans" className="text-accent">
          Scans
        </Link>
        <span>/</span>
        <span className="font-mono text-caption">{scan.id.slice(0, 8)}</span>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="font-display text-h1 tracking-tight text-content-primary">
          Scan {scan.id.slice(0, 8)}
        </h1>
        <span className="text-body-sm text-content-secondary capitalize">
          {new Date(scan.started_at).toLocaleString()} · {scan.status}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between gap-3">
            <PanelTitle>Agent pipeline</PanelTitle>
          </div>
          <div role="status" aria-live="polite" className="flex flex-col">
              <div className="flex items-center gap-3 border-t border-border/60 py-2.5 first:border-0">
                <span className="grid h-3.5 w-3.5 shrink-0 place-items-center">
                  {scan.status === 'completed' && <Check className="h-3.5 w-3.5 text-content-secondary" />}
                  {(scan.status === 'running' || scan.status === 'pending') && (
                    <span className="relative grid place-items-center">
                      <span className="absolute h-1.5 w-1.5 animate-ping rounded-full bg-accent" />
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    </span>
                  )}
                  {scan.status === 'failed' && <AlertTriangle className="h-3.5 w-3.5 text-high-text" />}
                </span>
                <span
                  className={cn(
                    'flex-1 text-body-sm capitalize',
                    (scan.status === 'running' || scan.status === 'pending') ? 'text-content-primary' : 'text-content-secondary',
                  )}
                >
                  {scan.status === 'failed' ? 'Scan Failed' : scan.status === 'completed' ? 'Scan Completed' : 'Scan in progress'}
                </span>
              </div>
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
                    className={cn(
                        "text-right font-medium text-content-primary", 
                        m.mono && 'font-mono text-caption',
                        m.capitalize && 'capitalize'
                    )}
                  >
                    {m.value}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
          {scan.error_log && Object.keys(scan.error_log).length > 0 && (
            <div
              role="alert"
              className="border-high-text/40 flex items-start gap-3 rounded-2xl border bg-high-bg p-4 text-body-sm text-content-secondary"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-high-text" />
              <p>
                <span className="font-medium text-content-primary">Scan Error.</span> 
                There were errors during the scan execution. Check logs.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
