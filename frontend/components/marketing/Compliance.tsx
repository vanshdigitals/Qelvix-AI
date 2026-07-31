import { Reveal } from '@/components/marketing/Reveal';
import { Eyebrow } from '@/components/marketing/primitives';
import { COMPLIANCE_INDICATORS } from '@/lib/data/landing';
import { cn } from '@/lib/utils/cn';

const STATE_STYLES = {
  success: 'bg-success-bg text-success-text',
  medium: 'bg-medium-bg text-medium-text',
  critical: 'bg-critical-bg text-critical-text',
} as const;

const STATE_DOT = {
  success: 'bg-success-text',
  medium: 'bg-medium-text',
  critical: 'bg-critical-text',
} as const;

export function Compliance() {
  return (
    <section
      id="compliance"
      aria-labelledby="compliance-heading"
      className="scroll-mt-20 bg-canvas px-5 py-16 md:px-page-margin md:py-20"
    >
      <div className="mx-auto grid max-w-marketing grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center lg:gap-12">
        <div className="lg:col-span-6">
          <Reveal>
            <Eyebrow>DPDP readiness</Eyebrow>
            <h2
              id="compliance-heading"
              className="mt-3 max-w-[16ch] font-display text-h2 tracking-tight text-content-primary md:text-display-lg"
            >
              Where you stand on the DPDP Act
            </h2>
            <p className="mt-3 max-w-measure text-body-md leading-relaxed text-content-secondary">
              India&rsquo;s Digital Personal Data Protection Act expects specific compliance
              practices of any business handling customer data. Qelvix verifies externally visible
              indicators so you know what to resolve first.
            </p>
            <p className="mt-3 max-w-measure text-caption leading-relaxed text-content-muted">
              Readiness indicators evaluate public configurations against DPDP expectations. They do
              not constitute formal legal certification.
            </p>
          </Reveal>
        </div>

        <div className="lg:col-span-6">
          <Reveal index={1}>
            <div className="overflow-hidden rounded-xl border border-border/80 bg-surface shadow-xs ring-1 ring-black/5">
              {/* Trust Center Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-inset px-6 py-4">
                <div className="flex items-center gap-2.5">
                  <span aria-hidden className="inline-flex h-2 w-2 rounded-full bg-accent" />
                  <span className="tabular-nums text-[11px] font-semibold uppercase tracking-wider text-content-primary">
                    DPDP Compliance Trust Center
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex rounded-full border border-border/60 bg-surface px-2.5 py-0.5 tabular-nums text-[11px] font-semibold text-content-secondary shadow-2xs">
                    {COMPLIANCE_INDICATORS.filter((i) => i.state === 'success').length} /{' '}
                    {COMPLIANCE_INDICATORS.length} Ready
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-medium-bg px-2.5 py-0.5 tabular-nums text-[11px] font-semibold text-medium-text">
                    Action Needed
                  </span>
                </div>
              </div>

              {/* 2x2 Audit Evidence Cards Grid */}
              <div className="grid grid-cols-1 gap-px bg-border/60 sm:grid-cols-2">
                {COMPLIANCE_INDICATORS.map((indicator, idx) => {
                  const methods = [
                    'Automated TLS handshake & cert audit',
                    'Public privacy policy page crawler',
                    'Data retention metadata verification',
                    'Incident response contact validation',
                  ];
                  return (
                    <div
                      key={indicator.id}
                      className="group flex flex-col justify-between bg-surface p-5 transition-colors duration-200 hover:bg-surface-inset"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="tabular-nums text-caption uppercase tracking-wider text-content-muted">
                            Check 0{idx + 1} {'//'} {indicator.id}
                          </span>
                          <span
                            className={cn(
                              'border-current/15 inline-flex shrink-0 items-center gap-1 rounded-[3px] border px-1.5 py-0.5 tabular-nums text-[10px] font-semibold uppercase leading-none tracking-wider',
                              STATE_STYLES[indicator.state],
                            )}
                          >
                            <span
                              aria-hidden
                              className={cn('h-1 w-1 rounded-full', STATE_DOT[indicator.state])}
                            />
                            {indicator.stateLabel}
                          </span>
                        </div>
                        <p className="mt-3 font-display text-body-lg font-semibold text-content-primary">
                          {indicator.label}
                        </p>
                        <p className="mt-1 tabular-nums text-caption text-content-secondary">
                          {methods[idx]}
                        </p>
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-2.5 tabular-nums text-caption text-content-muted">
                        <span>Check Cadence</span>
                        <span className="text-content-secondary">Continuous weekly</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Trust Center Footer */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface-inset px-6 py-3 tabular-nums text-caption text-content-muted">
                <span>Aligned with Digital Personal Data Protection Act (2023)</span>
                <span className="text-accent">Audit verification enabled →</span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
