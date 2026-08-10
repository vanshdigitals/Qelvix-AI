'use client';

import { Info } from 'lucide-react';

import { Panel, PanelTitle, ScreenHeader } from '@/components/dashboard/shared';

export function BillingScreen() {
  return (
    <div className="flex flex-col gap-5">
      <ScreenHeader title="Billing" caption="Plan and usage." />

      <Panel className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <PanelTitle>Current plan</PanelTitle>
          <span className="rounded-full bg-surface-inset px-2.5 py-0.5 text-caption font-medium text-content-secondary">
            Free · MVP
          </span>
        </div>
        <p className="text-body-sm text-content-secondary">
          Qelvix is running as a free MVP. Billing and paid plans are not enabled yet — there is
          nothing to pay for right now.
        </p>
      </Panel>

      <Panel className="flex items-start gap-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-content-muted" />
        <p className="text-body-sm text-content-secondary">
          Scanning uses free-tier security providers (DNS, SSL/TLS, and others). Coverage may be
          limited by those providers&apos; free-tier quotas — that is shown honestly on each scan.
          Paid plans with higher limits will be available after launch.
        </p>
      </Panel>
    </div>
  );
}
