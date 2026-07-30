'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AppearanceDropdown } from '@/components/layout/AppearanceDropdown';
import { Logo } from '@/components/layout/Logo';
import { cn } from '@/lib/utils/cn';

// Primary landing page section navigation.
const NAV_LINKS: readonly {
  label: string;
  href: string;
  id: string;
  hideOnSmallerDesktop?: boolean;
}[] = [
  { label: 'Product', href: '/#problem', id: 'problem' },
  { label: 'Features', href: '/#solution', id: 'solution' },
  { label: 'Security', href: '/#architecture', id: 'architecture' },
  { label: 'Pricing', href: '/pricing', id: 'pricing' },
  { label: 'About', href: '/about', id: 'about' },
  { label: 'Contact', href: '/contact', id: 'contact' },
  { label: 'Docs', href: '/docs', id: 'docs' },
  { label: 'Resources', href: '/#faq', id: 'faq', hideOnSmallerDesktop: true },
];

export function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const onScroll = (): void => {
      setScrolled(window.scrollY > 20);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  // Track active page section while scrolling for a subtle highlight
  useEffect(() => {
    const ids = NAV_LINKS.map((link) => link.id);
    const observers: IntersectionObserver[] = [];

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveId(id);
            }
          });
        },
        { rootMargin: '-20% 0px -55% 0px' },
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => {
      observers.forEach((obs) => {
        obs.disconnect();
      });
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <header
      className={cn(
        'sticky top-0 z-sticky border-b bg-surface transition-colors duration-200 ease-out',

        scrolled ? 'border-border/60 shadow-2xs' : 'border-border/30',
      )}
    >
      <nav
        aria-label="Main"
        className="mx-auto flex h-14 max-w-marketing items-center justify-between gap-6 px-5 md:px-page-margin"
      >
        {/* Three equal-basis zones: the centre stays centred without overlapping
            either side, at any width. */}
        <div className="flex shrink-0 items-center lg:flex-1 lg:justify-start">
          <Logo />
        </div>

        <div className="hidden lg:flex lg:justify-center">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = activeId === link.id;
              return (
                <li key={link.href} className={link.hideOnSmallerDesktop ? 'hidden xl:block' : ''}>
                  <Link
                    href={link.href}
                    aria-current={isActive ? 'true' : undefined}
                    className={cn(
                      'inline-flex h-8 items-center rounded-md px-2.5 text-body-sm font-medium transition-colors duration-150 ease-out',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
                      isActive
                        ? 'text-content-primary'
                        : 'text-content-secondary hover:text-content-primary',
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex shrink-0 items-center gap-1 lg:flex-1 lg:justify-end">
          <AppearanceDropdown />

          <Link
            href="/#demo"
            className="hidden h-8 items-center whitespace-nowrap rounded-md px-2.5 text-body-sm font-medium text-content-secondary transition-colors duration-150 ease-out hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus xl:inline-flex"
          >
            Sample report
          </Link>

          <Link
            href="/login"
            className="hidden h-8 items-center whitespace-nowrap rounded-md px-2.5 text-body-sm font-medium text-content-secondary transition-colors duration-150 ease-out hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus md:inline-flex"
          >
            Log in
          </Link>

          <Link
            href="/signup"
            className="ml-1.5 inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-md bg-accent px-3.5 text-body-sm font-semibold text-[#0B0E16] transition-colors duration-150 ease-out hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <span className="md:hidden">Scan</span>
            <span className="hidden md:inline">Scan my business</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              setMenuOpen((open) => !open);
            }}
            aria-expanded={menuOpen}
            aria-controls="marketing-mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="ml-3 flex h-8 w-8 items-center justify-center rounded-md text-content-secondary transition-colors duration-200 ease-out hover:text-content-primary lg:hidden"
          >
            {menuOpen ? (
              <X className="h-4 w-4" aria-hidden />
            ) : (
              <Menu className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>
      </nav>

      <div
        id="marketing-mobile-menu"
        hidden={!menuOpen}
        className="border-t border-border bg-surface lg:hidden"
      >
        <ul className="mx-auto max-w-marketing px-5 py-2 md:px-page-margin">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={() => {
                  setMenuOpen(false);
                }}
                className="flex min-h-[40px] items-center text-body-md text-content-primary"
              >
                {link.label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/#demo"
              onClick={() => {
                setMenuOpen(false);
              }}
              className="flex min-h-[40px] items-center text-body-md text-content-primary"
            >
              Sample Report
            </Link>
          </li>
          <li>
            <Link
              href="/login"
              onClick={() => {
                setMenuOpen(false);
              }}
              className="flex min-h-[40px] items-center text-body-md text-content-primary"
            >
              Log in
            </Link>
          </li>
        </ul>
      </div>
    </header>
  );
}
