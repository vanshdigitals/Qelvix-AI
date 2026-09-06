'use client';

import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import { useToast } from '@/components/dashboard/AppShell';
import { Panel, PanelTitle, SeverityBadge } from '@/components/dashboard/shared';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';
import { getApiUrl } from '@/lib/api/client';

interface DashboardSummary {
  risk_score?: number;
  open_critical_findings?: number;
  open_high_findings?: number;
  total_assets?: number;
}

interface ApiFinding {
  id: string;
  severity: string;
  title: string;
  finding_type: string;
  agent_source: string;
  status: string;
}

interface ApiScan {
  id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  findings_summary: Record<string, number> | null;
}

async function authToken(): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export function DashboardOverview() {
  const toast = useToast();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [findings, setFindings] = useState<ApiFinding[]>([]);
  const [scans, setScans] = useState<ApiScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadData(): Promise<void> {
    try {
      const token = await authToken();
      if (!token) {
        setError('Not authenticated.');
        setLoading(false);
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      const baseUrl = getApiUrl();
      const [summaryRes, findingsRes, scansRes] = await Promise.all([
        fetch(`${baseUrl}/dashboard/summary`, { headers }),
        fetch(`${baseUrl}/findings?limit=5`, { headers }),
        fetch(`${baseUrl}/scans?limit=5`, { headers }),
      ]);
      if (!summaryRes.ok) {
        setError(`API returned ${String(summaryRes.status)}`);
        setLoading(false);
        return;
      }
      setSummary((await summaryRes.json()) as DashboardSummary);
      if (findingsRes.ok) {
        const fData = (await findingsRes.json()) as { items?: ApiFinding[] };
        setFindings(fData.items ?? []);
      }
      if (scansRes.ok) {
        const sData = (await scansRes.json()) as { items?: ApiScan[] };
        setScans(sData.items ?? []);
      }
    } catch (e) {
      console.error(e);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real-time: while any scan is queued/running, refresh from the backend every
  // 5s so status + findings + risk score update live (no simulated progress).
  useEffect(() => {
    const active = scans.some((s) => s.status === 'queued' || s.status === 'running');
    if (!active) return undefined;
    const id = setInterval(() => {
      void loadData();
    }, 5000);
    return () => {
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scans]);

  // Refetch when the tab/page regains focus or becomes visible — covers returning
  // to the dashboard after triggering a scan from another page. Event-driven only
  // (no interval), so there's no polling when nothing is happening.
  const loadDataRef = useRef(loadData);
  loadDataRef.current = loadData;
  useEffect(() => {
    const refresh = (): void => {
      if (document.visibilityState === 'visible') void loadDataRef.current();
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  async function runScan(): Promise<void> {
    setScanning(true);
    try {
      const token = await authToken();
      if (!token) {
        toast('Not authenticated.');
        return;
      }
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}/scans/trigger`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast('Scan started — findings will appear as it runs.');
        await loadData();
      } else {
        const body = (await res.json().catch(() => ({}))) as { detail?: string };
        toast(body.detail ?? `Could not start scan (${String(res.status)}).`);
      }
    } catch {
      toast('Could not start scan. Try again.');
    } finally {
      setScanning(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-content-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="text-body-md font-medium text-high-text">
          Couldn&apos;t load your dashboard — {error}
        </div>
        <p className="text-body-sm text-content-secondary">
          Please try reloading the page or check your authentication.
        </p>
      </div>
    );
  }

  const mappedFindings = findings.map((f) => ({
    id: f.id,
    severity: f.severity.charAt(0).toUpperCase() + f.severity.slice(1),
    title: f.title,
    asset: f.agent_source === 'asset_discovery' ? 'Asset Discovery' : f.finding_type,
    age: 'new',
  }));

  const riskScore = summary?.risk_score ?? 100;
  const criticalCount = summary?.open_critical_findings ?? 0;
  const highCount = summary?.open_high_findings ?? 0;
  const totalAssets = summary?.total_assets ?? 0;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-h1 tracking-tight text-content-primary">Overview</h1>
          <p className="mt-1 text-body-sm text-content-secondary">
            Live dashboard powered by the /dashboard/summary API
          </p>
        </div>
      </div>

      {/* Row 1: Security health · Action required */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_1fr]">
        <Panel className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3">
            <PanelTitle>Security health</PanelTitle>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-high-bg px-2.5 py-0.5 text-caption font-medium text-high-text">
              <span className="h-1.5 w-1.5 rounded-full bg-high-text" />
              <span>Needs attention</span>
            </span>
          </div>

          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div className="shrink-0">
              <Gauge score={riskScore} />
            </div>
            <div className="flex flex-1 flex-col gap-4">
              <p className="text-body-md leading-relaxed text-content-secondary">
                You have {criticalCount} critical and {highCount} high findings open. Review the
                findings panel to start remediation.
              </p>
              <div className="flex flex-col gap-0.5">
                <span className="text-caption text-content-muted">30-day trend</span>
                <span className="tabular-nums text-body-sm text-content-muted">
                  {scans.length > 1 ? 'See scans for history' : 'Not enough history yet'}
                </span>
              </div>
            </div>
          </div>
        </Panel>

        <Panel className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <PanelTitle>Action required (live findings)</PanelTitle>
            <Link
              href="/findings"
              className="text-body-sm font-medium text-accent transition-opacity hover:opacity-80"
            >
              View all
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {mappedFindings.length > 0 ? (
              mappedFindings.map((f) => (
                <div
                  key={f.id}
                  className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-surface-inset p-3"
                >
                  <SeverityBadge severity={f.severity} />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-body-sm font-medium text-content-primary">{f.title}</span>
                    <span className="truncate tabular-nums text-caption text-content-muted">
                      {f.asset} · {f.age}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      toast(`Acknowledged: ${f.title}`);
                    }}
                    className="h-7 shrink-0 rounded-lg border border-border-strong px-2.5 text-caption font-semibold text-content-secondary transition-colors hover:bg-surface hover:text-content-primary"
                  >
                    Acknowledge
                  </button>
                </div>
              ))
            ) : (
              <p className="text-body-sm text-content-muted">No open findings.</p>
            )}
          </div>
        </Panel>
      </div>

      {/* Row 2: This week's priority · Findings · Assets */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel className="flex flex-col gap-3.5">
          <PanelTitle>This week&apos;s priority</PanelTitle>
          <p className="text-body-sm leading-relaxed text-content-secondary">
            Review the top critical findings first.
          </p>
          <div className="mt-auto flex items-center gap-2 pt-2">
            <span className="rounded-md bg-surface-inset px-1.5 py-0.5 tabular-nums text-[11px] text-content-muted">
              AI EXPLANATION
            </span>
            <span className="text-caption text-content-muted">
              of findings the rules already made
            </span>
          </div>
        </Panel>

        <Panel className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between gap-3">
            <PanelTitle>Findings</PanelTitle>
            <Link
              href="/findings"
              className="text-body-sm font-medium text-accent transition-opacity hover:opacity-80"
            >
              Triage
            </Link>
          </div>
          <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
            <span className="w-[13%] rounded-full bg-critical-text" />
            <span className="w-[27%] rounded-full bg-high-text" />
            <span className="w-[40%] rounded-full bg-accent" />
            <span className="w-[20%] rounded-full bg-content-muted" />
          </div>
          <div className="flex flex-col gap-2">
            {[
              { label: 'Critical', count: String(criticalCount), dot: 'bg-critical-text' },
              { label: 'High', count: String(highCount), dot: 'bg-high-text' },
              { label: 'Medium', count: '—', dot: 'bg-accent' },
              { label: 'Low', count: '—', dot: 'bg-content-muted' },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-2.5">
                <span className={cn('h-1.5 w-1.5 rounded-full', row.dot)} />
                <span className="flex-1 text-body-sm text-content-secondary">{row.label}</span>
                <span className="tabular-nums text-body-sm tabular-nums text-content-primary">
                  {row.count}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between gap-3">
            <PanelTitle>Assets</PanelTitle>
            <Link
              href="/assets"
              className="text-body-sm font-medium text-accent transition-opacity hover:opacity-80"
            >
              Inventory
            </Link>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="tabular-nums text-[32px] font-medium leading-none tabular-nums text-content-primary">
              {totalAssets}
            </span>
            <span className="text-body-sm text-content-muted">monitored</span>
          </div>
          <div className="flex flex-col">
            {[
              { label: 'Verified domains', val: '—', warn: false },
              { label: 'Subdomains discovered', val: '—', warn: false },
              { label: 'Not yet claimed', val: '—', warn: true },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-2.5 border-t border-border/60 py-2 text-body-sm"
              >
                <span className="text-content-secondary">{row.label}</span>
                <span
                  className={cn(
                    'tabular-nums tabular-nums',
                    row.warn ? 'text-high-text' : 'text-content-primary',
                  )}
                >
                  {row.val}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Row 3: Recent activity · DPDP + Quick actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel>
          <div className="flex items-center justify-between gap-3">
            <PanelTitle>Recent activity</PanelTitle>
            <Link
              href="/audit"
              className="text-body-sm font-medium text-accent transition-opacity hover:opacity-80"
            >
              Full log
            </Link>
          </div>
          <div className="mt-4 flex flex-col">
            {scans.length > 0 ? (
              scans.map((sc) => {
                const total = Object.values(sc.findings_summary ?? {}).reduce((a, b) => a + b, 0);
                const when = sc.completed_at ?? sc.started_at;
                return (
                  <div key={sc.id} className="flex items-start gap-3 py-2.5 text-body-sm">
                    <span
                      className={cn(
                        'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                        sc.status === 'completed'
                          ? 'bg-accent'
                          : sc.status === 'failed'
                            ? 'bg-critical-text'
                            : 'bg-content-muted',
                      )}
                    />
                    <span className="flex-1 text-content-secondary">
                      <span className="font-medium text-content-primary">Scan {sc.status}</span>
                      {sc.status === 'completed' ? ` · ${String(total)} findings` : ''}
                    </span>
                    <span className="shrink-0 tabular-nums text-caption text-content-muted">
                      {when ? new Date(when).toLocaleDateString() : '—'}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="py-2 text-body-sm text-content-muted">
                No activity yet. Run your first scan to see events here.
              </p>
            )}
          </div>
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel>
            <div className="flex items-center justify-between gap-3">
              <PanelTitle>DPDP readiness</PanelTitle>
              <Link
                href="/compliance"
                className="text-body-sm font-medium text-accent transition-opacity hover:opacity-80"
              >
                View
              </Link>
            </div>
            <p className="mt-3 text-body-sm text-content-muted">
              {scans.some((s) => s.status === 'completed')
                ? 'Open DPDP readiness for your latest assessment.'
                : 'Not assessed yet — run a scan to evaluate DPDP readiness.'}
            </p>
          </Panel>

          <Panel>
            <PanelTitle>Quick actions</PanelTitle>
            <div className="mt-2 flex flex-col">
              <button
                type="button"
                onClick={() => void runScan()}
                disabled={scanning}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 text-left text-body-sm font-medium text-content-secondary transition-colors hover:bg-surface-inset hover:text-content-primary disabled:opacity-50"
              >
                {scanning ? (
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                )}
                <span>{scanning ? 'Starting scan…' : 'Run scan now'}</span>
              </button>
              <Link
                href="/findings"
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 text-left text-body-sm font-medium text-content-secondary transition-colors hover:bg-surface-inset hover:text-content-primary"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                <span>View findings</span>
              </Link>
              <Link
                href="/team"
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 text-left text-body-sm font-medium text-content-secondary transition-colors hover:bg-surface-inset hover:text-content-primary"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                <span>Invite team member</span>
              </Link>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

// 270° arc gauge (05 §data-viz).
function Gauge({ score }: { score: number }): ReactNode {
  const r = 54;
  const c = 66;
  const start = 135;
  const sweep = 270;

  const pt = (deg: number): [number, number] => {
    const rad = (deg * Math.PI) / 180;
    return [c + r * Math.cos(rad), c + r * Math.sin(rad)];
  };

  const arc = (frac: number): string => {
    const end = start + sweep * frac;
    const [x0, y0] = pt(start);
    const [x1, y1] = pt(end);
    const largeArc = sweep * frac > 180 ? 1 : 0;
    return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${String(r)} ${String(r)} 0 ${String(largeArc)} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  };

  return (
    <svg width={132} height={132} viewBox="0 0 132 132" aria-hidden="true" className="block">
      <path
        d={arc(1)}
        fill="none"
        stroke="currentColor"
        strokeWidth={10}
        strokeLinecap="round"
        className="text-surface-inset"
      />
      <path
        d={arc(score / 100)}
        fill="none"
        stroke="currentColor"
        strokeWidth={10}
        strokeLinecap="round"
        className="text-high-text"
      />
      <text
        x={66}
        y={70}
        textAnchor="middle"
        className="fill-content-primary tabular-nums text-2xl font-semibold"
      >
        {score}
      </text>
      <text x={66} y={88} textAnchor="middle" className="font-body fill-content-muted text-xs">
        risk score
      </text>
    </svg>
  );
}

