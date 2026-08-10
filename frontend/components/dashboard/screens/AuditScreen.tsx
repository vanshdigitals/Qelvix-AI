'use client';

import { ScrollText } from 'lucide-react';

import { Panel, ScreenHeader } from '@/components/dashboard/shared';

export function AuditScreen() {
  return (
    <div className="flex flex-col gap-5">
      <ScreenHeader title="Audit log" caption="Append-only record of important actions." />

      <Panel className="flex flex-col items-center gap-3 py-14 text-center">
        <ScrollText className="h-8 w-8 text-content-muted" />
        <p className="text-body-md font-medium text-content-primary">No audit events yet</p>
        <p className="max-w-md text-body-sm text-content-secondary">
          Once audit logging is enabled, security-relevant actions (scans, member changes, settings
          updates) will appear here in an append-only, tamper-evident list.
        </p>
      </Panel>
    </div>
  );
}
