'use client';

import { useToast } from '@/components/dashboard/AppShell';
import {
  OpenLink,
  Panel,
  PrimaryButton,
  ScreenHeader,
  TableWrap,
  Th,
} from '@/components/dashboard/shared';
import { ASSETS } from '@/lib/data/dashboard';
import { cn } from '@/lib/utils/cn';

const STATS = [
  { label: 'Verified domains', value: '2', note: 'Ownership confirmed via DNS' },
  { label: 'Subdomains discovered', value: '11', note: 'Found by passive enumeration' },
  { label: 'Not yet claimed', value: '1', note: 'Verify to include in scans', warn: true },
];

export function AssetsScreen() {
  const toast = useToast();

  return (
    <div className="flex flex-col gap-5">
      <ScreenHeader
        title="Assets"
        caption="Everything Qelvix watches for your organisation"
        actions={
          <PrimaryButton
            onClick={() => {
              toast('Add domain — coming soon.');
            }}
          >
            Add domain
          </PrimaryButton>
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {STATS.map((s) => (
          <Panel key={s.label} className="flex flex-col gap-1.5">
            <span className="text-body-sm text-content-secondary">{s.label}</span>
            <span
              className={cn(
                'font-mono text-[28px] font-medium tabular-nums leading-tight',
                s.warn ? 'text-high-text' : 'text-content-primary',
              )}
            >
              {s.value}
            </span>
            <span className="text-caption text-content-muted">{s.note}</span>
          </Panel>
        ))}
      </div>

      <TableWrap>
        <table className="w-full min-w-[820px] border-collapse text-body-sm">
          <thead>
            <tr className="bg-surface-inset">
              <Th>Host</Th>
              <Th>Verified</Th>
              <Th>IP</Th>
              <Th>SSL</Th>
              <Th>Findings</Th>
              <Th>Last scan</Th>
              <Th align="right" />
            </tr>
          </thead>
          <tbody>
            {ASSETS.map((a) => (
              <tr
                key={a.id}
                className="border-t border-border/60 transition-colors hover:bg-surface-inset/60"
              >
                <td className="px-3 py-3 pl-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono font-medium text-content-primary">{a.host}</span>
                    <span className="text-caption text-content-muted">{a.kind}</span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5',
                      a.verified === 'Verified' ? 'text-success-text' : 'text-high-text',
                    )}
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        a.verified === 'Verified' ? 'bg-success-text' : 'bg-high-text',
                      )}
                    />
                    {a.verified}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-3 font-mono text-caption text-content-secondary">
                  {a.ip}
                </td>
                <td
                  className={cn(
                    'whitespace-nowrap px-3 py-3',
                    a.ssl === 'Expired' ? 'text-critical-text' : 'text-content-secondary',
                  )}
                >
                  {a.ssl}
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  {a.findings > 0 ? (
                    <span className="inline-flex items-center rounded-full bg-high-bg px-2 py-0.5 text-caption font-medium text-high-text">
                      {a.findings} open
                    </span>
                  ) : (
                    <span className="text-success-text">Clean</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-content-secondary">{a.lastScan}</td>
                <td className="px-3 py-3 pr-4 text-right">
                  <OpenLink href={`/assets/${a.id}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}
