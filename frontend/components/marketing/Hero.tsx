'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';

import { DomainScanInput } from '@/components/marketing/DomainScanInput';
import { GridBackdrop, Eyebrow } from '@/components/marketing/primitives';
import { SurfaceField, type SurfaceFieldState } from '@/components/marketing/SurfaceField';
import { EASE_OUT } from '@/lib/motion/tokens';

const REASSURANCES = [
  'No credit card required',
  'Results in under a minute',
  'DPDP compliance ready',
] as const;

export function Hero() {
  const [fieldState, setFieldState] = useState<SurfaceFieldState>('rest');
  const reduceMotion = useReducedMotion();

  const rise = (index: number) => ({
    initial: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: reduceMotion ? 0.12 : 0.5,
      ease: EASE_OUT,
      delay: reduceMotion ? 0 : index * 0.08,
    },
  });

  return (
    <section className="relative isolate flex items-center overflow-hidden pb-12 pt-10 md:pb-16 md:pt-14">
      {/* Background dot grid + subtle static surface field */}
      <GridBackdrop pattern="dots" glow="top" />
      <div className="absolute inset-0">
        <SurfaceField state={fieldState} />
      </div>

      <div className="relative mx-auto w-full max-w-marketing px-5 md:px-page-margin">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <motion.div {...rise(0)}>
            <Eyebrow>Continuous security for Indian businesses</Eyebrow>
          </motion.div>

          <motion.h1
            {...rise(1)}
            className="mt-6 max-w-[17ch] font-display text-[2.5rem] leading-[1.08] tracking-tight text-content-primary sm:text-[3.25rem] md:text-[3.75rem]"
          >
            Know what the internet knows about your business
          </motion.h1>

          <motion.p
            {...rise(2)}
            className="mt-5 max-w-[48ch] text-body-lg leading-relaxed text-content-secondary"
          >
            Qelvix scans your public footprint the way an attacker would, then explains findings in
            plain language. See your security risk score in under a minute.
          </motion.p>

          <motion.div {...rise(3)} className="relative mt-8 w-full max-w-[560px]">
            {/* The input renders its own frame — no wrapping plate (avoids the
                box-in-box nesting). */}
            <DomainScanInput
              accessibleName="Enter your domain to scan"
              submitLabel="Scan my business"
              onFieldStateChange={setFieldState}
            />
          </motion.div>

          <motion.ul
            {...rise(4)}
            className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-caption font-medium text-content-secondary"
          >
            {REASSURANCES.map((item, index) => (
              <li key={item} className="flex items-center gap-4">
                {index > 0 && (
                  <span aria-hidden className="h-1 w-1 rounded-full bg-border-strong" />
                )}
                <span>{item}</span>
              </li>
            ))}
          </motion.ul>

          <motion.a
            {...rise(5)}
            href="#demo"
            className="mt-6 inline-flex items-center gap-1.5 text-body-sm font-semibold text-accent transition-colors duration-200 hover:text-accent/80 hover:underline hover:underline-offset-4"
          >
            See interactive sample report ↓
          </motion.a>

          {/* Aeline & Catalis inspired data intelligence proof row */}
          <motion.div {...rise(6)} className="mt-10 w-full border-t border-border/60 pt-6">
            <p className="text-caption font-semibold uppercase tracking-[0.1em] text-content-muted">
              Continuous Intelligence Sources & Audit Feeds
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              {[
                'Shodan',
                'SSL Labs',
                'VirusTotal',
                'NVD',
                'AbuseIPDB',
                'SecurityTrails',
                'Google Safe Browsing',
              ].map((feed) => (
                <span
                  key={feed}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-surface/70 px-3 py-1 tabular-nums text-caption font-semibold text-content-secondary shadow-2xs transition-all duration-200 hover:border-border-strong hover:bg-surface hover:text-content-primary"
                >
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent/70" />
                  {feed}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
