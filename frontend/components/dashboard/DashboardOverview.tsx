'use client';

import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { useToast } from '@/components/dashboard/AppShell';
import { Panel, PanelTitle, SeverityBadge } from '@/components/dashboard/shared';
import { ACTIVITY_FEED, RECENT_FINDINGS } from '@/lib/data/dashboard';
import { cn } from '@/lib/utils/cn';

const QUICK_ACTIONS = ['Run scan now', 'Invite team member', 'Download latest report'];

export function DashboardOverview() {
  const toast = useToast();

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-h1 tracking-tight text-content-primary">Overview</h1>
          <p className="mt-1 text-body-sm text-content-secondary">
            Last scan today 06:04 IST · next scheduled scan Monday 06:00 IST
          </p>
        </div>
      </div>

      <div
        role="alert"
        className="border-high-text/40 flex items-start gap-3 rounded-xl border bg-high-bg p-4 text-body-sm text-content-secondary"
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-high-text" />
        <p>
          <span className="font-medium text-content-primary">Based on a partial scan.</span> The DNS
          agent timed out on two subdomains and will retry automatically at 06:00. Findings below
          exclude those hosts.
        </p>
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
              <Gauge score={47} />
            </div>
            <div className="flex flex-1 flex-col gap-4">
              <p className="text-body-md leading-relaxed text-content-secondary">
                One expired certificate on your mail host and no DMARC record. Neither is urgent
                today, both are exploitable within a week.
              </p>
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-caption text-content-muted">30-day trend</span>
                  <span className="font-mono text-body-sm tabular-nums text-success-text">
                    −15 pts
                  </span>
                </div>
                <div className="h-8 flex-1">
                  <Sparkline />
                </div>
              </div>
            </div>
          </div>
        </Panel>

        <Panel className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <PanelTitle>Action required</PanelTitle>
            <Link
              href="/findings"
              className="text-body-sm font-medium text-accent transition-opacity hover:opacity-80"
            >
              View all 9
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {RECENT_FINDINGS.map((f) => (
              <div
                key={f.title}
                className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-surface-inset p-3"
              >
                <SeverityBadge severity={f.severity} />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-body-sm font-medium text-content-primary">{f.title}</span>
                  <span className="truncate font-mono text-caption text-content-muted">
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
            ))}
          </div>
        </Panel>
      </div>

      {/* Row 2: This week's priority · Findings · Assets */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel className="flex flex-col gap-3.5">
          <PanelTitle>This week&apos;s priority</PanelTitle>
          <p className="text-body-sm leading-relaxed text-content-secondary">
            Renew the mail certificate first — it is the only finding that breaks something
            customers touch. DMARC is a 20-minute DNS change and closes your biggest spoofing risk.
            Everything else can wait for next week&apos;s scan.
          </p>
          <div className="mt-auto flex items-center gap-2 pt-2">
            <span className="rounded-md bg-surface-inset px-1.5 py-0.5 font-mono text-[11px] text-content-muted">
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
              { label: 'Critical', count: '2', dot: 'bg-critical-text' },
              { label: 'High', count: '4', dot: 'bg-high-text' },
              { label: 'Medium', count: '6', dot: 'bg-accent' },
              { label: 'Low', count: '3', dot: 'bg-content-muted' },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-2.5">
                <span className={cn('h-1.5 w-1.5 rounded-full', row.dot)} />
                <span className="flex-1 text-body-sm text-content-secondary">{row.label}</span>
                <span className="font-mono text-body-sm tabular-nums text-content-primary">
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
            <span className="font-mono text-[32px] font-medium tabular-nums leading-none text-content-primary">
              13
            </span>
            <span className="text-body-sm text-content-muted">monitored</span>
          </div>
          <div className="flex flex-col">
            {[
              { label: 'Verified domains', val: '2', warn: false },
              { label: 'Subdomains discovered', val: '11', warn: false },
              { label: 'Not yet claimed', val: '1', warn: true },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-2.5 border-t border-border/60 py-2 text-body-sm"
              >
                <span className="text-content-secondary">{row.label}</span>
                <span
                  className={cn(
                    'font-mono tabular-nums',
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
            {ACTIVITY_FEED.map((ev, idx) => (
              <div
                key={`${ev.actor}-${String(idx)}`}
                className="flex items-start gap-3 py-2.5 text-body-sm"
              >
                <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', ev.dot)} />
                <span className="flex-1 text-content-secondary">
                  <span className="font-medium text-content-primary">{ev.actor}</span> {ev.text}
                </span>
                <span className="shrink-0 font-mono text-caption text-content-muted">
                  {ev.when}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel>
            <div className="flex items-center justify-between gap-3">
              <PanelTitle>DPDP readiness</PanelTitle>
              <span className="font-mono text-body-sm text-content-primary">4 / 6</span>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-inset">
              <span className="block h-full w-[67%] rounded-full bg-accent" />
            </div>
            <p className="mt-2 text-caption text-content-muted">
              Readiness indicator, not certification. Two clauses need evidence.
            </p>
          </Panel>

          <Panel>
            <PanelTitle>Quick actions</PanelTitle>
            <div className="mt-2 flex flex-col">
              {QUICK_ACTIONS.map((qa) => (
                <button
                  key={qa}
                  type="button"
                  onClick={() => {
                    toast(`${qa} — coming soon.`);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 text-left text-body-sm font-medium text-content-secondary transition-colors hover:bg-surface-inset hover:text-content-primary"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  <span>{qa}</span>
                </button>
              ))}
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
        className="fill-content-primary font-mono text-2xl font-semibold"
      >
        {score}
      </text>
      <text x={66} y={88} textAnchor="middle" className="font-body fill-content-muted text-xs">
        risk score
      </text>
    </svg>
  );
}

function Sparkline(): ReactNode {
  const pts = [62, 60, 58, 59, 55, 52, 54, 50, 48, 47];
  const w = 180;
  const h = 32;
  const min = 44;
  const max = 64;
  const coords = pts.map((v, idx) => [
    idx * (w / (pts.length - 1)),
    h - ((v - min) / (max - min)) * (h - 6) - 3,
  ]);
  const line = coords
    .map(([x, y], idx) => `${idx === 0 ? 'M' : 'L'}${(x ?? 0).toFixed(1)} ${(y ?? 0).toFixed(1)}`)
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${String(w)} ${String(h)}`}
      preserveAspectRatio="none"
      width="100%"
      height={h}
      aria-hidden="true"
      className="block overflow-visible"
    >
      <path
        d={`${line} L ${String(w)} ${String(h)} L 0 ${String(h)} Z`}
        fill="currentColor"
        className="text-accent/15"
      />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-accent"
      />
    </svg>
  );
}
