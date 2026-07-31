'use client';

import { useToast } from '@/components/dashboard/AppShell';
import {
  GhostButton,
  Panel,
  PanelTitle,
  PrimaryButton,
  ScreenHeader,
  TableWrap,
  Th,
} from '@/components/dashboard/shared';
import { INVOICES } from '@/lib/data/dashboard';
import { cn } from '@/lib/utils/cn';

const USAGE = [
  { label: 'Domains', value: '2 of 2', pct: '100%', warn: true },
  { label: 'Seats', value: '3 of 5', pct: '60%', warn: false },
  { label: 'Manual scans this month', value: '3 of 4', pct: '75%', warn: false },
];

const BILLING_META = [
  { label: 'Legal name', value: 'Vardhman Exports Pvt Ltd' },
  { label: 'GSTIN', value: '07AABCV1234F1Z5', mono: true },
  { label: 'Billing email', value: 'accounts@vardhmanexports.in', mono: true },
  { label: 'Address', value: 'Karol Bagh, New Delhi 110005' },
];

export function BillingScreen() {
  const toast = useToast();

  return (
    <div className="flex flex-col gap-5">
      <ScreenHeader
        title="Billing"
        caption="Invoiced in INR · GST charged at 18% · next charge 1 August 2026"
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-5">
          <Panel className="flex flex-col gap-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <PanelTitle>Starter plan</PanelTitle>
                <span className="text-body-sm text-content-muted">
                  Weekly scans · 2 domains · 5 seats · 12-month retention
                </span>
              </div>
              <span className="flex items-baseline gap-1">
                <span className="tabular-nums text-[28px] font-medium leading-none text-content-primary">
                  ₹2,499
                </span>
                <span className="text-body-sm text-content-muted">/ month</span>
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {USAGE.map((u) => (
                <div key={u.label} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-body-sm text-content-secondary">{u.label}</span>
                    <span
                      className={cn(
                        'tabular-nums text-body-sm',
                        u.warn ? 'text-high-text' : 'text-content-primary',
                      )}
                    >
                      {u.value}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-inset">
                    <span
                      className={cn(
                        'block h-full rounded-full',
                        u.warn ? 'bg-high-text' : 'bg-accent',
                      )}
                      style={{ width: u.pct }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <PrimaryButton
                onClick={() => {
                  toast('Upgrade flow — coming soon.');
                }}
              >
                Upgrade to Growth
              </PrimaryButton>
              <GhostButton
                onClick={() => {
                  toast('Plan cancellation — contact support.');
                }}
              >
                Cancel plan
              </GhostButton>
            </div>
          </Panel>

          <TableWrap>
            <div className="px-5 pb-3 pt-5">
              <PanelTitle>Invoices</PanelTitle>
            </div>
            <table className="w-full min-w-[560px] border-collapse text-body-sm">
              <thead>
                <tr className="bg-surface-inset">
                  <Th>Invoice</Th>
                  <Th>Date</Th>
                  <Th>Amount</Th>
                  <Th>Status</Th>
                  <Th align="right" />
                </tr>
              </thead>
              <tbody>
                {INVOICES.map((iv) => (
                  <tr key={iv.id} className="border-t border-border/60">
                    <td className="whitespace-nowrap px-3 py-3 pl-4 tabular-nums text-caption text-content-primary">
                      {iv.id}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-content-secondary">
                      {iv.date}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 tabular-nums text-content-primary">
                      {iv.amount}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5',
                          iv.status === 'Paid' ? 'text-success-text' : 'text-high-text',
                        )}
                      >
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            iv.status === 'Paid' ? 'bg-success-text' : 'bg-high-text',
                          )}
                        />
                        {iv.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 pr-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          toast(`Downloading ${iv.id}.pdf`);
                        }}
                        className="text-body-sm font-medium text-accent"
                      >
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </div>

        <div className="flex flex-col gap-5">
          <Panel className="flex flex-col gap-3.5">
            <PanelTitle>Payment method</PanelTitle>
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-inset p-3.5">
              <span className="font-heading grid h-6 w-9 shrink-0 place-items-center rounded bg-surface text-[10px] font-bold text-content-primary">
                HDFC
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="tabular-nums text-body-sm text-content-primary">
                  •••• •••• •••• 4821
                </span>
                <span className="text-caption text-content-muted">
                  Expires 09/28 · autopay enabled
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                toast('Card update — coming soon.');
              }}
              className="self-start text-body-sm font-medium text-accent"
            >
              Update card
            </button>
          </Panel>

          <Panel>
            <PanelTitle>Billing details</PanelTitle>
            <div className="mt-2 flex flex-col">
              {BILLING_META.map((b) => (
                <div
                  key={b.label}
                  className="flex items-baseline justify-between gap-3 border-t border-border/60 py-2.5 text-body-sm"
                >
                  <span className="shrink-0 text-content-secondary">{b.label}</span>
                  <span
                    className={`break-words text-right font-medium text-content-primary ${b.mono ? 'tabular-nums text-caption' : ''}`}
                  >
                    {b.value}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
