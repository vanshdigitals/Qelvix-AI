'use client';

import { KeyRound } from 'lucide-react';

import { Panel, ScreenHeader } from '@/components/dashboard/shared';

export function ApiKeysScreen() {
  return (
    <div className="flex flex-col gap-5">
      <ScreenHeader title="API keys" caption="Programmatic access to Qelvix." />

      <Panel className="flex flex-col items-center gap-3 py-14 text-center">
        <KeyRound className="h-8 w-8 text-content-muted" />
        <p className="text-body-md font-medium text-content-primary">
          API access isn&apos;t available yet
        </p>
        <p className="max-w-md text-body-sm text-content-secondary">
          Programmatic API keys — for integrating Qelvix scans into your own tooling — will arrive in
          a later release. For now, run scans and view results from the dashboard.
        </p>
      </Panel>
    </div>
  );
}
