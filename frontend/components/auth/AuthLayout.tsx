'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import type { ReactNode } from 'react';

import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { SurfaceField } from '@/components/marketing/SurfaceField';

export interface AuthLayoutProps {
  children: ReactNode;
}

/**
 * Centred auth card over the Surface Field motif with a vignette and a footer
 * status strip — matching the frozen auth design. The mark tile sits at the top
 * of the card; each screen renders its own heading and form below it.
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-canvas text-content-primary">
      {/* Background: node field + accent mesh glow + vignette. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <SurfaceField state="rest" />
        <motion.div
          className="absolute inset-0"
          animate={{ opacity: [0.75, 1, 0.75], scale: [1, 1.04, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            background:
              'radial-gradient(50% 42% at 50% 26%, rgb(var(--color-accent-primary-rgb) / 0.08), transparent 70%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 52% at 50% 44%, transparent 26%, rgb(var(--color-bg-canvas-rgb) / 0.92) 100%)',
          }}
        />
      </div>

      <div className="absolute right-5 top-5 z-10 grid h-12 w-12 place-items-center rounded-full border border-border bg-surface/80 backdrop-blur-sm transition-colors duration-150 ease-out hover:bg-surface-inset">
        <ThemeToggle />
      </div>

      <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-4">
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
          className="w-full max-w-[420px] rounded-[20px] border border-border bg-surface-raised p-5 shadow-lg"
        >
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface-inset">
            <Image
              src="/brand/qelvix-icon.png"
              alt=""
              aria-hidden
              width={764}
              height={764}
              priority
              className="h-5 w-5 dark:invert"
            />
          </div>
          {children}
        </motion.div>
      </main>


    </div>
  );
}
