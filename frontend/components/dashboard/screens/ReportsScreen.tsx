'use client';

import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { useToast } from '@/components/dashboard/AppShell';
import {
  Panel,
  PanelTitle,
  PrimaryButton,
  ScreenHeader,
  SeverityBadge,
} from '@/components/dashboard/shared';
import { API_URL, type ApiScan, type ScanReport } from '@/lib/api/client';
import { createClient } from '@/lib/supabase/client';

async function token(): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export function ReportsScreen() {
  const toast = useToast();
  const [scans, setScans] = useState<ApiScan[]>([]);
  const [latest, setLatest] = useState<ScanReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    const t = await token();
    if (!t) {
      setLoading(false);
      return;
    }
    const headers = { Authorization: `Bearer ${t}` };
    const res = await fetch(`${API_URL}/scans?limit=20`, { headers });
    const items = res.ok ? (((await res.json()) as { items?: ApiScan[] }).items ?? []) : [];
    setScans(items);
    const done = items.find((s) => s.status === 'completed');
    if (done) {
      const rr = await fetch(`${API_URL}/scans/${done.id}/report`, { headers });
      if (rr.ok) setLatest((await rr.json()) as ScanReport);
    } else {
      setLatest(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Refresh while a scan is in progress.
  useEffect(() => {
    if (!scans.some((s) => ['queued', 'pending', 'running'].includes(s.status))) return undefined;
    const t = setInterval(() => void load(), 4000);
    return () => {
      clearInterval(t);
    };
  }, [scans, load]);

  async function runScan(): Promise<void> {
    setScanning(true);
    try {
      const t = await token();
      if (!t) return;
      const res = await fetch(`${API_URL}/scans/trigger`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}` },
      });
      const body = (await res.json().catch(() => ({}))) as { detail?: string };
      toast(res.ok ? 'Scan started.' : (body.detail ?? `Could not start scan (${String(res.status)}).`));
      await load();
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <ScreenHeader
        title="Reports"
        caption="Generated from your real scans."
        actions={
          <PrimaryButton onClick={() => void runScan()} disabled={scanning}>
            {scanning ? 'Starting…' : 'Run scan'}
          </PrimaryButton>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-content-muted" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Panel className="flex flex-col gap-4">
            {latest ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <PanelTitle>
                      Latest report ·{' '}
                      {latest.completed_at
                        ? new Date(latest.completed_at).toLocaleDateString()
                        : '—'}
                    </PanelTitle>
                    <span className="text-body-sm text-content-muted">
                      Risk {latest.risk_score ?? '—'}
                      {latest.risk_band ? ` · ${latest.risk_band}` : ''} · {latest.findings.length}{' '}
                      findings
                    </span>
                  </div>
                  <Link href={`/scans/${latest.scan_id}`} className="text-body-sm font-medium text-accent">
                    View full report
                  </Link>
                </div>

                {latest.executive_summary && (
                  <div className="rounded-2xl border border-border bg-surface-inset p-4">
                    <span className="font-display text-h4 text-content-primary">
                      Executive summary
                    </span>
                    <p className="mt-2 whitespace-pre-wrap text-body-md leading-relaxed text-content-secondary">
                      {latest.executive_summary}
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <span className="text-caption font-semibold uppercase text-content-muted">
                    Top recommendations
                  </span>
                  {latest.recommendations.length > 0 ? (
                    latest.recommendations.slice(0, 5).map((r) => (
                      <div
                        key={r.finding_type}
                        className="flex items-start gap-2.5 border-t border-border/60 py-2.5 first:border-0"
                      >
                        <SeverityBadge severity={r.severity} />
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="text-body-sm font-medium text-content-primary">
                            {r.title}
                          </span>
                          <span className="whitespace-pre-wrap text-caption text-content-secondary">
                            {r.action.slice(0, 200)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-body-sm text-content-muted">No recommendations.</p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <p className="text-body-md font-medium text-content-primary">No reports yet</p>
                <p className="text-body-sm text-content-secondary">
                  Run a scan — the report is generated from real findings.
                </p>
                <PrimaryButton onClick={() => void runScan()} disabled={scanning}>
                  {scanning ? 'Starting…' : 'Run your first scan'}
                </PrimaryButton>
              </div>
            )}
          </Panel>

          <Panel className="flex flex-col gap-3">
            <PanelTitle>Scan history</PanelTitle>
            {scans.length > 0 ? (
              <div className="flex flex-col">
                {scans.map((s) => {
                  const total = Object.values(s.findings_summary ?? {}).reduce((a, b) => a + b, 0);
                  const when = s.completed_at ?? s.started_at;
                  return (
                    <Link
                      key={s.id}
                      href={`/scans/${s.id}`}
                      className="flex items-center gap-3 border-t border-border/60 py-2.5 first:border-0 hover:opacity-80"
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-body-sm font-medium capitalize text-content-primary">
                          {s.status}
                          {s.status === 'completed' ? ` · ${String(total)} findings` : ''}
                        </span>
                        <span className="tabular-nums text-caption text-content-muted">
                          {when ? new Date(when).toLocaleString() : '—'}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-body-sm text-content-muted">No scans yet.</p>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
