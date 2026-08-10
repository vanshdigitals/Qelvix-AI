'use client';

import { LifeBuoy } from 'lucide-react';

import { Panel, PanelTitle, ScreenHeader } from '@/components/dashboard/shared';

// Factual guidance about the current product only — no invented capabilities.
const TOPICS = [
  {
    q: 'Onboarding & domain verification',
    a: 'During onboarding you enter your business details and the domain you want monitored. Qelvix generates a DNS TXT record; add it at your DNS provider, then verify. We only scan domains you have proven you own.',
  },
  {
    q: 'Running a scan',
    a: 'From the Dashboard or the Scans page, click “Run scan now”. The scan moves through Queued → Running → Completed and typically finishes in a couple of minutes.',
  },
  {
    q: 'Understanding findings & risk score',
    a: 'Findings come from deterministic checks (DNS, SSL/TLS, email authentication, and more), each with a severity. The risk score is calculated from those findings — a lower score means higher risk.',
  },
  {
    q: 'Reports & DPDP readiness',
    a: 'Every completed scan produces a report with its findings, recommendations derived from those findings, and a DPDP readiness status. Open a scan to see its full report.',
  },
  {
    q: 'Free-tier limitations',
    a: 'Qelvix currently runs on free-tier providers. Some checks (for example exposed-service discovery) may be limited or unavailable; when a provider is unavailable it is shown honestly as degraded rather than faked. The deterministic DNS/SSL checks always run.',
  },
];

export function HelpScreen() {
  return (
    <div className="flex flex-col gap-5">
      <ScreenHeader title="Help center" caption="How Qelvix works." />

      <Panel className="flex items-center gap-3">
        <LifeBuoy className="h-5 w-5 shrink-0 text-content-muted" />
        <p className="text-body-sm text-content-secondary">
          Quick guidance for the current MVP. More documentation is on the way.
        </p>
      </Panel>

      <div className="flex flex-col gap-3">
        {TOPICS.map((t) => (
          <Panel key={t.q} className="flex flex-col gap-1.5">
            <PanelTitle>{t.q}</PanelTitle>
            <p className="text-body-sm leading-relaxed text-content-secondary">{t.a}</p>
          </Panel>
        ))}
      </div>
    </div>
  );
}
