import { Reveal } from '@/components/marketing/Reveal';
import { Eyebrow, GridBackdrop } from '@/components/marketing/primitives';
import { SOLUTIONS } from '@/lib/data/landing';

export function Solution() {
  return (
    <section
      id="solution"
      aria-labelledby="solution-heading"
      className="relative overflow-hidden border-y border-border bg-surface px-5 py-16 md:px-page-margin md:py-20"
    >
      <GridBackdrop pattern="dots" glow="top" />
      <div className="relative mx-auto max-w-marketing">
        <div className="max-w-2xl">
          <Reveal>
            <Eyebrow>The answer</Eyebrow>
            <h2
              id="solution-heading"
              className="mt-3 font-display text-h2 tracking-tight text-content-primary md:text-display-lg"
            >
              Here is what we do about it
            </h2>
          </Reveal>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SOLUTIONS.map((solution, index) => {
            const outcomes = [
              'Weekly continuous sweep',
              'DPDP Act aligned',
              'Zero jargon alerts',
              '24/7 DNS tracking',
            ];
            return (
              <Reveal key={solution.id} index={index}>
                <div className="group relative flex h-full flex-col justify-between rounded-xl border border-border/80 bg-surface p-6 shadow-2xs transition-colors duration-200 hover:border-accent/40 hover:bg-surface-inset">
                  <div>
                    <div className="flex items-center justify-between border-b border-border/50 pb-3">
                      <span className="font-mono text-caption font-semibold uppercase tracking-wider text-accent">
                        Cap. 0{index + 1}
                      </span>
                      <span
                        aria-hidden
                        className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-accent"
                      >
                        Automated
                      </span>
                    </div>
                    <h3 className="mt-4 font-display text-h4 font-semibold tracking-tight text-content-primary">
                      {solution.headline}
                    </h3>
                    <p className="mt-2 text-body-sm leading-relaxed text-content-secondary">
                      {solution.detail}
                    </p>
                  </div>
                  <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-3 font-mono text-caption text-content-muted">
                    <span>Outcome</span>
                    <span className="font-semibold text-content-secondary">{outcomes[index]}</span>
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
