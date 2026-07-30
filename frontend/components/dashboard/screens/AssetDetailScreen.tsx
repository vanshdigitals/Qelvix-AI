'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';

import { useToast } from '@/components/dashboard/AppShell';
import { GhostButton, Panel, PanelTitle, PrimaryButton } from '@/components/dashboard/shared';
import { ASSETS, FINDINGS } from '@/lib/data/dashboard';
import { cn } from '@/lib/utils/cn';

export function AssetDetailScreen({ id }: { id: string }) {
  const toast = useToast();
  const asset = ASSETS.find((a) => a.id === id);
  if (!asset) notFound();

  const openFindings = FINDINGS.filter((f) => f.asset === asset.host).slice(0, 3);

  const dns = [
    { type: 'A', value: asset.ip },
    { type: 'MX', value: '10 mail.vardhmanexports.in' },
    { type: 'TXT', value: 'v=spf1 include:_spf.google.com ~all' },
    { type: 'NS', value: 'ns1.digitalocean.com' },
  ];

  const cert = [
    { label: 'Status', value: asset.ssl, warn: asset.ssl === 'Expired' },
    { label: 'Issuer', value: "Let's Encrypt R3" },
    { label: 'Valid from', value: '02 May 2026' },
    { label: 'Expires', value: asset.ssl === 'Expired' ? '26 Jul 2026' : '30 Mar 2027' },
    { label: 'Key', value: 'ECDSA P-256' },
  ];

  const ports = [
    { port: '443', service: 'HTTPS' },
    { port: '80', service: 'HTTP → 443' },
    { port: '25', service: 'SMTP' },
    { port: '21', service: 'FTP (legacy)' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-body-sm text-content-muted">
        <Link href="/assets" className="text-accent">
          Assets
        </Link>
        <span>/</span>
        <span className="font-mono text-caption">{asset.host}</span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="break-all font-display text-h1 tracking-tight text-content-primary">
            {asset.host}
          </h1>
          <div className="flex flex-wrap items-center gap-2.5 text-body-sm text-content-secondary">
            <span
              className={cn(
                'inline-flex items-center gap-1.5',
                asset.verified === 'Verified' ? 'text-success-text' : 'text-high-text',
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  asset.verified === 'Verified' ? 'bg-success-text' : 'bg-high-text',
                )}
              />
              {asset.verified}
            </span>
            <span className="text-content-muted">·</span>
            <span>{asset.kind}</span>
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
              toast(`Rescanning ${asset.host}…`);
            }}
          >
            Rescan asset
          </PrimaryButton>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-5">
          <Panel className="flex flex-col gap-3">
            <PanelTitle>Open findings on this asset</PanelTitle>
            {openFindings.length > 0 ? (
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
                      <span className="font-mono text-[11px] text-content-muted">{f.ruleId}</span>
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

          <Panel className="flex flex-col gap-3">
            <PanelTitle>DNS records</PanelTitle>
            <div className="overflow-hidden rounded-xl border border-border bg-surface-inset">
              {dns.map((d) => (
                <div
                  key={d.type}
                  className="flex items-start gap-3 border-b border-border/60 px-3.5 py-2.5 last:border-0"
                >
                  <span className="w-12 shrink-0 font-mono text-caption text-content-muted">
                    {d.type}
                  </span>
                  <span className="flex-1 break-all font-mono text-caption text-content-secondary">
                    {d.value}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="flex flex-col gap-5">
          <Panel>
            <PanelTitle>Certificate</PanelTitle>
            <div className="mt-2 flex flex-col">
              {cert.map((c) => (
                <div
                  key={c.label}
                  className="flex items-baseline justify-between gap-3 border-t border-border/60 py-2.5 text-body-sm"
                >
                  <span className="text-content-secondary">{c.label}</span>
                  <span
                    className={cn(
                      'text-right font-medium',
                      c.warn ? 'text-critical-text' : 'text-content-primary',
                    )}
                  >
                    {c.value}
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelTitle>Exposure</PanelTitle>
            <div className="mt-2 flex flex-col">
              {ports.map((p) => (
                <div
                  key={p.port}
                  className="flex items-baseline justify-between gap-3 border-t border-border/60 py-2.5 text-body-sm"
                >
                  <span className="font-mono text-content-primary">{p.port}</span>
                  <span className="text-right text-content-secondary">{p.service}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
