'use client';

import Link from 'next/link';
import { Loader2 } from 'lucide-react';

import { useToast } from '@/components/dashboard/AppShell';
import { GhostButton, Panel, PanelTitle, PrimaryButton } from '@/components/dashboard/shared';
import { type ApiAsset, type ApiFinding, type Paginated, useApi } from '@/lib/api/client';
import { cn } from '@/lib/utils/cn';

export function AssetDetailScreen({ id }: { id: string }) {
  const toast = useToast();
  
  const { data: asset, loading: assetLoading, error: assetError } = useApi<ApiAsset>(`/org/me/assets/${id}`);
  const { data: findingsData, loading: findingsLoading } = useApi<Paginated<ApiFinding>>(`/findings?asset_id=${id}&limit=50`);

  if (assetLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-content-muted" />
      </div>
    );
  }

  if (assetError || !asset) {
    return (
      <div className="flex flex-col gap-5">
        <p className="text-body-sm text-content-muted">{assetError ?? 'Asset not found.'}</p>
      </div>
    );
  }

  const openFindings = (findingsData?.items ?? []).filter((f) => f.status === 'open').slice(0, 5);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-body-sm text-content-muted">
        <Link href="/assets" className="text-accent">
          Assets
        </Link>
        <span>/</span>
        <span className="tabular-nums text-caption">{asset.value}</span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="break-all font-display text-h1 tracking-tight text-content-primary">
            {asset.value}
          </h1>
          <div className="flex flex-wrap items-center gap-2.5 text-body-sm text-content-secondary">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 capitalize',
                asset.verified ? 'text-success-text' : 'text-high-text',
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  asset.verified ? 'bg-success-text' : 'bg-high-text',
                )}
              />
              {asset.verified ? 'Verified' : 'Unverified'}
            </span>
            <span className="text-content-muted">·</span>
            <span className="capitalize">{asset.asset_type}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <GhostButton
            onClick={() => {
              toast('Excluded from future scans.');
            }}
          >
            Exclude from scans
          </GhostButton>
          <PrimaryButton
            onClick={() => {
              toast(`Rescanning ${asset.value}…`);
            }}
          >
            Rescan asset
          </PrimaryButton>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5">
        <Panel className="flex flex-col gap-3">
          <PanelTitle>Open findings on this asset</PanelTitle>
          {findingsLoading ? (
             <div className="py-4 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-content-muted" /></div>
          ) : openFindings.length > 0 ? (
            <div className="flex flex-col gap-2">
              {openFindings.map((f) => (
                <div
                  key={f.id}
                  className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-surface-inset p-3"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-body-sm font-medium text-content-primary">
                      {f.title}
                    </span>
                    <span className="tabular-nums text-[11px] text-content-muted">{f.finding_type}</span>
                  </div>
                  <Link
                    href={`/findings/${f.id}`}
                    className="inline-flex h-7 items-center rounded-lg border border-border px-2.5 text-caption font-semibold text-accent transition-colors hover:bg-surface"
                  >
                    Open
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-body-sm text-content-muted">No open findings on this asset.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
