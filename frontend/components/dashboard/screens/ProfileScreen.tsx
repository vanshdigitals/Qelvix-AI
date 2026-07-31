'use client';

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

const FIELDS = [
  { id: 'p-name', label: 'Full name', value: 'Priya Sharma' },
  { id: 'p-email', label: 'Email', value: 'priya@vardhmanexports.in', locked: true, mono: true },
  { id: 'p-title', label: 'Job title', value: 'Founder' },
];

const SESSIONS = [
  { device: 'MacBook Pro · Chrome', meta: 'New Delhi · this device', current: true },
  { device: 'iPhone 15 · Safari', meta: 'New Delhi · 2h ago', current: false },
  { device: 'Windows · Edge', meta: 'Mumbai · 6d ago', current: false },
];

export function ProfileScreen() {
  const toast = useToast();
  const [values, setValues] = useState(() =>
    Object.fromEntries(FIELDS.map((f) => [f.id, f.value])),
  );

  return (
    <div className="flex flex-col gap-5">
      <ScreenHeader title="Profile" caption="Your account, not the organisation's" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-border bg-surface-inset font-display text-h4 font-semibold text-content-primary">
              PS
            </span>
            <div className="flex flex-col gap-1">
              <span className="font-display text-h3 text-content-primary">Priya Sharma</span>
              <span className="text-body-sm text-content-muted">
                Owner · signed up 12 July 2026
              </span>
            </div>
          </div>
          {FIELDS.map((f) => (
            <div key={f.id} className="flex flex-col gap-2">
              <label htmlFor={f.id} className="text-body-sm font-medium text-content-secondary">
                {f.label}
              </label>
              <input
                id={f.id}
                type="text"
                value={values[f.id]}
                disabled={f.locked}
                onChange={(e) => {
                  setValues((prev) => ({ ...prev, [f.id]: e.target.value }));
                }}
                className={cn(
                  'h-11 w-full rounded-xl border border-border-strong bg-surface-inset px-3.5 text-body-md text-content-primary outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-60',
                  f.mono && 'tabular-nums text-body-sm',
                )}
              />
              {f.locked && (
                <span className="text-caption text-content-muted">
                  Email is managed through your login and can&apos;t be changed here.
                </span>
              )}
            </div>
          ))}
          <PrimaryButton
            onClick={() => {
              toast('Profile saved.');
            }}
          >
            Save profile
          </PrimaryButton>
        </Panel>

        <div className="flex flex-col gap-5">
          <Panel className="flex flex-col gap-3.5">
            <PanelTitle>Two-factor authentication</PanelTitle>
            <div className="flex items-center gap-3">
              <span className="inline-flex flex-1 items-center gap-1.5 text-body-sm text-success-text">
                <span className="h-1.5 w-1.5 rounded-full bg-success-text" />
                Enabled · authenticator app
              </span>
              <GhostButton
                onClick={() => {
                  toast('2FA management — coming soon.');
                }}
              >
                Manage
              </GhostButton>
            </div>
          </Panel>

          <Panel className="flex flex-col gap-3">
            <PanelTitle>Active sessions</PanelTitle>
            <div className="flex flex-col">
              {SESSIONS.map((s) => (
                <div
                  key={s.device}
                  className="flex items-center gap-3 border-t border-border/60 py-2.5 first:border-0"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-body-sm font-medium text-content-primary">
                      {s.device}
                    </span>
                    <span className="text-caption text-content-muted">{s.meta}</span>
                  </div>
                  {s.current ? (
                    <span className="shrink-0 text-caption font-medium text-success-text">
                      This device
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        toast(`Revoked session · ${s.device}`);
                      }}
                      className="inline-flex h-7 shrink-0 items-center rounded-lg border border-border px-2.5 text-caption font-semibold text-critical-text transition-colors hover:bg-critical-bg"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
