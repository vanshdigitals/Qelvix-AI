'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const DISMISS_KEY = 'qelvix.announcement.dismissed';

export interface AnnouncementBarProps {
  message: string;
  linkLabel?: string;
  linkHref?: string;
  id: string;
}

export function AnnouncementBar({ message, linkLabel, linkHref, id }: AnnouncementBarProps) {
  const [dismissed, setDismissed] = useState(true);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    setDismissed(window.sessionStorage.getItem(DISMISS_KEY) === id);
  }, [id]);

  function dismiss(): void {
    window.sessionStorage.setItem(DISMISS_KEY, id);
    setDismissed(true);
  }

  return (
    <AnimatePresence initial={false}>
      {!dismissed && (
        <motion.div
          role="region"
          aria-label="Announcement"
          initial={false}
          exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
          transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
          className="overflow-hidden border-b border-accent/20 bg-accent/10 text-accent"
        >
          <div className="mx-auto flex max-w-marketing items-center justify-between gap-2 px-4 py-1.5 md:px-page-margin">
            <div className="flex min-w-0 flex-1 items-center justify-center gap-2 text-center text-xs font-medium">
              <span className="truncate">{message}</span>
              {linkLabel && linkHref && (
                <Link
                  href={linkHref}
                  className="shrink-0 font-semibold underline underline-offset-2 transition-opacity hover:opacity-80"
                >
                  {linkLabel} →
                </Link>
              )}
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss announcement"
              className="-mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded text-accent/70 transition-colors hover:text-accent"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

