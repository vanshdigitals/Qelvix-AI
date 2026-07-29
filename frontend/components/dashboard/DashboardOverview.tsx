'use client';

import {
  AlertTriangle,
  Bell,
  ChevronRight,
  LogOut,
  Menu,
  Search,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { UserDropdown } from '@/components/dashboard/UserDropdown';
import { Logo } from '@/components/layout/Logo';
import { useAuth } from '@/components/providers/AuthProvider';
import { cn } from '@/lib/utils/cn';

export type UserRole = 'owner' | 'admin' | 'member';

interface NavGroup {
  label: string;
  items: {
    label: string;
    key: string;
    count?: string;
    /** Only set once the route exists; otherwise the item is inert. */
    href?: string;
  }[];
}

const SEVERITY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  critical: {
    bg: 'bg-critical-bg',
    text: 'text-critical-text',
    dot: 'bg-critical-text',
  },
  high: {
    bg: 'bg-high-bg',
    text: 'text-high-text',
    dot: 'bg-high-text',
  },
  medium: {
    bg: 'bg-medium-bg',
    text: 'text-accent',
    dot: 'bg-accent',
  },
  low: {
    bg: 'bg-surface-inset',
    text: 'text-content-secondary',
    dot: 'bg-content-muted',
  },
};

export function DashboardOverview() {
  const router = useRouter();
  const auth = useAuth();
  const [role, setRole] = useState<UserRole>('owner');
  const pathname = usePathname();
  const [search, setSearch] = useState('');
  const [navOpen, setNavOpen] = useState(false);
  const [partialScan] = useState<boolean>(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNavOpen(false);
    };
    if (navOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [navOpen]);

  const metaName = auth.user ? (auth.user.user_metadata.full_name as string | undefined) : undefined;
  const userName = metaName ?? auth.user?.email?.split('@')[0] ?? 'Priya Sharma';
  const initials = userName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const navGroups: NavGroup[] = [
    {
      label: 'OVERVIEW',
      items: [{ label: 'Dashboard', key: 'dashboard', href: '/dashboard' }],
    },
    {
      label: 'SECURITY',
      items: [
        { label: 'Findings', key: 'findings', count: '9', href: '#' },
        { label: 'Assets', key: 'assets', href: '#' },
        { label: 'Scans', key: 'scans', href: '#' },
      ],
    },
    {
      label: 'COMPLIANCE',
      items: [
        { label: 'DPDP readiness', key: 'compliance', href: '#' },
        { label: 'Reports', key: 'reports', href: '#' },
      ],
    },
    {
      label: 'ORGANISATION',
      items:
        role === 'member'
          ? [{ label: 'Notifications', key: 'notifications', href: '#' }]
          : [
              { label: 'Settings', key: 'settings', href: '#' },
              { label: 'Team & roles', key: 'team', href: '#' },
              { label: 'Notifications', key: 'notifications', href: '#' },
            ],
    },
  ];

  if (role === 'owner') {
    navGroups.push({
      label: 'ACCOUNT',
      items: [
        { label: 'Billing', key: 'billing', href: '#' },
        { label: 'Audit log', key: 'audit', href: '#' },
      ],
    });
  }

  // 270° Arc Gauge SVG helper
  function renderGauge(score: number): React.ReactNode {
    const r = 54;
    const c = 66;
    const start = 135;
    const sweep = 270;

    function pt(deg: number): [number, number] {
      const rad = (deg * Math.PI) / 180;
      return [c + r * Math.cos(rad), c + r * Math.sin(rad)];
    }

    function arc(frac: number): string {
      const end = start + sweep * frac;
      const [x0, y0] = pt(start);
      const [x1, y1] = pt(end);
      const largeArc = sweep * frac > 180 ? 1 : 0;
      return `M ${String(x0.toFixed(2))} ${String(y0.toFixed(2))} A ${String(r)} ${String(r)} 0 ${String(largeArc)} 1 ${String(x1.toFixed(2))} ${String(y1.toFixed(2))}`;
    }

    return (
      <svg
        width={132}
        height={132}
        viewBox="0 0 132 132"
        aria-hidden="true"
        className="block"
      >
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
          className="font-mono text-2xl font-semibold fill-content-primary"
        >
          {score}
        </text>
        <text
          x={66}
          y={88}
          textAnchor="middle"
          className="font-body text-xs fill-content-muted"
        >
          risk score
        </text>
      </svg>
    );
  }

  function renderSparkline(): React.ReactNode {
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
      .map(([x, y], idx) => `${idx === 0 ? 'M' : 'L'}${String(x?.toFixed(1) ?? '0')} ${String(y?.toFixed(1) ?? '0')}`)
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

  const findingsList = [
    {
      severity: 'Critical',
      title: 'SSL certificate expired 4 days ago',
      asset: 'mail.vardhmanexports.in',
      age: '4d open',
    },
    {
      severity: 'High',
      title: 'No DMARC record — email is spoofable',
      asset: 'vardhmanexports.in',
      age: '12d open',
    },
    {
      severity: 'High',
      title: 'Company email found in a breach corpus',
      asset: '3 accounts',
      age: 'new',
    },
  ];

  const activityFeed = [
    {
      actor: 'Qelvix',
      text: 'completed a scheduled scan · 9 findings',
      when: '06:04',
      color: 'bg-accent',
    },
    {
      actor: 'Amit Kumar',
      text: 'marked SPF soft-fail as resolved',
      when: 'Yesterday',
      color: 'bg-success-text',
    },
    {
      actor: 'Qelvix',
      text: 'sent a WhatsApp alert to +91 98••• •••21',
      when: 'Yesterday',
      color: 'bg-accent',
    },
    {
      actor: 'Priya Sharma',
      text: 'invited amit@vardhmanexports.in as Admin',
      when: '2d',
      color: 'bg-content-muted',
    },
    {
      actor: 'Qelvix',
      text: 'certificate finding regressed after being resolved',
      when: '3d',
      color: 'bg-critical-text',
    },
  ];

  const quickActions =
    role === 'member'
      ? ['Download latest report', 'View findings']
      : ['Run scan now', 'Invite team member', 'Download latest report'];

  return (
    <div className="min-h-screen bg-surface font-body text-content-primary">
      {navOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => {
            setNavOpen(false);
          }}
          className="fixed inset-0 z-[40] bg-canvas/60 backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Main Container Shell */}
      <div className="flex min-h-screen flex-col">
        {/* Sidebar Navigation */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-drawer flex w-[240px] flex-col gap-6 overflow-y-auto border-r border-border/60 bg-surface px-4 py-5 shadow-lg transition-transform duration-300 ease-out',
            navOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >


          <button
            type="button"
            onClick={() => alert("Organization switching coming soon.")}
            className="flex items-center gap-2.5 rounded-xl border border-border bg-surface-inset px-3 py-2 text-left transition-colors hover:bg-surface-inset/80"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface font-heading text-[11px] font-bold text-content-primary shadow-2xs">
              VE
            </span>
            <span className="flex-1 truncate font-body text-body-sm font-medium text-content-primary">
              Vardhman Exports
            </span>
            <ChevronRight className="h-4 w-4 text-content-muted" />
          </button>

          <nav className="flex flex-1 flex-col gap-5">
            {navGroups.map((group) => (
              <div key={group.label} className="flex flex-col gap-1">
                <span className="px-2 font-mono text-[10px] tracking-widest text-content-muted">
                  {group.label}
                </span>
                {group.items.map((item) => {
                  const isCur = item.href ? pathname === item.href : false;
                  const base = cn(
                    'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-body-sm font-medium transition-all',
                    isCur
                      ? 'bg-surface-inset text-content-primary'
                      : 'text-content-secondary hover:bg-surface-inset/50 hover:text-content-primary',
                    !item.href && 'cursor-not-allowed opacity-50 hover:bg-transparent',
                  );
                  const inner = (
                    <>
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          isCur ? 'bg-accent' : 'bg-transparent',
                        )}
                      />
                      <span className="flex-1 truncate text-left">{item.label}</span>
                      {item.count && (
                        <span className="rounded-full bg-critical-bg px-1.5 py-0.5 font-mono text-[11px] font-semibold text-critical-text">
                          {item.count}
                        </span>
                      )}
                    </>
                  );

                  return item.href ? (
                    <Link
                      key={item.key}
                      href={item.href}
                      aria-current={isCur ? 'page' : undefined}
                      onClick={() => {
                        setNavOpen(false);
                      }}
                      className={base}
                    >
                      {inner}
                    </Link>
                  ) : (
                    <span
                      key={item.key}
                      aria-disabled="true"
                      title="Not available yet"
                      className={base}
                    >
                      {inner}
                    </span>
                  );
                })}
              </div>
            ))}
          </nav>

        </aside>

        {/* Main Workspace Area */}
        <div className="flex min-w-0 flex-col">
          {/* Top Workspace Header */}
          <header className="flex items-center justify-between gap-4 border-b border-border/60 bg-surface px-6 py-3.5">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  setNavOpen((o) => !o);
                }}
                aria-expanded={navOpen}
                aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-inset text-content-secondary hover:text-content-primary transition-colors"
              >
                {navOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
              <Logo className="hidden sm:flex" />
            </div>
            <div className="flex h-9 w-full max-w-md flex-1 items-center gap-2 rounded-lg border border-border bg-surface-inset px-3 text-content-secondary transition-colors focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
              <Search className="h-4 w-4 text-content-muted" />
              <input
                type="search"
                aria-label="Search findings, assets and scans"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                }}
                placeholder="Search findings, assets, scans..."
                className="w-full bg-transparent font-body text-body-sm text-content-primary outline-none placeholder:text-content-muted"
              />
              <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-[11px] text-content-muted border border-border/60">
                ⌘K
              </span>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {role !== 'member' && (
                <button
                  type="button"
                  onClick={() => alert("Scan initiated successfully.")}
                  title="Run a new scan"
                  className="hidden sm:block rounded-lg bg-accent px-3.5 py-2 text-caption font-semibold text-white shadow-2xs transition-all hover:bg-accent/90"
                >
                  Run scan now
                </button>
              )}
              <button
                type="button"
                onClick={() => alert("No new notifications")}
                aria-label="Notifications"
                className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-inset text-content-secondary hover:text-content-primary transition-colors"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 font-mono text-[10px] font-bold text-white">
                  3
                </span>
              </button>
              <UserDropdown userName={userName} initials={initials} />
            </div>
          </header>

          {/* Content Body */}
          <main className="flex-1 space-y-6 p-6 md:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="font-heading text-heading-md font-bold tracking-tight text-content-primary">
                  Overview
                </h1>
                <p className="mt-1 font-body text-body-sm text-content-secondary">
                  Last scan today 06:04 IST · next scheduled scan Monday 06:00 IST
                </p>
              </div>
            </div>

            {partialScan && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-high-text/40 bg-high-bg p-4 text-body-sm text-content-secondary"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-high-text" />
                <p>
                  <span className="font-medium text-content-primary">
                    Based on a partial scan.
                  </span>{' '}
                  The DNS agent timed out on two subdomains and will retry automatically at
                  06:00. Findings below exclude those hosts.
                </p>
              </div>
            )}

            {/* Top 2-col layout */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_1fr]">
              {/* Security Health Card */}
              <div className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-6 shadow-xs">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-heading-sm font-semibold text-content-primary">
                    Security health
                  </h2>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-high-bg px-2.5 py-0.5 text-caption font-medium text-high-text">
                    <span className="h-1.5 w-1.5 rounded-full bg-high-text" />
                    <span>Needs attention</span>
                  </span>
                </div>

                <div className="flex flex-col items-center gap-6 sm:flex-row">
                  <div className="shrink-0">{renderGauge(47)}</div>
                  <div className="flex flex-1 flex-col gap-4">
                    <p className="font-body text-body-sm text-content-secondary">
                      One expired certificate on your mail host and no DMARC record. Neither is
                      urgent today, both are exploitable within a week.
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">{renderSparkline()}</div>
                    </div>
                  </div>
                </div>

                {/* Findings summary table */}
                <div className="space-y-2.5 border-t border-border/60 pt-4">
                  {findingsList.map((f) => {
                    const sevColor = SEVERITY_COLORS[f.severity.toLowerCase()] ?? SEVERITY_COLORS.low;
                    return (
                      <div
                        key={`${f.title}-${f.asset}`}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-surface-inset p-3"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-caption font-semibold',
                              sevColor?.bg,
                              sevColor?.text,
                            )}
                          >
                            {f.severity}
                          </span>
                          <span className="font-body text-body-sm font-medium text-content-primary">
                            {f.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 font-mono text-caption text-content-muted">
                          <span>{f.asset}</span>
                          <span className="rounded bg-surface px-1.5 py-0.5 border border-border/60">
                            {f.age}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI Summary & Breakdowns */}
              <div className="flex flex-col gap-6">
                {/* Claude Explanation Card */}
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-caption font-medium text-accent">
                      AI EXPLANATION · CLAUDE
                    </span>
                  </div>
                  <p className="mt-3 font-body text-body-sm leading-relaxed text-content-primary">
                    Renew the mail certificate first — it is the only finding that breaks
                    something customers touch. DMARC is a 20-minute DNS change and closes your
                    biggest spoofing risk. Everything else can wait for next week&apos;s scan.
                  </p>
                </div>

                {/* Severity breakdown */}
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <h3 className="font-heading text-body-sm font-semibold text-content-primary">
                    Findings by severity
                  </h3>
                  <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-surface-inset">
                    <span className="w-[13%] bg-critical-text" />
                    <span className="w-[27%] bg-high-text" />
                    <span className="w-[40%] bg-accent" />
                    <span className="w-[20%] bg-content-muted" />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { label: 'Critical', count: '2', text: 'text-critical-text' },
                      { label: 'High', count: '4', text: 'text-high-text' },
                      { label: 'Medium', count: '6', text: 'text-accent' },
                      { label: 'Low', count: '3', text: 'text-content-secondary' },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="flex flex-col rounded-xl border border-border/60 bg-surface-inset p-3"
                      >
                        <span className="text-caption text-content-muted">
                          {row.label}
                        </span>
                        <span
                          className={cn(
                            'mt-1 font-mono text-lg font-semibold',
                            row.text,
                          )}
                        >
                          {row.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Asset Breakdown */}
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <h3 className="font-heading text-body-sm font-semibold text-content-primary">
                    Assets monitored
                  </h3>
                  <div className="mt-3 divide-y divide-border/60">
                    {[
                      { label: 'Verified domains', val: '2', warn: false },
                      { label: 'Subdomains discovered', val: '11', warn: false },
                      { label: 'Not yet claimed', val: '1', warn: true },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="flex items-center justify-between py-2.5 text-body-sm"
                      >
                        <span className="text-content-secondary">{row.label}</span>
                        <span
                          className={cn(
                            'font-mono font-semibold',
                            row.warn ? 'text-high-text' : 'text-content-primary',
                          )}
                        >
                          {row.val}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row: Activity Feed & Quick Actions / DPDP */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Activity Feed */}
              <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                <h3 className="font-heading text-heading-sm font-semibold text-content-primary">
                  Recent activity
                </h3>
                <div className="mt-4 space-y-3.5">
                  {activityFeed.map((ev, idx) => (
                    <div
                      key={`${ev.actor}-${String(idx)}`}
                      className="flex items-center justify-between gap-3 text-body-sm"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={cn('h-2 w-2 shrink-0 rounded-full', ev.color)} />
                        <span className="text-content-secondary">
                          <span className="font-medium text-content-primary">
                            {ev.actor}
                          </span>{' '}
                          {ev.text}
                        </span>
                      </div>
                      <span className="shrink-0 font-mono text-caption text-content-muted">
                        {ev.when}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Col: DPDP Readiness & Quick Actions */}
              <div className="flex flex-col gap-6">
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading text-heading-sm font-semibold text-content-primary">
                      DPDP readiness
                    </h3>
                    <span className="font-mono text-body-sm font-medium text-content-primary">
                      4 / 6
                    </span>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-inset">
                    <span className="block h-full w-[67%] rounded-full bg-accent" />
                  </div>
                  <p className="mt-2 text-caption text-content-muted">
                    Readiness indicator, not certification. Two clauses need evidence.
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                  <h3 className="font-heading text-heading-sm font-semibold text-content-primary">
                    Quick actions
                  </h3>
                  <div className="mt-3 space-y-1">
                    {quickActions.map((qa) => (
                      <button
                        key={qa}
                        type="button"
                        className="flex w-full items-center gap-2.5 rounded-lg py-2 text-left text-body-sm font-medium text-content-secondary transition-colors hover:bg-surface-inset hover:text-content-primary px-2"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                        <span>{qa}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
