import { Check } from 'lucide-react';
import Link from 'next/link';

import { Reveal } from '@/components/marketing/Reveal';
import { Eyebrow, GridBackdrop } from '@/components/marketing/primitives';
import { PRICING_TIERS } from '@/lib/data/landing';
import { cn } from '@/lib/utils/cn';

export function Pricing() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="relative scroll-mt-20 overflow-hidden border-y border-border bg-surface px-5 py-16 md:px-page-margin md:py-20"
    >
      <GridBackdrop pattern="dots" glow="top" />
      <div className="relative mx-auto max-w-marketing">
        <div className="max-w-2xl">
          <Reveal>
            <Eyebrow>Pricing</Eyebrow>
            <h2
              id="pricing-heading"
              className="mt-3 font-display text-h2 tracking-tight text-content-primary md:text-display-lg"
            >
              Start free, upgrade when it earns it
            </h2>
          </Reveal>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:mt-12 lg:grid-cols-3 lg:items-stretch">
          {PRICING_TIERS.map((tier, idx) => {
            const slas = [
              'Monthly automated check',
              'Weekly sweep + WhatsApp',
              'Continuous 24/7 SLA',
            ];
            return (
              <Reveal key={tier.id} index={idx} className="sm:first:col-span-2 lg:first:col-span-1">
                <div
                  className={cn(
                    'group relative flex h-full flex-col justify-between rounded-2xl p-7 transition-colors duration-200',
                    tier.recommended
                      ? 'border border-accent bg-surface shadow-sm ring-1 ring-accent/15'
                      : 'border border-border/80 bg-surface shadow-xs hover:border-border-strong',
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-border/50 pb-4">
                      <span className="tabular-nums text-caption font-semibold uppercase tracking-wider text-accent">
                        Tier 0{idx + 1} {'//'} {tier.name}
                      </span>
                      {tier.recommended ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-0.5 tabular-nums text-[10px] font-bold uppercase tracking-wider text-accent">
                          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
                          Most Chosen
                        </span>
                      ) : (
                        <span className="tabular-nums text-[11px] text-content-muted">
                          {tier.cadence}
                        </span>
                      )}
                    </div>

                    <div className="mt-6 flex items-baseline gap-2">
                      <span className="tabular font-display text-[2.75rem] font-bold leading-none tracking-tight text-content-primary">
                        {tier.price}
                      </span>
                      <span className="tabular-nums text-caption font-medium text-content-secondary">
                        {tier.cadence}
                      </span>
                    </div>

                    <p className="mt-2 text-body-sm leading-relaxed text-content-secondary">
                      {tier.summary}
                    </p>

                    <div className="my-6 h-px w-full bg-border/60" />

                    <p className="tabular-nums text-[11px] font-semibold uppercase tracking-wider text-content-muted">
                      Included Capabilities:
                    </p>

                    <ul className="mt-4 flex flex-col gap-3">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2.5">
                          <span
                            aria-hidden
                            className="border-success-text/20 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border bg-success-bg"
                          >
                            <Check className="h-2.5 w-2.5 text-success-text" />
                          </span>
                          <span className="text-body-sm font-medium text-content-primary">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <Link
                      href={`/signup?plan=${tier.id}`}
                      className={cn(
                        'mt-8 flex h-10 w-full items-center justify-center rounded-lg text-body-sm font-semibold transition-colors duration-200',
                        tier.recommended
                          ? 'bg-accent text-white hover:bg-accent/90'
                          : 'border border-border-strong bg-surface-inset text-content-primary hover:bg-surface',
                      )}
                    >
                      {tier.id === 'free' ? 'Start free monitoring' : `Deploy ${tier.name} tier`}
                    </Link>

                    <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3 tabular-nums text-caption text-content-muted">
                      <span>Service Level</span>
                      <span className="text-content-secondary">{slas[idx]}</span>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal index={1}>
          <p className="mt-6 text-caption text-content-secondary">
            All prices exclude GST.{' '}
            <Link href="/pricing" className="font-medium text-accent underline underline-offset-2">
              See full comparison
            </Link>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
