'use client';

import { Download } from 'lucide-react';
import { useState } from 'react';

import { useToast } from '@/components/dashboard/AppShell';
import {
  GhostButton,
  Panel,
  PanelTitle,
  PrimaryButton,
  ScreenHeader,
} from '@/components/dashboard/shared';
import { cn } from '@/lib/utils/cn';

const ARCHIVE = [
  { date: '29 July 2026', meta: 'Weekly scan · 12 pages' },
  { date: '22 July 2026', meta: 'Weekly scan · 11 pages' },
  { date: '15 July 2026', meta: 'Weekly scan · 10 pages' },
  { date: '08 July 2026', meta: 'Weekly scan · 10 pages' },
  { date: '01 July 2026', meta: 'Onboarding baseline · 14 pages' },
];

const AUDIENCE = {
  owner: [
    'Your security posture improved 15 points this month, driven mostly by resolving the SPF soft-fail on your primary domain.',
    'Two items still need attention: an expired mail certificate and a missing DMARC record. Both are quick fixes with outsized impact on trust.',
    'No customer-facing outages were detected during this period. The one certificate issue affects mail delivery, not your storefront.',
  ],
  technical: [
    'QX-SSL-001: leaf certificate on mail.vardhmanexports.in expired 2026-07-26. Chain otherwise valid. Renew via ACME and reload Postfix.',
    'QX-DMARC-004: no _dmarc TXT record present. Publish p=quarantine with rua reporting to begin monitoring spoofing attempts.',
    'QX-SPF-002: SPF terminates in ~all (soft-fail). Consider -all once all legitimate senders are enumerated.',
  ],
};

export function ReportsScreen() {
  const toast = useToast();
  const [tab, setTab] = useState<'owner' | 'technical'>('owner');

  return (
    <div className="flex flex-col gap-5">
      <ScreenHeader
        title="Reports"
        caption="Generated after every completed scan · kept for 12 months"
        actions={
          <>
            <GhostButton
              onClick={() => {
                toast('Delivery scheduling — coming soon.');
              }}
            >
              Schedule delivery
            </GhostButton>
            <PrimaryButton
              onClick={() => {
                toast('Generating report…');
              }}
            >
              Generate report
            </PrimaryButton>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <PanelTitle>Latest report · 29 July 2026</PanelTitle>
              <span className="text-body-sm text-content-muted">
                Weekly scan · 12 pages · both audiences included
              </span>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-inset p-1">
              {(['owner', 'technical'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={tab === t}
                  onClick={() => {
                    setTab(t);
                  }}
                  className={cn(
                    'h-8 rounded-md px-3 text-caption font-semibold capitalize transition-colors',
                    tab === t
                      ? 'bg-surface text-content-primary shadow-2xs'
                      : 'text-content-secondary hover:text-content-primary',
                  )}
                >
                  {t === 'owner' ? 'For owners' : 'Technical'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3.5 rounded-2xl border border-border bg-surface-inset p-5">
            <span className="font-display text-h4 text-content-primary">
              {tab === 'owner' ? 'Executive summary' : 'Technical appendix'}
            </span>
            {AUDIENCE[tab].map((p) => (
              <p key={p} className="text-body-md leading-relaxed text-content-secondary">
                {p}
              </p>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <PrimaryButton
              onClick={() => {
                toast('Preparing PDF export…');
              }}
            >
              Export PDF
            </PrimaryButton>
            <GhostButton
              onClick={() => {
                toast('Emailing report to accountant…');
              }}
            >
              Email to accountant
            </GhostButton>
            <span className="text-caption text-content-muted">PDF is ~1.2 MB</span>
          </div>
        </Panel>

        <Panel className="flex flex-col gap-3">
          <PanelTitle>Archive</PanelTitle>
          <div className="flex flex-col">
            {ARCHIVE.map((r) => (
              <div
                key={r.date}
                className="flex items-center gap-3 border-t border-border/60 py-2.5 first:border-0"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-body-sm font-medium text-content-primary">{r.date}</span>
                  <span className="text-caption text-content-muted">{r.meta}</span>
                </div>
                <button
                  type="button"
                  aria-label={`Download report from ${r.date}`}
                  onClick={() => {
                    toast(`Downloading report · ${r.date}`);
                  }}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border text-content-secondary transition-colors hover:bg-surface-inset hover:text-content-primary"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
