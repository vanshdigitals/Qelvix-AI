'use client';

import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils/cn';

const THEME_OPTIONS = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
] as const;

export function AppearanceDropdown() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const activeTheme = mounted ? (theme ?? 'system') : 'system';

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
        }}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Select appearance theme"
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-md text-content-secondary transition-colors duration-150 ease-out',
          'hover:bg-surface-inset hover:text-content-primary',
          open && 'bg-surface-inset text-content-primary',
        )}
      >
        <Moon className="h-4.5 w-4.5" aria-hidden />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-36 origin-top-right rounded-lg border border-border/80 bg-surface p-1 shadow-md ring-1 ring-black/5 z-dropdown animate-in fade-in-0 zoom-in-95 duration-100">
          {THEME_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = activeTheme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setTheme(option.value);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors duration-100',
                  isSelected
                    ? 'bg-surface-inset text-content-primary font-semibold'
                    : 'text-content-secondary hover:bg-surface-inset/60 hover:text-content-primary',
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 opacity-70" aria-hidden />
                  <span>{option.label}</span>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-content-primary" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
