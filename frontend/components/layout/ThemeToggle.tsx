'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => {
        setTheme(isDark ? 'light' : 'dark');
      }}
      // The label announces the action, not the current state.
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className="w-control-md flex h-control-md items-center justify-center rounded-md text-content-secondary transition-colors duration-fast ease-standard hover:bg-surface-inset hover:text-content-primary"
    >
      {/* Rendered only after mount: the server has no way to know the stored
          theme, so an icon chosen during SSR would flip on hydration. */}
      {mounted ? (
        isDark ? (
          <Sun className="h-5 w-5" aria-hidden />
        ) : (
          <Moon className="h-5 w-5" aria-hidden />
        )
      ) : (
        <span className="h-5 w-5" />
      )}
    </button>
  );
}
