'use client';

import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { Panel, PanelTitle, SeverityBadge } from '@/components/dashboard/shared';
import { API_URL, type ScanReport } from '@/lib/api/client';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';

const STAGES = ['Queued', 'Running', 'Completed'] as const;

function stageIndex(status: string): number {
  if (status === 'queued') return 0;
  if (status === 'running' || status === 'pending') return 1;
  if (status === 'completed' || status === 'failed') return 2;
  return 0;
}

export function ScanDetailScreen({ id }: { id: string }) {
  const [report, setReport] = useState<ScanReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    try {
      const supabase = createClient();
      if (!supabase) return;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError('Not authenticated.');
        return;
      }
      const res = await fetch(`${API_URL}/scans/${id}/report`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setError(res.status === 404 ? 'Scan not found.' : `Request failed (${String(res.status)}).`);
        return;
      }
      setReport((await res.json()) as ScanReport);
      setError(null);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Live: poll while the scan is still running.
  useEffect(() => {
    if (!report) return undefined;
    if (!['queued', 'pending', 'running'].includes(report.status)) return undefined;
    const t = setInterval(() => void load(), 4000);
    return () => {
      clearInterval(t);
    };
  }, [report, load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-content-muted" />
      </div>
    );
  }
  if (error || !report) {
    return <p className="py-8 text-body-sm text-content-muted">{error ?? 'Scan not found.'}</p>;
  }

  const active = stageIndex(report.status);
  const failed = report.status === 'failed';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-body-sm text-content-muted">
        <Link href="/scans" className="text-accent">
          Scans
        </Link>
        <span>/</span>
        <span className="tabular-nums text-caption">{report.scan_id.slice(0, 8)}</span>
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="font-display text-h1 tracking-tight text-content-primary">
          Scan {report.scan_id.slice(0, 8)}
        </h1>
        <span className="text-body-sm capitalize text-content-secondary">
          {report.started_at ? new Date(report.started_at).toLocaleString() : 'Not started'} ·{' '}
          {report.status}
        </span>
      </div>

      {/* Status progression (real backend state) */}
      <Panel className="flex flex-col gap-4">
        <PanelTitle>Progress</PanelTitle>
        <ol className="flex items-center gap-2">
          {STAGES.map((s, i) => {
            const done = i < active || report.status === 'completed';
            const current = i === active && !failed && report.status !== 'completed';
            return (
              <li key={s} className="flex flex-1 items-center gap-2">
                <span
                  className={cn(
                    'grid h-6 w-6 shrink-0 place-items-center rounded-full text-caption',
                    failed && i === active
                      ? 'bg-critical-bg text-critical-text'
                      : done
                        ? 'bg-accent/20 text-accent'
                        : current
                          ? 'bg-accent text-white'
                          : 'border border-border text-content-muted',
                  )}
                >
                  {failed && i === active ? (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  ) : done ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : current ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    String(i + 1)
                  )}
                </span>
                <span
                  className={cn(
                    'text-body-sm',
                    current ? 'text-content-primary' : 'text-content-secondary',
                  )}
                >
                  {failed && i === active ? 'Failed' : s}
                </span>
                {i < STAGES.length - 1 && <span className="h-px flex-1 bg-border" />}
              </li>
            );
          })}
        </ol>
        {report.status === 'failed' && report.degraded_providers.length === 0 && (
          <p className="text-caption text-critical-text">The scan failed to complete.</p>
        )}
      </Panel>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-5">
          {/* Findings */}
          <Panel className="flex flex-col gap-3">
            <PanelTitle>Findings ({report.findings.length})</PanelTitle>
            {report.findings.length > 0 ? (
              report.findings.map((f) => (
                <div
                  key={f.id}
                  className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-surface-inset p-3"
                >
                  <SeverityBadge severity={f.severity} />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-body-sm font-medium text-content-primary">{f.title}</span>
                    {f.plain_explanation && (
                      <span className="text-caption text-content-secondary">
                        {f.plain_explanation.slice(0, 240)}
                      </span>
                    )}
                    <span className="tabular-nums text-caption text-content-muted">
                      {f.finding_type} · {f.agent_source}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-body-sm text-content-muted">
                {report.status === 'completed'
                  ? 'No findings — nothing exposed was flagged.'
                  : 'Findings appear as the scan runs.'}
              </p>
            )}
          </Panel>

          {/* Recommendations — derived from findings */}
          <Panel className="flex flex-col gap-3">
            <PanelTitle>Security recommendations</PanelTitle>
            {report.recommendations.length > 0 ? (
              report.recommendations.map((r) => (
                <div key={r.finding_type} className="flex items-start gap-2.5 border-t border-border/60 py-3 first:border-0">
                  <SeverityBadge severity={r.severity} />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-body-sm font-medium text-content-primary">{r.title}</span>
                    <span className="whitespace-pre-wrap text-caption text-content-secondary">
                      {r.action}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-body-sm text-content-muted">
                No recommendations yet — run a scan to generate them.
              </p>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-5">
          {/* Risk score */}
          <Panel className="flex flex-col gap-2">
            <PanelTitle>Risk score</PanelTitle>
            <div className="flex items-baseline gap-2">
              <span className="text-[40px] font-semibold leading-none tabular-nums text-content-primary">
                {report.risk_score ?? '—'}
              </span>
              {report.risk_band && (
                <span className="text-body-sm text-content-secondary">{report.risk_band}</span>
              )}
            </div>
            <div className="mt-1 flex flex-col gap-1">
              {(['critical', 'high', 'medium', 'low'] as const).map((k) => (
                <div key={k} className="flex items-center justify-between text-body-sm">
                  <span className="capitalize text-content-secondary">{k}</span>
                  <span className="tabular-nums text-content-primary">{report.summary[k]}</span>
                </div>
              ))}
            </div>
            {report.executive_summary && (
              <p className="mt-2 border-t border-border/60 pt-2 text-caption text-content-secondary">
                {report.executive_summary}
              </p>
            )}
          </Panel>

          {/* Compliance */}
          <Panel className="flex flex-col gap-2">
            <PanelTitle>DPDP compliance</PanelTitle>
            <span
              className={cn(
                'w-fit rounded-full px-2.5 py-0.5 text-caption font-medium capitalize',
                report.compliance.status === 'compliant'
                  ? 'bg-accent/15 text-accent'
                  : report.compliance.status
                    ? 'bg-high-bg text-high-text'
                    : 'bg-surface-inset text-content-muted',
              )}
            >
              {report.compliance.status ? report.compliance.status.replace('_', ' ') : 'Not assessed'}
            </span>
            {report.compliance.narrative && (
              <p className="text-caption text-content-secondary">{report.compliance.narrative}</p>
            )}
          </Panel>

          {/* Degraded providers — honest free-tier limits */}
          {report.degraded_providers.length > 0 && (
            <Panel className="flex flex-col gap-2">
              <PanelTitle>Providers unavailable</PanelTitle>
              {report.degraded_providers.map((p) => (
                <span key={p} className="text-caption text-content-muted">
                  {p}
                </span>
              ))}
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
