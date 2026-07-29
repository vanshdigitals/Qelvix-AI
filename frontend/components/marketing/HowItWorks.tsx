import { BellRing, Globe, Radar, ShieldCheck } from 'lucide-react';

import { Reveal } from '@/components/marketing/Reveal';
import { SectionHeader } from '@/components/marketing/primitives';
import { WORKFLOW_STEPS } from '@/lib/data/landing';

const ICONS = [Globe, ShieldCheck, Radar, BellRing] as const;

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="scroll-mt-20 bg-canvas px-5 py-16 md:px-page-margin md:py-20"
    >
      <div className="mx-auto max-w-marketing">
        <Reveal>
          <SectionHeader
            eyebrow="How it works"
            headingId="how-it-works-heading"
            heading="From domain to plain-language alert"
            lede="Four transparent steps from initial scan to actionable remediation."
          />
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {WORKFLOW_STEPS.map((step, index) => {
            const Icon = ICONS[index % ICONS.length] ?? Globe;
            const stepMetrics = ['SLA: < 60s', 'Automated DNS TXT', '7 Engine Sweep', 'WhatsApp & Email'];
            return (
              <Reveal key={step.id} index={index} delayStep={0.06}>
                <div className="group relative flex h-full flex-col justify-between rounded-xl border border-border/80 bg-surface p-6 shadow-2xs transition-colors duration-200 hover:border-border-strong hover:bg-surface-inset">
                  <div>
                    <div className="flex items-center justify-between border-b border-border/50 pb-3">
                      <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-content-muted">
                        Step 0{index + 1} {'//'} {step.id}
                      </span>
                      <span className="flex h-8 w-8 items-center justify-center rounded-md border border-border/60 bg-surface-inset">
                        <Icon className="h-4 w-4 text-accent" aria-hidden />
                      </span>
                    </div>
                    <h3 className="mt-4 font-display text-h4 font-semibold tracking-tight text-content-primary">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-body-sm leading-relaxed text-content-secondary">
                      {step.description}
                    </p>
                  </div>
                  <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-3 font-mono text-caption text-content-muted">
                    <span>Execution</span>
                    <span className="font-semibold text-content-secondary">{stepMetrics[index]}</span>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}


