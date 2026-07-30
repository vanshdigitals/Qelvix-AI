'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';

import { useToast } from '@/components/dashboard/AppShell';
import { GhostButton, Panel, PanelTitle, SeverityBadge } from '@/components/dashboard/shared';
import { FINDINGS } from '@/lib/data/dashboard';

const FIX_STEPS = [
  'Issue or renew the TLS certificate for the affected host via your CA or ACME client.',
  'Deploy the new certificate and confirm the chain is complete.',
  'Re-run a Qelvix scan to verify the finding closes.',
];

export function FindingDetailScreen({ id }: { id: string }) {
  const toast = useToast();
  const finding = FINDINGS.find((f) => f.id === id);
  if (!finding) notFound();

  const meta: { label: string; value: string; mono?: boolean }[] = [
    { label: 'Rule', value: finding.ruleId, mono: true },
    { label: 'Asset', value: finding.asset, mono: true },
    { label: 'Severity', value: finding.severity },
    { label: 'Status', value: finding.status },
    { label: 'First seen', value: finding.age },
    { label: 'Source', value: 'External scan agent' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-body-sm text-content-muted">
        <Link href="/findings" className="text-accent">
          Findings
        </Link>
        <span>/</span>
        <span className="font-mono text-caption">{finding.ruleId}</span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex max-w-2xl flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <SeverityBadge severity={finding.severity} />
            <span className="font-mono text-caption text-content-muted">{finding.asset}</span>
          </div>
          <h1 className="font-display text-h1 tracking-tight text-content-primary">
            {finding.title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <GhostButton
            onClick={() => {
              toast(`Acknowledged: ${finding.title}`);
            }}
          >
            Acknowledge
          </GhostButton>
          <GhostButton
            onClick={() => {
              toast('Export started — check your email.');
            }}
          >
            Export finding
          </GhostButton>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-5">
          <Panel className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <PanelTitle>What this means</PanelTitle>
              <span className="rounded-md bg-surface-inset px-1.5 py-0.5 font-mono text-[11px] text-content-muted">
                AI EXPLANATION
              </span>
            </div>
            <p className="text-body-md leading-relaxed text-content-secondary">
              The certificate protecting this host has expired. Browsers and mail clients will now
              warn visitors that the connection is untrusted, which breaks anything customers touch
              directly.
            </p>
            <p className="text-body-md leading-relaxed text-content-secondary">
              Until it is renewed, traffic to this host can be intercepted and users may abandon the
              service. This is the fastest-impact item on your board today.
            </p>
          </Panel>

          <Panel className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <PanelTitle>How to fix it</PanelTitle>
              <span className="text-caption text-content-muted">~20 minutes</span>
            </div>
            <div className="flex flex-col gap-3.5">
              {FIX_STEPS.map((step, idx) => (
                <div key={step} className="flex items-start gap-3">
                  <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-border bg-surface-inset font-mono text-[11px] text-content-secondary">
                    {idx + 1}
                  </span>
                  <span className="flex-1 text-body-md leading-relaxed text-content-secondary">
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="flex flex-col gap-5">
          <Panel>
            <PanelTitle>Details</PanelTitle>
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

          <Panel className="flex flex-col gap-2">
            <PanelTitle>DPDP relevance</PanelTitle>
            <p className="text-body-sm leading-relaxed text-content-secondary">
              Maps to S.8(5) — reasonable security safeguards. An expired certificate weakens the
              safeguards you are expected to maintain over personal data in transit.
            </p>
            <Link href="/compliance" className="text-body-sm font-medium text-accent">
              Open readiness checklist
            </Link>
          </Panel>
        </div>
      </div>
    </div>
  );
}
