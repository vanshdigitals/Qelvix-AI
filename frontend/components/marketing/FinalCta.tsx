'use client';

import { useState } from 'react';

import { DomainScanInput } from '@/components/marketing/DomainScanInput';
import { Reveal } from '@/components/marketing/Reveal';
import { Eyebrow, GridBackdrop } from '@/components/marketing/primitives';
import { SurfaceField, type SurfaceFieldState } from '@/components/marketing/SurfaceField';

export function FinalCta() {
  const [fieldState, setFieldState] = useState<SurfaceFieldState>('rest');

  return (
    <section
      data-theme="dark"
      aria-labelledby="final-cta-heading"
      className="relative isolate overflow-hidden bg-canvas px-5 py-16 md:px-page-margin md:py-20 border-t border-border"
    >
      <GridBackdrop pattern="dots" glow="center" />
      <div className="absolute inset-0">
        <SurfaceField state={fieldState} />
      </div>

      <div className="relative mx-auto flex max-w-marketing flex-col items-center text-center">
        <Reveal>
          <Eyebrow>Start now</Eyebrow>
        </Reveal>

        <Reveal index={1}>
          <h2
            id="final-cta-heading"
            className="mt-6 max-w-[16ch] font-display text-[2.25rem] leading-[1.08] tracking-tight text-content-primary sm:text-[3rem]"
          >
            Find out in under a minute
          </h2>
        </Reveal>

        <Reveal index={2}>
          {/* The input renders its own frame — matches the hero, no nested plate. */}
          <div className="relative mt-8 w-full max-w-[580px]">
            <DomainScanInput
              accessibleName="Enter your domain to scan — get started"
              submitLabel="Scan my business"
              onFieldStateChange={setFieldState}
            />
          </div>
        </Reveal>

        <Reveal index={3}>
          <p className="mt-5 text-body-md text-content-secondary">
            See your risk score in under a minute. Free, no card required.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

