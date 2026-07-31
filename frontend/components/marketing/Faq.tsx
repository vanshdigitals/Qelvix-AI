'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { Reveal } from '@/components/marketing/Reveal';
import { Eyebrow } from '@/components/marketing/primitives';
import { FAQS } from '@/lib/data/landing';
import { EASE_OUT } from '@/lib/motion/tokens';
import { cn } from '@/lib/utils/cn';

export function Faq() {
  const [open, setOpen] = useState<readonly string[]>([]);
  const reduceMotion = useReducedMotion();

  function toggle(id: string): void {
    setOpen((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );
  }

  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="scroll-mt-20 bg-canvas px-5 py-16 md:px-page-margin md:py-20"
    >
      <div className="mx-auto max-w-4xl">
        <Reveal>
          <div className="flex flex-col items-center text-center">
            <Eyebrow>Frequently asked questions</Eyebrow>
            <h2
              id="faq-heading"
              className="mt-3 font-display text-h2 tracking-tight text-content-primary md:text-display-lg"
            >
              Everything you need to know
            </h2>
            <p className="mt-2 max-w-measure-centered text-body-md text-content-secondary">
              Common questions about scanning safety, privacy, alerting, and DPDP readiness.
            </p>
          </div>
        </Reveal>

        <div className="mt-8 md:mt-10">
          <ul className="flex flex-col gap-3">
            {FAQS.map((faq, index) => {
              const isOpen = open.includes(faq.id);
              return (
                <Reveal as="li" key={faq.id} index={index} delayStep={0.04}>
                  <div
                    className={cn(
                      'overflow-hidden rounded-xl border bg-surface transition-all duration-200 ease-out hover:border-border-strong',
                      isOpen ? 'border-border-strong shadow-2xs' : 'border-border/80',
                    )}
                  >
                    <h3>
                      <button
                        type="button"
                        onClick={() => {
                          toggle(faq.id);
                        }}
                        aria-expanded={isOpen}
                        aria-controls={`faq-panel-${faq.id}`}
                        id={`faq-trigger-${faq.id}`}
                        className="flex min-h-[44px] w-full items-center justify-between gap-4 px-4 py-3.5 text-left md:px-5"
                      >
                        <span className="flex items-center gap-3 text-body-md font-semibold tracking-tight text-content-primary">
                          <span className="tabular-nums text-caption font-semibold text-accent/80">
                            0{index + 1}
                          </span>
                          <span>{faq.question}</span>
                        </span>
                        <motion.span
                          aria-hidden
                          animate={{ rotate: isOpen ? 180 : 0 }}
                          transition={{ duration: reduceMotion ? 0.12 : 0.2, ease: EASE_OUT }}
                          className="shrink-0 text-content-muted"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </motion.span>
                      </button>
                    </h3>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          id={`faq-panel-${faq.id}`}
                          role="region"
                          aria-labelledby={`faq-trigger-${faq.id}`}
                          initial={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                          animate={reduceMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
                          exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                          transition={{ duration: reduceMotion ? 0.12 : 0.2, ease: EASE_OUT }}
                          className="overflow-hidden"
                        >
                          <div className="mx-4 border-t border-border/40 pb-4 pt-3 md:mx-5">
                            <p className="text-body-sm leading-relaxed text-content-secondary">
                              {faq.answer}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </Reveal>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
