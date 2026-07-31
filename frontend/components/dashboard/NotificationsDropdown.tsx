'use client';

import { Bell } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils/cn';

interface NotificationItem {
  severity: string;
  title: string;
  asset: string;
  age: string;
}

const SEVERITY_DOT: Record<string, string> = {
  critical: 'bg-critical-text',
  high: 'bg-high-text',
  medium: 'bg-accent',
  low: 'bg-content-muted',
};

interface NotificationsDropdownProps {
  findings: NotificationItem[];
}

export function NotificationsDropdown({ findings }: NotificationsDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
        }}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Notifications"
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-inset text-content-secondary transition-colors',
          'hover:text-content-primary',
          open && 'border-border-strong text-content-primary',
        )}
      >
        <Bell className="h-4 w-4" aria-hidden />
        {findings.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 font-mono text-[10px] font-bold text-white">
            {findings.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-dropdown mt-2 w-80 origin-top-right rounded-lg border border-border/80 bg-surface p-1.5 shadow-md ring-1 ring-black/5 duration-100 animate-in fade-in-0 zoom-in-95">
          <div className="border-b border-border/60 px-2.5 py-2">
            <p className="text-body-sm font-semibold text-content-primary">Notifications</p>
          </div>

          {findings.length === 0 ? (
            <p className="px-2.5 py-4 text-center text-body-sm text-content-muted">
              No new notifications
            </p>
          ) : (
            <ul className="mt-1 flex flex-col gap-0.5">
              {findings.map((finding) => (
                <li key={finding.title}>
                  <div className="flex items-start gap-2.5 rounded-md px-2.5 py-2 transition-colors hover:bg-surface-inset">
                    <span
                      className={cn(
                        'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                        SEVERITY_DOT[finding.severity.toLowerCase()] ?? SEVERITY_DOT.low,
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body-sm font-medium text-content-primary">
                        {finding.title}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[11px] text-content-muted">
                        {finding.asset} · {finding.age}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
