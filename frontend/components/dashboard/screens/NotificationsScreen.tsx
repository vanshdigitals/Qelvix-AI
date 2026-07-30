'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Panel, PanelTitle, ScreenHeader } from '@/components/dashboard/shared';
import { cn } from '@/lib/utils/cn';

function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className={cn(
        'relative h-6 w-10 shrink-0 rounded-full transition-colors',
        on ? 'bg-accent' : 'bg-surface-inset',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-2xs transition-all',
          on ? 'left-[18px]' : 'left-0.5',
        )}
      />
    </button>
  );
}

const CHANNELS_INIT = [
  { key: 'email', label: 'Email', note: 'priya@vardhmanexports.in', on: true },
  { key: 'whatsapp', label: 'WhatsApp', note: '+91 98••• •••21', on: true },
  { key: 'slack', label: 'Slack', note: 'Not connected', on: false },
  { key: 'webhook', label: 'Webhook', note: 'POST to your endpoint', on: false },
];

const RULES_INIT = [
  {
    key: 'critical',
    label: 'Critical findings',
    note: 'Always notified, cannot be disabled',
    dot: 'bg-critical-text',
    forced: true,
    on: true,
  },
  {
    key: 'high',
    label: 'New high findings',
    note: 'As soon as a scan completes',
    dot: 'bg-high-text',
    forced: false,
    on: true,
  },
  {
    key: 'weekly',
    label: 'Weekly digest',
    note: 'Every Monday morning',
    dot: 'bg-accent',
    forced: false,
    on: true,
  },
  {
    key: 'resolved',
    label: 'Findings resolved',
    note: 'When a teammate closes an issue',
    dot: 'bg-success-text',
    forced: false,
    on: false,
  },
];

const DELIVERIES = [
  { text: 'Critical alert · SSL certificate expired', when: '06:05', dot: 'bg-critical-text' },
  { text: 'WhatsApp digest delivered', when: 'Mon 07:00', dot: 'bg-accent' },
  { text: 'Weekly email digest delivered', when: 'Mon 07:00', dot: 'bg-content-muted' },
  { text: 'High alert · breach corpus match', when: '3d', dot: 'bg-high-text' },
];

export function NotificationsScreen() {
  const [channels, setChannels] = useState(CHANNELS_INIT);
  const [rules, setRules] = useState(RULES_INIT);

  return (
    <div className="flex flex-col gap-5">
      <ScreenHeader
        title="Notifications"
        caption="Critical findings always notify. Everything below that is yours to tune."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-5">
          <Panel className="flex flex-col">
            <PanelTitle>Channels</PanelTitle>
            {channels.map((ch) => (
              <div
                key={ch.key}
                className="flex items-center gap-4 border-t border-border/60 py-3.5 first:mt-3 first:border-0"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-body-md font-medium text-content-primary">{ch.label}</span>
                  <span className="text-caption text-content-muted">{ch.note}</span>
                </div>
                <Toggle
                  on={ch.on}
                  label={ch.label}
                  onChange={() => {
                    setChannels((prev) =>
                      prev.map((c) => (c.key === ch.key ? { ...c, on: !c.on } : c)),
                    );
                  }}
                />
              </div>
            ))}
          </Panel>

          <Panel className="flex flex-col">
            <PanelTitle>Alert me about</PanelTitle>
            {rules.map((r) => (
              <div
                key={r.key}
                className="flex items-center gap-4 border-t border-border/60 py-3.5 first:mt-3 first:border-0"
              >
                <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', r.dot)} />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-body-md font-medium text-content-primary">{r.label}</span>
                  <span className="text-caption text-content-muted">{r.note}</span>
                </div>
                {r.forced ? (
                  <span className="shrink-0 rounded-full bg-surface-inset px-2.5 py-1 text-caption font-medium text-content-muted">
                    Always on
                  </span>
                ) : (
                  <Toggle
                    on={r.on}
                    label={r.label}
                    onChange={() => {
                      setRules((prev) =>
                        prev.map((x) => (x.key === r.key ? { ...x, on: !x.on } : x)),
                      );
                    }}
                  />
                )}
              </div>
            ))}
          </Panel>
        </div>

        <div className="flex flex-col gap-5">
          <Panel className="flex flex-col gap-2">
            <PanelTitle>Quiet hours</PanelTitle>
            <p className="text-body-sm leading-relaxed text-content-secondary">
              Non-critical alerts are held between 21:00 and 07:00 IST and delivered in the morning
              digest. Critical findings ignore quiet hours.
            </p>
            <Link href="/settings" className="text-body-sm font-medium text-accent">
              Change window
            </Link>
          </Panel>

          <Panel className="flex flex-col gap-3">
            <PanelTitle>Recent deliveries</PanelTitle>
            <div className="flex flex-col">
              {DELIVERIES.map((d) => (
                <div
                  key={d.text}
                  className="flex items-start gap-2.5 border-t border-border/60 py-2.5 first:border-0"
                >
                  <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', d.dot)} />
                  <span className="flex-1 text-body-sm text-content-secondary">{d.text}</span>
                  <span className="shrink-0 font-mono text-caption text-content-muted">
                    {d.when}
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
