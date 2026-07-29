'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

import { Reveal } from '@/components/marketing/Reveal';
import { Eyebrow, GridBackdrop, SectionHeader } from '@/components/marketing/primitives';
import { AGENT_PHASES, DATA_SOURCES, DEMO_SCAN, RULE_EVIDENCE } from '@/lib/data/landing';

// Single accent hue only (05 §3.1 — Signal Cyan is the product's one accent;
// severity colours are reserved). Outputs describe the MVP pipeline truthfully:
// no port scanning or vulnerability proofs, which are Phase 2 (09 F16).
const PHASE_OUTPUTS = [
  'Asset inventory',
  'Findings & severity',
  'Weighted risk score',
  'Plain-language report',
] as const;

export function Architecture() {
  const [copied, setCopied] = useState(false);
  const finding = DEMO_SCAN.findings[0];

  function copyEvidence(): void {
    void navigator.clipboard.writeText(RULE_EVIDENCE);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  return (
    <section
      id="architecture"
      aria-labelledby="architecture-heading"
      className="relative scroll-mt-20 overflow-hidden border-y border-border bg-surface-inset px-5 py-16 md:px-page-margin md:py-20"
    >
      <GridBackdrop pattern="lines" glow="center" />
      <div className="relative mx-auto max-w-marketing">
        {/* Guarantee Section */}
        <Reveal>
          <SectionHeader
            align="center"
            eyebrow="The guarantee"
            headingId="architecture-heading"
            heading="Your risk score is never decided by AI guesswork"
            lede="Findings and severity come from fixed, auditable rules. AI is used for one thing only: explaining results in plain language."
            className="mx-auto items-center"
          />
        </Reveal>

        {/* Code Proof Box */}
        <Reveal index={1}>
          <div className="relative mt-8 lg:mt-12">
            <div className="overflow-hidden rounded-xl border border-border/80 bg-surface shadow-xs">
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="border-b border-border/80 bg-surface-inset p-4.5 lg:border-b-0 lg:border-r lg:p-6">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-caption font-semibold uppercase tracking-[0.06em] text-content-secondary">
                      <span aria-hidden className="h-1 w-1 rounded-full bg-content-muted" />
                      Deterministic Rule Engine
                    </span>
                    <button
                      type="button"
                      onClick={copyEvidence}
                      className="inline-flex items-center gap-1 rounded bg-surface px-2 py-1 text-[11px] font-medium text-content-secondary border border-border/80 hover:text-content-primary transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3 w-3 text-success-text" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy JSON</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre
                    aria-label="Deterministic rule output"
                    className="mt-3 whitespace-pre-wrap break-words rounded-lg border border-border/80 bg-canvas p-3.5 font-mono text-[11px] sm:text-xs leading-relaxed text-content-primary overflow-hidden"
                  >
                    <code>{RULE_EVIDENCE}</code>
                  </pre>
                </div>

                <div className="p-4.5 lg:p-6 flex flex-col justify-between">
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-caption font-semibold uppercase tracking-[0.06em] text-accent">
                      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
                      Plain Language Explanation
                    </span>
                    <p className="mt-3 text-body-md leading-relaxed text-content-secondary">
                      {finding?.explanation}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-caption text-content-muted">
                    <span>Evaluated by Rule Engine</span>
                    <span>100% Deterministic</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Pipeline Section */}
        <div className="mt-14 lg:mt-16">
          <Reveal>
            <div className="flex flex-col items-start gap-1">
              <Eyebrow>The pipeline</Eyebrow>
              <h3 className="mt-2 font-display text-h3 tracking-tight font-semibold text-content-primary">
                Seven specialized agents across four phases
              </h3>
            </div>
          </Reveal>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:mt-10">
            {AGENT_PHASES.map((phase, index) => {
              const output = PHASE_OUTPUTS[index] ?? PHASE_OUTPUTS[0];
              const slas = ['< 15s Latency', '< 30s Scan', 'Realtime Calc', 'Instant Dispatch'];
              return (
                <Reveal key={phase.id} index={index} delayStep={0.06}>
                  <div className="group relative flex h-full flex-col justify-between rounded-xl border border-border/80 bg-surface p-6 shadow-2xs transition-colors duration-200 hover:border-accent/40 hover:bg-surface-inset">
                    <div>
                      <div className="flex items-center justify-between border-b border-border/50 pb-3">
                        <span className="font-mono text-caption font-semibold uppercase tracking-wider text-accent">
                          {phase.label}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-surface-inset px-2 py-0.5 font-mono text-[10px] font-semibold text-content-muted border border-border/60">
                          Phase 0{index + 1}
                        </span>
                      </div>
                      <ul className="mt-4 flex flex-col gap-2.5">
                        {phase.agents.map((agent) => (
                          <li
                            key={agent}
                            className="flex items-center gap-2.5 text-body-sm font-semibold text-content-primary"
                          >
                            <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                            {agent}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-6 flex flex-col gap-2 border-t border-border/50 pt-3 font-mono text-caption">
                      <div className="flex items-center justify-between text-content-muted">
                        <span>Output</span>
                        <span className="font-semibold text-content-secondary">{output}</span>
                      </div>
                      <div className="flex items-center justify-between text-content-muted">
                        <span>SLA</span>
                        <span className="text-accent">{slas[index]}</span>
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>

          <Reveal index={1}>
            <div className="mt-10 flex flex-wrap items-center gap-2.5 border-t border-border/60 pt-6">
              <span className="font-mono text-caption uppercase tracking-wider font-semibold text-content-secondary mr-2">
                Continuous Data Feeds:
              </span>
              {DATA_SOURCES.map((source) => (
                <span
                  key={source}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-surface px-3 py-1 font-mono text-caption font-semibold text-content-secondary shadow-2xs transition-all duration-200 hover:border-border-strong hover:text-content-primary"
                >
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-success-text" />
                  {source}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}


