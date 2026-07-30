'use client';

import Link from 'next/link';
import { useState } from 'react';

import { useToast } from '@/components/dashboard/AppShell';
import { Panel, PanelTitle, PrimaryButton, ScreenHeader } from '@/components/dashboard/shared';
import { cn } from '@/lib/utils/cn';

const TABS = [
  { label: 'Organisation', href: '/settings', active: true },
  { label: 'Notifications', href: '/notifications', active: false },
  { label: 'Profile', href: '/profile', active: false },
];

const FIELDS = [
  {
    id: 'org-name',
    label: 'Legal name',
    value: 'Vardhman Exports Pvt Ltd',
    hint: 'Shown on every shared report',
  },
  {
    id: 'org-site',
    label: 'Primary domain',
    value: 'vardhmanexports.in',
    hint: 'Verified via DNS TXT',
    mono: true,
  },
  {
    id: 'org-contact',
    label: 'Security contact',
    value: 'priya@vardhmanexports.in',
    hint: 'Receives critical alerts',
    mono: true,
  },
  {
    id: 'org-phone',
    label: 'WhatsApp number',
    value: '+91 98••• •••21',
    hint: 'For real-time alerts',
    mono: true,
  },
];

export function SettingsScreen() {
  const toast = useToast();
  const [values, setValues] = useState(() =>
    Object.fromEntries(FIELDS.map((f) => [f.id, f.value])),
  );

  return (
    <div className="flex flex-col gap-5">
      <ScreenHeader
        title="Organisation"
        caption="Appears on every report you share outside the company"
      />

      <div className="flex flex-wrap items-center gap-1 self-start rounded-lg border border-border bg-surface-inset p-1">
        {TABS.map((t) =>
          t.active ? (
            <span
              key={t.label}
              aria-current="page"
              className="h-8 rounded-md bg-surface px-3 text-body-sm font-semibold leading-8 text-content-primary shadow-2xs"
            >
              {t.label}
            </span>
          ) : (
            <Link
              key={t.label}
              href={t.href}
              className="h-8 rounded-md px-3 text-body-sm font-semibold leading-8 text-content-secondary transition-colors hover:text-content-primary"
            >
              {t.label}
            </Link>
          ),
        )}
      </div>

      <div className="flex max-w-2xl flex-col gap-5">
        <Panel className="flex flex-col gap-5">
          <PanelTitle>Business details</PanelTitle>
          {FIELDS.map((f) => (
            <div key={f.id} className="flex flex-col gap-2">
              <label htmlFor={f.id} className="text-body-sm font-medium text-content-secondary">
                {f.label}
              </label>
              <input
                id={f.id}
                type="text"
                value={values[f.id]}
                onChange={(e) => {
                  setValues((prev) => ({ ...prev, [f.id]: e.target.value }));
                }}
                className={cn(
                  'h-11 w-full rounded-xl border border-border-strong bg-surface-inset px-3.5 text-body-md text-content-primary outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent',
                  f.mono && 'font-mono text-body-sm',
                )}
              />
              <span className="text-caption text-content-muted">{f.hint}</span>
            </div>
          ))}
          <div className="flex items-center gap-3">
            <PrimaryButton
              onClick={() => {
                toast('Organisation details saved.');
              }}
            >
              Save changes
            </PrimaryButton>
            <span className="text-caption text-content-muted">Changes apply to new reports</span>
          </div>
        </Panel>

        <div className="border-critical-text/40 flex flex-col gap-4 rounded-2xl border bg-surface p-6 shadow-xs">
          <PanelTitle>Delete organisation</PanelTitle>
          <p className="text-body-sm leading-relaxed text-content-secondary">
            Removes every asset, finding, report and audit record for Vardhman Exports. Team members
            lose access immediately. This cannot be undone and support cannot restore it.
          </p>
          <button
            type="button"
            onClick={() => {
              toast('Deleting the organisation requires email confirmation.');
            }}
            className="border-critical-text/40 inline-flex h-10 items-center justify-center self-start rounded-lg border px-4 text-body-sm font-semibold text-critical-text transition-colors hover:bg-critical-bg"
          >
            Delete organisation
          </button>
        </div>
      </div>
    </div>
  );
}
