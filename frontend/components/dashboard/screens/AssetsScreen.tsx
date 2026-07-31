'use client';

import { Loader2 } from 'lucide-react';

import { useToast } from '@/components/dashboard/AppShell';
import { Panel, PrimaryButton, ScreenHeader, TableWrap, Th } from '@/components/dashboard/shared';
import { type ApiAsset, type Paginated, useApi } from '@/lib/api/client';
import { cn } from '@/lib/utils/cn';

interface AssetCounts {
  total_domains: number;
  total_subdomains: number;
  total_ips: number;
}

export function AssetsScreen() {
  const toast = useToast();
  const assets = useApi<Paginated<ApiAsset>>('/org/me/assets?limit=200');
  const counts = useApi<AssetCounts>('/dashboard/assets');

  if (assets.loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-content-muted" />
      </div>
    );
  }

  const rows = assets.data?.items ?? [];
  const stats = [
    { label: 'Domains', value: counts.data?.total_domains ?? 0, note: 'Verified primary domains' },
    {
      label: 'Subdomains',
      value: counts.data?.total_subdomains ?? 0,
      note: 'Discovered by enumeration',
    },
    { label: 'IPs', value: counts.data?.total_ips ?? 0, note: 'Resolved addresses' },
  ];

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
        {stats.map((s) => (
          <Panel key={s.label} className="flex flex-col gap-1.5">
            <span className="text-body-sm text-content-secondary">{s.label}</span>
            <span className="tabular-nums text-[28px] font-medium tabular-nums leading-tight text-content-primary">
              {s.value}
            </span>
            <span className="text-caption text-content-muted">{s.note}</span>
          </Panel>
        ))}
      </div>

      <TableWrap>
        <table className="w-full min-w-[560px] border-collapse text-body-sm">
          <thead>
            <tr className="bg-surface-inset">
              <Th>Host</Th>
              <Th>Type</Th>
              <Th>Verified</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-t border-border/60">
                <td className="px-3 py-3 pl-4 tabular-nums font-medium text-content-primary">
                  {a.value}
                </td>
                <td className="whitespace-nowrap px-3 py-3 capitalize text-content-secondary">
                  {a.asset_type}
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5',
                      a.verified ? 'text-success-text' : 'text-high-text',
                    )}
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        a.verified ? 'bg-success-text' : 'bg-high-text',
                      )}
                    />
                    {a.verified ? 'Verified' : 'Unclaimed'}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr className="border-t border-border/60">
                <td colSpan={3} className="px-3 py-10 text-center text-body-sm text-content-muted">
                  {assets.error ?? 'No assets yet — verify a domain to start monitoring.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}
