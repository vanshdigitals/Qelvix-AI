import { Reveal } from '@/components/marketing/Reveal';
import { Eyebrow } from '@/components/marketing/primitives';
import { PROBLEMS } from '@/lib/data/landing';

export function Problem() {
  return (
    <section
      id="problem"
      aria-labelledby="problem-heading"
      className="bg-canvas px-5 py-16 md:px-page-margin md:py-20"
    >
      <div className="mx-auto max-w-marketing">
        <Reveal>
          <div className="flex flex-col items-start gap-2">
            <Eyebrow>The reality</Eyebrow>
            <h2
              id="problem-heading"
              className="mt-2 max-w-[20ch] font-display text-h2 tracking-tight text-content-primary md:text-display-lg"
            >
              You already suspect this
            </h2>
            <p className="max-w-measure text-body-md text-content-secondary leading-relaxed">
              Four critical attack surface blind spots most business owners feel but haven&rsquo;t been able to monitor.
            </p>
          </div>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
          {PROBLEMS.map((problem, index) => (
            <Reveal key={problem.id} index={index} delayStep={0.06}>
              <div className="group relative flex flex-col justify-between rounded-xl border border-border/80 bg-surface p-6 shadow-2xs transition-colors duration-200 hover:border-border-strong hover:bg-surface-inset">
                <div className="flex items-center justify-between">
                  <span
                    aria-hidden
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-surface-inset px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-content-secondary"
                  >
                    <span className="h-1 w-1 rounded-full bg-accent" />
                    Blind Spot 0{index + 1}
                  </span>
                  <span className="font-mono text-caption uppercase tracking-wider text-content-muted">
                    {problem.id}
                  </span>
                </div>
                <p className="mt-4 font-display text-h3 leading-snug tracking-tight text-content-primary">
                  {problem.statement}
                </p>
                <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-3 text-caption font-medium text-content-muted">
                  <span>Continuous monitoring required</span>
                  <span className="font-mono text-accent">Unverified →</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}


