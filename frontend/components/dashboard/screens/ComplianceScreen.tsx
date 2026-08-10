'use client';

import { Info, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { Panel, PanelTitle, ScreenHeader } from '@/components/dashboard/shared';
import { API_URL, type ApiScan, type ScanReport } from '@/lib/api/client';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';

export function ComplianceScreen() {
  const [report, setReport] = useState<ScanReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    try {
      const supabase = createClient();
      if (!supabase) {
        setError('Backend not configured.');
        return;
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError('Not authenticated.');
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      const scansRes = await fetch(`${API_URL}/scans?limit=20`, { headers });
      if (!scansRes.ok) {
        setError(`Request failed (${String(scansRes.status)}).`);
        return;
      }
      const items = ((await scansRes.json()) as { items?: ApiScan[] }).items ?? [];
      const done = items.find((s) => s.status === 'completed');
      if (!done) {
        setReport(null);
        setError(null);
        return;
      }
      const rr = await fetch(`${API_URL}/scans/${done.id}/report`, { headers });
      if (!rr.ok) {
        setError(`Request failed (${String(rr.status)}).`);
        return;
      }
      setReport((await rr.json()) as ScanReport);
      setError(null);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-content-muted" />
      </div>
    );
  }

  const compliance = report?.compliance;
  const status = compliance?.status ?? null;

  return (
    <div className="flex flex-col gap-5">
      <ScreenHeader title="DPDP readiness" caption="Digital Personal Data Protection Act 2023" />

      <div
        role="note"
        className="flex items-start gap-3 rounded-xl border border-border bg-surface-inset p-4 text-body-sm text-content-secondary"
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-content-muted" />
        <p>
          <span className="font-medium text-content-primary">
            This is a readiness indicator, not certification.
          </span>{' '}
          Derived from externally observable signals in your latest completed scan.
        </p>
      </div>

      {error ? (
        <Panel>
          <PanelTitle>Couldn&apos;t load compliance</PanelTitle>
          <p className="mt-2 text-body-sm text-content-secondary">{error}</p>
        </Panel>
      ) : !report ? (
        <Panel>
          <PanelTitle>No assessment yet</PanelTitle>
          <p className="mt-2 text-body-sm text-content-secondary">
            Run a scan to generate a DPDP readiness assessment from real findings.
          </p>
        </Panel>
      ) : (
        <div className="flex flex-col gap-5">
          <Panel className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <PanelTitle>DPDP readiness</PanelTitle>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-caption font-medium capitalize',
                  status === 'compliant'
                    ? 'bg-success-bg text-success-text'
                    : status
                      ? 'bg-high-bg text-high-text'
                      : 'bg-surface-inset text-content-muted',
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    status === 'compliant'
                      ? 'bg-success-text'
                      : status
                        ? 'bg-high-text'
                        : 'bg-content-muted',
                  )}
                />
                {status ? status.replace('_', ' ') : 'Not assessed'}
              </span>
            </div>
            <p className="text-caption text-content-muted">
              From scan{' '}
              <Link href={`/scans/${report.scan_id}`} className="text-accent">
                {report.scan_id.slice(0, 8)}
              </Link>
              {report.completed_at ? ` · ${new Date(report.completed_at).toLocaleString()}` : ''}
            </p>
          </Panel>

          <Panel className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <PanelTitle>Assessment</PanelTitle>
              <span className="rounded-md bg-surface-inset px-1.5 py-0.5 tabular-nums text-[11px] text-content-muted">
                AI NARRATIVE
              </span>
            </div>
            {compliance?.narrative ? (
              <p className="whitespace-pre-line text-body-md leading-relaxed text-content-secondary">
                {compliance.narrative}
              </p>
            ) : (
              <p className="text-body-md text-content-muted">
                The AI narrative is unavailable for this scan (free-tier provider limit) — the
                status above is from deterministic checks.
              </p>
            )}
          </Panel>

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
      )}
    </div>
  );
}
