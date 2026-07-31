'use client';

import { Info, Loader2 } from 'lucide-react';

import { useToast } from '@/components/dashboard/AppShell';
import { GhostButton, Panel, PanelTitle, ScreenHeader } from '@/components/dashboard/shared';
import { type ApiCompliance, useApi } from '@/lib/api/client';
import { cn } from '@/lib/utils/cn';

export function ComplianceScreen() {
  const toast = useToast();
  const { data, loading, error } = useApi<ApiCompliance>('/compliance/latest');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-content-muted" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <ScreenHeader
        title="DPDP readiness"
        caption="Digital Personal Data Protection Act 2023"
        actions={
          <GhostButton
            onClick={() => {
              toast('Evidence pack export — coming soon.');
            }}
          >
            Export evidence pack
          </GhostButton>
        }
      />

      <div
        role="note"
        className="flex items-start gap-3 rounded-xl border border-border bg-surface-inset p-4 text-body-sm text-content-secondary"
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-content-muted" />
        <p>
          <span className="font-medium text-content-primary">
            This is a readiness indicator, not certification.
          </span>{' '}
          Qelvix maps externally observable signals to DPDP obligations.
        </p>
      </div>

      {!data || error ? (
        <Panel>
          <PanelTitle>No compliance report yet</PanelTitle>
          <p className="mt-2 text-body-sm text-content-secondary">
            {error ?? 'Run a scan to generate a DPDP readiness report for your organisation.'}
          </p>
        </Panel>
      ) : (
        <div className="flex flex-col gap-5">
          <Panel className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <PanelTitle>{data.framework} readiness</PanelTitle>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-caption font-medium',
                  data.is_compliant
                    ? 'bg-success-bg text-success-text'
                    : 'bg-high-bg text-high-text',
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    data.is_compliant ? 'bg-success-text' : 'bg-high-text',
                  )}
                />
                {data.is_compliant ? 'On track' : 'Action needed'}
              </span>
            </div>
            <p className="text-caption text-content-muted">
              Generated {new Date(data.created_at).toLocaleString()}
            </p>
          </Panel>

          <Panel className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <PanelTitle>Assessment</PanelTitle>
              <span className="rounded-md bg-surface-inset px-1.5 py-0.5 tabular-nums text-[11px] text-content-muted">
                AI NARRATIVE
              </span>
            </div>
            {data.dpdp_narrative ? (
              <p className="whitespace-pre-line text-body-md leading-relaxed text-content-secondary">
                {data.dpdp_narrative}
              </p>
            ) : (
              <p className="text-body-md text-content-muted">
                The narrative for this report is not available yet.
              </p>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
