'use client';

import { LogOut, Settings, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';

interface UserDropdownProps {
  userName: string;
  initials: string;
}

export function UserDropdown({ userName, initials }: UserDropdownProps) {
  const router = useRouter();
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

  const handleLogout = async () => {
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.replace('/login');
    router.refresh();
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
        }}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="User menu"
        className={cn(
          'font-heading flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-surface-inset text-caption font-bold text-content-primary shadow-2xs transition-colors duration-150 ease-out',
          'hover:border-border-strong hover:bg-surface-inset/80',
          open && 'border-border-strong bg-surface-inset/80',
        )}
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-dropdown mt-2 w-48 origin-top-right rounded-lg border border-border/80 bg-surface p-1 shadow-md ring-1 ring-black/5 duration-100 animate-in fade-in-0 zoom-in-95">
          <div className="mb-1 border-b border-border/60 px-2.5 py-2">
            <p className="truncate text-body-sm font-medium text-content-primary">{userName}</p>
          </div>

          <Link
            href="/profile"
            onClick={() => {
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] font-medium text-content-secondary transition-colors duration-100 hover:bg-surface-inset hover:text-content-primary"
          >
            <User className="h-4 w-4" />
            Profile
          </Link>

          <Link
            href="/settings"
            onClick={() => {
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] font-medium text-content-secondary transition-colors duration-100 hover:bg-surface-inset hover:text-content-primary"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>

          <div className="my-1 border-t border-border/60" />

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              void handleLogout();
            }}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] font-medium text-critical-text transition-colors duration-100 hover:bg-critical-bg hover:text-critical-text"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
