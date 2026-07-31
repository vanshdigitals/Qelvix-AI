'use client';

import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Logo } from '@/components/layout/Logo';
import { SurfaceField } from '@/components/marketing/SurfaceField';
import { cn } from '@/lib/utils/cn';

const SPLASH_STORAGE_KEY = 'qelvix_splash_seen';

const INIT_STEPS = [
  { label: 'Initializing secure environment', duration: 560 },
  { label: 'Loading detection engines', duration: 720 },
  { label: 'Verifying security modules', duration: 620 },
  { label: 'Preparing dashboard', duration: 520 },
] as const;

export function SplashScreen() {
  const [visible, setVisible] = useState<boolean>(false);
  const [fading, setFading] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<number>(-1);
  const [doneCount, setDoneCount] = useState<number>(0);

  useEffect(() => {
    // Only appear once per browser session when the app first loads
    try {
      if (typeof window !== 'undefined' && sessionStorage.getItem(SPLASH_STORAGE_KEY) === 'true') {
        return;
      }
    } catch {
      // ignore storage access errors
    }

    setVisible(true);

    const timers: NodeJS.Timeout[] = [];
    let elapsed = 600; // initial reveal delay

    timers.push(
      setTimeout(() => {
        setActiveStep(0);
      }, elapsed),
    );

    INIT_STEPS.forEach((step, idx) => {
      elapsed += step.duration;
      timers.push(
        setTimeout(() => {
          setDoneCount(idx + 1);
          if (idx + 1 < INIT_STEPS.length) {
            setActiveStep(idx + 1);
          } else {
            setActiveStep(-1);
          }
        }, elapsed),
      );
    });

    // Automatically trigger smooth fade into Landing Page
    timers.push(
      setTimeout(() => {
        setFading(true);
      }, elapsed + 500),
    );

    timers.push(
      setTimeout(() => {
        try {
          sessionStorage.setItem(SPLASH_STORAGE_KEY, 'true');
        } catch {
          // ignore storage access errors
        }
        setVisible(false);
      }, elapsed + 1200),
    );

    return () => {
      timers.forEach((timer) => {
        clearTimeout(timer);
      });
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[200] flex flex-col items-center justify-center bg-surface transition-opacity duration-700 ease-out',
        fading ? 'pointer-events-none opacity-0' : 'opacity-100',
      )}
    >
      <SurfaceField state="rest" />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center px-6 text-center">
        {/* Splash Mark & Wordmark */}
        <div className="flex scale-125 items-center justify-center">
          <Logo />
        </div>

        <p className="font-body mt-5 text-body-sm text-content-secondary">
          Continuous exposure monitoring, explained in plain language.
        </p>

        {/* Initialization Steps */}
        <div
          role="status"
          aria-live="polite"
          className="mt-12 flex w-full flex-col gap-2.5 text-left"
        >
          {INIT_STEPS.map((step, idx) => {
            const isDone = idx < doneCount;
            const isActive = idx === activeStep;
            const isPending = !isDone && !isActive;

            return (
              <div
                key={step.label}
                className={cn(
                  'flex items-center gap-3 transition-opacity duration-300',
                  isDone || isActive ? 'opacity-100' : 'opacity-60',
                )}
              >
                <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
                  {isDone && (
                    <Check
                      className="h-3.5 w-3.5 text-content-primary"
                      aria-hidden="true"
                    />
                  )}
                  {isActive && (
                    <>
                      <span className="absolute h-2 w-2 animate-ping rounded-full bg-accent opacity-75" />
                      <span className="h-2 w-2 rounded-full bg-accent" />
                    </>
                  )}
                  {isPending && (
                    <span className="h-2 w-2 rounded-full border border-content-muted" />
                  )}
                </span>
                <span
                  className={cn(
                    'font-body text-body-sm transition-colors duration-300',
                    isActive
                      ? 'font-medium text-content-primary'
                      : isDone
                        ? 'text-content-primary'
                        : 'text-content-secondary',
                  )}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
