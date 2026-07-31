'use client';

import { Loader2 } from 'lucide-react';
import Link from 'next/link';

import { useToast } from '@/components/dashboard/AppShell';
import { GhostButton, Panel, PanelTitle, SeverityBadge } from '@/components/dashboard/shared';
import { type ApiFinding, useApi } from '@/lib/api/client';

export function FindingDetailScreen({ id }: { id: string }) {
  const toast = useToast();
  const { data: finding, loading, error } = useApi<ApiFinding>(`/findings/${id}`);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-content-muted" />
      </div>
    );
  }

  if (error || !finding) {
    return (
      <div className="flex flex-col gap-3">
        <Link href="/findings" className="text-body-sm text-accent">
          ← Back to findings
        </Link>
        <Panel>
          <PanelTitle>Couldn&apos;t load this finding</PanelTitle>
          <p className="mt-2 text-body-sm text-content-secondary">
            {error ?? 'This finding was not found.'}
          </p>
        </Panel>
      </div>
    );
  }

  const remediation = (finding.remediation_steps ?? '').trim();
  const meta: { label: string; value: string; mono?: boolean }[] = [
    { label: 'Rule', value: finding.finding_type, mono: true },
    { label: 'Source', value: finding.agent_source, mono: true },
    { label: 'Severity', value: finding.severity },
    { label: 'Status', value: finding.status.replace('_', ' ') },
    { label: 'First seen', value: new Date(finding.created_at).toLocaleDateString() },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-body-sm text-content-muted">
        <Link href="/findings" className="text-accent">
          Findings
        </Link>
        <span>/</span>
        <span className="tabular-nums text-caption">{finding.finding_type}</span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex max-w-2xl flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <SeverityBadge severity={finding.severity} />
            <span className="tabular-nums text-caption text-content-muted">
              {finding.agent_source}
            </span>
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
              <span className="rounded-md bg-surface-inset px-1.5 py-0.5 tabular-nums text-[11px] text-content-muted">
                AI EXPLANATION
              </span>
            </div>
            {finding.plain_explanation ? (
              <p className="whitespace-pre-line text-body-md leading-relaxed text-content-secondary">
                {finding.plain_explanation}
              </p>
            ) : (
              <p className="text-body-md leading-relaxed text-content-muted">
                An AI explanation for this finding is not available yet.
              </p>
            )}
          </Panel>

          <Panel className="flex flex-col gap-3">
            <PanelTitle>How to fix it</PanelTitle>
            {remediation ? (
              <p className="whitespace-pre-line text-body-md leading-relaxed text-content-secondary">
                {remediation}
              </p>
            ) : (
              <p className="text-body-md leading-relaxed text-content-muted">
                Remediation steps are not available yet.
              </p>
            )}
          </Panel>

          {Object.keys(finding.raw_data).length > 0 && (
            <Panel className="flex flex-col gap-3">
              <PanelTitle>Raw evidence</PanelTitle>
              <pre className="overflow-x-auto rounded-xl border border-border bg-surface-inset p-4 tabular-nums text-caption text-content-secondary">
                {JSON.stringify(finding.raw_data, null, 2)}
              </pre>
            </Panel>
          )}
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
                    className={`text-right font-medium capitalize text-content-primary ${m.mono ? 'tabular-nums text-caption normal-case' : ''}`}
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
              Findings feed your DPDP readiness assessment under S.8 (reasonable security
              safeguards).
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
