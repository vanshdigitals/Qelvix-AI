'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ShieldAlert, Globe, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { GridBackdrop, SectionHeader, WindowChrome } from '@/components/marketing/primitives';
import { SeverityBadge } from '@/components/shared/SeverityBadge';
import { DEMO_SCAN } from '@/lib/data/landing';
import { cn } from '@/lib/utils/cn';

const VIEWS = [
  { id: 'assets', label: 'Asset Map' },
  { id: 'findings', label: 'Findings' },
  { id: 'detail', label: 'Finding Detail' },
] as const;

type ViewId = (typeof VIEWS)[number]['id'];

const EASE = [0.2, 0, 0, 1] as const;
const ADVANCE_MS = 4500;

export function InteractiveDemo() {
  const [view, setView] = useState<ViewId>('assets');
  const [manual, setManual] = useState(false);
  const [paused, setPaused] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const query = window.matchMedia('(max-width: 639px)');
    const sync = (): void => {
      setIsCompact(query.matches);
    };
    sync();
    query.addEventListener('change', sync);
    return () => {
      query.removeEventListener('change', sync);
    };
  }, []);

  useEffect(() => {
    if (manual || paused || isCompact || reduceMotion) return;
    const timer = window.setInterval(() => {
      setView((current) => {
        const index = VIEWS.findIndex((entry) => entry.id === current);
        return VIEWS[(index + 1) % VIEWS.length]?.id ?? 'assets';
      });
    }, ADVANCE_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, [manual, paused, isCompact, reduceMotion]);

  function select(next: ViewId): void {
    setManual(true);
    setView(next);
  }

  return (
    <section
      id="demo"
      aria-labelledby="demo-heading"
      className="relative scroll-mt-20 overflow-hidden bg-surface-inset px-5 py-16 md:px-page-margin md:py-20"
    >
      <GridBackdrop pattern="lines" glow="none" />
      <div className="relative mx-auto max-w-marketing">
        <SectionHeader
          align="center"
          eyebrow="Live Product Stage"
          headingId="demo-heading"
          heading="A real scan in the real interface"
          lede="Interactive view showing real attack surface discovery and deterministic security rule evaluation."
          className="mx-auto items-center"
        />

        {/* Dashboard stage with refined browser chrome and static shadow elevation */}
        <div className="relative mt-10 lg:mt-12">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-xl border border-border/90 bg-surface shadow-md ring-1 ring-black/5">
            <WindowChrome label={DEMO_SCAN.domain} />

            {/* Quick Metrics Header Bar */}
            <div className="grid grid-cols-2 border-b border-border bg-surface-inset px-6 py-4 sm:grid-cols-4">
              <div className="border-r border-border/60 pr-4">
                <span className="font-mono text-[11px] uppercase tracking-wider text-content-muted">
                  Last Scan
                </span>
                <p className="mt-1 font-mono text-body-md font-semibold text-content-primary">
                  {DEMO_SCAN.scannedAt}{' '}
                  <span className="text-caption font-normal text-content-muted">(42ms)</span>
                </p>
              </div>
              <div className="border-r border-border/60 px-4">
                <span className="font-mono text-[11px] uppercase tracking-wider text-content-muted">
                  Public Assets
                </span>
                <p className="mt-1 font-mono text-body-md font-semibold text-content-primary">
                  {DEMO_SCAN.assets.length} Monitored
                </p>
              </div>
              <div className="border-r border-border/60 px-4">
                <span className="font-mono text-[11px] uppercase tracking-wider text-content-muted">
                  Active Findings
                </span>
                <p className="mt-1 font-mono text-body-md font-semibold text-content-primary">
                  {DEMO_SCAN.findings.length} Flagged
                </p>
              </div>
              <div className="pl-4">
                <span className="font-mono text-[11px] uppercase tracking-wider text-content-muted">
                  DPDP Status
                </span>
                <p className="mt-1 inline-flex items-center gap-1.5 font-mono text-body-md font-semibold text-medium-text">
                  <span className="h-2 w-2 rounded-full bg-medium-text" />
                  Action Required
                </p>
              </div>
            </div>

            <div className="grid gap-0 lg:grid-cols-[1fr_2.4fr]">
              {/* Sidebar Rail */}
              <div className="border-b border-border bg-surface-inset p-5 lg:border-b-0 lg:border-r lg:p-6">
                <ScoreHeader />
                <div
                  role="tablist"
                  aria-label="Demo views"
                  className="mt-6 flex gap-1.5 lg:flex-col lg:gap-1.5"
                >
                  {VIEWS.map((entry) => (
                    <button
                      key={entry.id}
                      role="tab"
                      type="button"
                      aria-selected={view === entry.id}
                      aria-controls={`demo-panel-${entry.id}`}
                      id={`demo-tab-${entry.id}`}
                      onClick={() => {
                        select(entry.id);
                      }}
                      className={cn(
                        'flex-1 rounded-md px-3.5 py-2.5 text-left text-body-md transition-all duration-200 ease-out lg:flex-none',
                        view === entry.id
                          ? 'border border-border bg-surface font-semibold text-content-primary shadow-sm'
                          : 'font-medium text-content-secondary hover:bg-surface/50 hover:text-content-primary',
                      )}
                    >
                      {entry.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Display Panel */}
              <div
                aria-live="polite"
                className="min-h-[360px] p-5 md:min-h-[400px] md:p-6"
                onMouseEnter={() => {
                  setPaused(true);
                }}
                onMouseLeave={() => {
                  setPaused(false);
                }}
                // Keyboard users must not have the panel swapped under them.
                onFocusCapture={() => {
                  setPaused(true);
                }}
                onBlurCapture={() => {
                  setPaused(false);
                }}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={view}
                    id={`demo-panel-${view}`}
                    role="tabpanel"
                    aria-labelledby={`demo-tab-${view}`}
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                    transition={{ duration: 0.2, ease: EASE }}
                  >
                    {view === 'assets' && <AssetsView />}
                    {view === 'findings' && <FindingsView />}
                    {view === 'detail' && <DetailView />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 px-2 text-caption text-content-muted">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-success-text" />
              <span className="font-mono">LIVE AUDIT ENGINE: 7 CONTINUOUS AGENTS ACTIVE</span>
            </div>
            <span>Interactive evaluation stage • Click tabs to inspect</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function ScoreHeader() {
  return (
    <div>
      <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-content-muted">
        Overall Risk Index
      </p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="tabular font-display text-[2.75rem] font-bold leading-none text-content-primary">
          {DEMO_SCAN.riskScore}
        </span>
        <span className="font-mono text-body-sm text-content-muted">/ 100</span>
      </div>
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-surface px-3 py-1 text-caption font-semibold text-high-text shadow-2xs">
        <AlertTriangle className="h-3.5 w-3.5" />
        <span>{DEMO_SCAN.riskBand}</span>
      </div>
    </div>
  );
}

function AssetsView() {
  const ports = ['443/TLS', '443/TLS', '25/SMTP', '443/TLS', '80, 443/HTTP'];
  return (
    <div>
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <p className="font-display text-body-lg font-semibold text-content-primary">
          Discovered Attack Surface ({DEMO_SCAN.assets.length} Hosts)
        </p>
        <span className="font-mono text-caption text-content-muted">Last synced: Just now</span>
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {DEMO_SCAN.assets.map((asset, index) => (
          <li
            key={asset.id}
            className="group flex flex-col justify-between rounded-lg border border-border/80 bg-surface p-4 shadow-2xs transition-all duration-200 hover:border-border-strong hover:shadow-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full bg-success-text" />
                <Globe className="h-4 w-4 shrink-0 text-content-secondary" />
                <span className="truncate font-mono text-mono-data font-semibold text-content-primary">
                  {asset.host}
                </span>
              </div>
              <span className="shrink-0 rounded border border-border/80 bg-surface-inset px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-content-secondary">
                {asset.kind}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 font-mono text-caption text-content-muted">
              <span>Port check</span>
              <span className="text-content-secondary">{ports[index]}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FindingsView() {
  return (
    <div>
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <p className="font-display text-body-lg font-semibold text-content-primary">
          Security Findings ({DEMO_SCAN.findings.length})
        </p>
        <span className="font-mono text-caption text-content-muted">Sorted by severity</span>
      </div>
      <ul className="mt-4 flex flex-col gap-3">
        {DEMO_SCAN.findings.map((finding) => (
          <li
            key={finding.id}
            className="group flex flex-col gap-2 rounded-lg border border-border/80 bg-surface p-4 shadow-2xs transition-all duration-200 hover:border-border-strong hover:shadow-xs sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="h-4 w-4 shrink-0 text-content-secondary" />
                <p className="truncate font-display text-body-lg font-semibold text-content-primary">
                  {finding.title}
                </p>
              </div>
              <p className="pl-6.5 mt-1 truncate font-mono text-caption text-content-secondary">
                {finding.asset}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-caption text-accent opacity-0 transition-opacity group-hover:opacity-100">
                Inspect →
              </span>
              <SeverityBadge severity={finding.severity} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DetailView() {
  const finding = DEMO_SCAN.findings[2];
  if (!finding) return null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-3">
          <SeverityBadge severity={finding.severity} />
          <span className="font-mono text-mono-data font-semibold text-content-secondary">
            {finding.findingType}
          </span>
        </div>
        <span className="font-mono text-caption text-content-muted">Decided by rules_engine</span>
      </div>
      <h3 className="mt-4 font-display text-h3 font-semibold text-content-primary">
        {finding.title}
      </h3>
      <p className="mt-1 font-mono text-mono-data text-content-secondary">{finding.asset}</p>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border/80 bg-surface p-4 shadow-2xs">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-content-secondary">
            Plain Language Explanation
          </p>
          <p className="mt-2 text-body-md leading-relaxed text-content-secondary">
            {finding.explanation}
          </p>
          <div className="mt-4 flex items-center gap-2 border-t border-border/40 pt-3 text-caption font-semibold text-success-text">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success-text" />
            <span>Actionable fix available in portal</span>
          </div>
        </div>

        <div className="rounded-lg border border-border/80 bg-surface-inset p-4 font-mono text-caption">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-content-secondary">
            Deterministic Rule Evidence
          </p>
          <pre className="mt-2.5 max-h-[160px] select-all overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words rounded border border-border/50 bg-surface p-3 text-[11px] leading-relaxed text-content-primary">
            {`{
  "rule": "admin_panel_exposed",
  "asset": "admin.example-textiles.in",
  "evaluated_at": "2026-07-21T04:12:09Z",
  "status": "CRITICAL_OPEN_ENDPOINT",
  "decided_by": "rules_engine"
}`}
          </pre>
        </div>
      </div>
    </div>
  );
}
