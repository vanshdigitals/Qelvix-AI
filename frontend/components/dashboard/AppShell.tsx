'use client';

import { Bell, ChevronRight, Loader2, Menu, Search, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { NotificationsDropdown } from '@/components/dashboard/NotificationsDropdown';
import { buildNavGroups, NAV_ICONS, type UserRole } from '@/components/dashboard/shared';
import { UserDropdown } from '@/components/dashboard/UserDropdown';
import { AppearanceDropdown } from '@/components/layout/AppearanceDropdown';
import { Logo } from '@/components/layout/Logo';
import { useAuth } from '@/components/providers/AuthProvider';
import { type ApiFinding, type Paginated, useApi } from '@/lib/api/client';
import { cn } from '@/lib/utils/cn';

/** Lightweight toast, shared by every screen via context. */
const ToastContext = createContext<(message: string) => void>(() => undefined);

export function useToast(): (message: string) => void {
  return useContext(ToastContext);
}

// Everything the header search can jump to.
const BASE_SEARCH_INDEX: { label: string; group: string; href: string }[] = [
  { label: 'Dashboard', group: 'Overview', href: '/dashboard' },
  { label: 'Findings', group: 'Security', href: '/findings' },
  { label: 'Assets', group: 'Security', href: '/assets' },
  { label: 'Scans', group: 'Security', href: '/scans' },
  { label: 'DPDP readiness', group: 'Compliance', href: '/compliance' },
  { label: 'Reports', group: 'Compliance', href: '/reports' },
  { label: 'Settings', group: 'Organisation', href: '/settings' },
  { label: 'Team & roles', group: 'Organisation', href: '/team' },
  { label: 'Notifications', group: 'Organisation', href: '/notifications' },
  { label: 'Billing', group: 'Account', href: '/billing' },
  { label: 'Audit log', group: 'Account', href: '/audit' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const pathname = usePathname();
  const [role] = useState<UserRole>('owner');

  const [navOpen, setNavOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const { data: findingsData } = useApi<Paginated<ApiFinding>>('/findings?limit=5');
  const recentFindings = useMemo(() => findingsData?.items ?? [], [findingsData?.items]);

  const showToast = useCallback((message: string) => {
    setToast(message);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => {
      setToast(null);
    }, 4000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [toast]);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setNavOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, [navOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const onClickOutside = (e: MouseEvent): void => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setSearchOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [searchOpen]);

  const handleRunScan = (): void => {
    if (scanning) return;
    setScanning(true);
    window.setTimeout(() => {
      setScanning(false);
      showToast('Scan started — results in about 2 minutes.');
    }, 1200);
  };

  const navGroups = useMemo(() => buildNavGroups(role), [role]);

  const metaName = auth.user
    ? (auth.user.user_metadata.full_name as string | undefined)
    : undefined;
  const userName = metaName ?? auth.user?.email?.split('@')[0] ?? 'Priya Sharma';
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const searchIndex = useMemo(() => {
    return [
      ...BASE_SEARCH_INDEX,
      ...recentFindings.map((f) => ({ label: f.title, group: 'Findings', href: `/findings/${f.id}` }))
    ];
  }, [recentFindings]);

  const searchResults =
    search.trim().length > 0
      ? searchIndex.filter((e) =>
          e.label.toLowerCase().includes(search.trim().toLowerCase()),
        ).slice(0, 8)
      : [];

  const notifications = useMemo(() => {
    return recentFindings.map(f => ({
      severity: f.severity,
      title: f.title,
      asset: f.asset_id ?? 'Unknown asset', // Just using id if not populated, real implementation might join asset
      age: 'Just now'
    }));
  }, [recentFindings]);

  return (
    <ToastContext.Provider value={showToast}>
      <div className="font-body min-h-screen bg-surface text-content-primary">
        {navOpen && (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => {
              setNavOpen(false);
            }}
            className="fixed inset-0 z-drawer bg-canvas/60 backdrop-blur-sm transition-opacity"
          />
        )}

        <div className="flex min-h-screen flex-col">
          {/* Sidebar */}
          <aside
            className={cn(
              'fixed inset-y-0 left-0 z-drawer flex w-[240px] flex-col gap-6 overflow-y-auto border-r border-border/60 bg-surface px-4 py-5 shadow-lg transition-transform duration-300 ease-out',
              navOpen ? 'translate-x-0' : '-translate-x-full',
            )}
          >
            <button
              type="button"
              onClick={() => {
                showToast('Organisation switching — coming soon.');
              }}
              className="flex items-center gap-2.5 rounded-xl border border-border bg-surface-inset px-3 py-2 text-left transition-colors hover:bg-surface-inset/80"
            >
              <span className="font-heading flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface text-[11px] font-bold text-content-primary shadow-2xs">
                VE
              </span>
              <span className="flex-1 truncate text-body-sm font-medium text-content-primary">
                Vardhman Exports
              </span>
              <ChevronRight className="h-4 w-4 text-content-muted" />
            </button>

            <nav className="flex flex-1 flex-col gap-6">
              {navGroups.map((group) => (
                <div key={group.label} className="flex flex-col gap-0.5">
                  <span className="px-2.5 font-mono text-caption font-semibold uppercase tracking-wider text-content-muted">
                    {group.label}
                  </span>
                  {group.items.map((item) => {
                    const isCur = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    const Icon = NAV_ICONS[item.key];
                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        aria-current={isCur ? 'page' : undefined}
                        className={cn(
                          'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-body-md font-medium transition-all',
                          isCur
                            ? 'bg-surface-inset text-content-primary'
                            : 'text-content-secondary hover:bg-surface-inset/50 hover:text-content-primary',
                        )}
                      >
                        {Icon && (
                          <Icon
                            className={cn(
                              'h-4 w-4 shrink-0',
                              isCur ? 'text-accent' : 'text-content-muted',
                            )}
                            aria-hidden
                          />
                        )}
                        <span className="flex-1 truncate text-left">{item.label}</span>
                        {isCur && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                        {item.count && (
                          <span className="rounded-full bg-critical-bg px-1.5 py-0.5 font-mono text-[11px] font-semibold text-critical-text">
                            {item.count}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          </aside>

          {/* Workspace */}
          <div className="flex min-w-0 flex-col">
            <header className="sticky top-0 z-sticky flex items-center justify-between gap-4 border-b border-border/60 bg-surface px-6 py-3.5">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setNavOpen((o) => !o);
                  }}
                  aria-expanded={navOpen}
                  aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-inset text-content-secondary transition-colors hover:text-content-primary"
                >
                  {navOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </button>
                <Logo className="hidden sm:flex" />
              </div>

              <div ref={searchRef} className="relative w-full max-w-md flex-1">
                <div className="flex h-9 w-full items-center gap-2 rounded-lg border border-border bg-surface-inset px-3 text-content-secondary transition-colors focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
                  <Search className="h-4 w-4 shrink-0 text-content-muted" />
                  <input
                    type="search"
                    aria-label="Search findings, assets and scans"
                    value={search}
                    onFocus={() => {
                      setSearchOpen(true);
                    }}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setSearchOpen(true);
                    }}
                    placeholder="Search findings, assets, scans..."
                    className="font-body w-full bg-transparent text-body-sm text-content-primary outline-none placeholder:text-content-muted"
                  />
                  <span className="rounded border border-border/60 bg-surface px-1.5 py-0.5 font-mono text-[11px] text-content-muted">
                    ⌘K
                  </span>
                </div>

                {searchOpen && search.trim().length > 0 && (
                  <div className="absolute left-0 top-full z-dropdown mt-2 w-full origin-top rounded-lg border border-border/80 bg-surface p-1.5 shadow-md ring-1 ring-black/5 duration-100 animate-in fade-in-0 zoom-in-95">
                    {searchResults.length > 0 ? (
                      searchResults.map((result, idx) => (
                        <Link
                          key={`${result.label}-${String(idx)}`}
                          href={result.href}
                          onClick={() => {
                            setSearchOpen(false);
                            setSearch('');
                          }}
                          className="flex items-center justify-between gap-3 rounded-md px-2.5 py-2 text-body-sm text-content-primary transition-colors hover:bg-surface-inset"
                        >
                          <span className="truncate">{result.label}</span>
                          <span className="shrink-0 font-mono text-[11px] text-content-muted">
                            {result.group}
                          </span>
                        </Link>
                      ))
                    ) : (
                      <p className="px-2.5 py-2 text-body-sm text-content-muted">
                        No matches for &ldquo;{search}&rdquo;.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2.5">
                {role !== 'member' && (
                  <button
                    type="button"
                    onClick={handleRunScan}
                    disabled={scanning}
                    title="Run a new scan"
                    className="hidden items-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-caption font-semibold text-white shadow-2xs transition-all hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-70 sm:flex"
                  >
                    {scanning && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                    {scanning ? 'Starting scan…' : 'Run scan now'}
                  </button>
                )}
                <AppearanceDropdown />
                <NotificationsDropdown findings={notifications} />
                <UserDropdown userName={userName} initials={initials} />
              </div>
            </header>

            <main className="flex-1 space-y-6 p-6 md:p-8">{children}</main>
          </div>
        </div>

        {toast && (
          <div
            role="status"
            className="fixed bottom-5 right-5 z-toast flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-4 py-3 text-body-sm font-medium text-content-primary shadow-lg"
          >
            <Bell className="h-4 w-4 text-accent" aria-hidden />
            {toast}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
