'use client';

import Link from 'next/link';

import { Logo } from '@/components/layout/Logo';

import { RevealChild, RevealGroup } from '@/components/marketing/Reveal';

// Only destinations that actually resolve today. Sections whose pages are not
// built yet are deliberately absent rather than shipped as 404s.
const LINK_GROUPS = [
  {
    heading: 'Product',
    links: [
      { label: 'How it works', href: '/#how-it-works' },
      { label: 'Sample report', href: '/#demo' },
      { label: 'Pricing', href: '/#pricing' },
      { label: 'Questions', href: '/#faq' },
    ],
  },
  {
    heading: 'Platform',
    links: [
      { label: 'Rule engine', href: '/#architecture' },
      { label: 'Agent pipeline', href: '/#architecture' },
      { label: 'Data feeds', href: '/#architecture' },
      { label: 'DPDP readiness', href: '/#compliance' },
    ],
  },
  {
    heading: 'Account',
    links: [
      { label: 'Log in', href: '/login' },
      { label: 'Create account', href: '/signup' },
      { label: 'Reset password', href: '/forgot-password' },
    ],
  },
] as const;

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/80 bg-surface-inset px-5 pb-10 pt-16 md:px-page-margin md:pt-20">
      <div className="mx-auto max-w-marketing">
        <RevealGroup className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-8" stagger={0.06}>
          {/* Brand & Newsletter Column */}
          <RevealChild className="lg:col-span-4">
            <Logo />
            <p className="mt-4 max-w-[32ch] text-body-sm leading-relaxed text-content-secondary">
              Continuous, deterministic attack surface monitoring and DPDP readiness for Indian enterprises and growing brands.
            </p>

            {/* Live Operational Status Badge */}
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border/80 bg-surface px-3 py-1 font-mono text-caption font-semibold text-content-secondary shadow-2xs">
              <span aria-hidden className="inline-flex h-2 w-2 rounded-full bg-success-text animate-pulse" />
              <span>All 7 Scan Engines Operational</span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-mono text-content-muted">
              <span className="rounded border border-border/60 bg-surface-inset px-2 py-0.5">DPDP Act (2023) Aligned</span>
              <span className="rounded border border-border/60 bg-surface-inset px-2 py-0.5">TLS 1.3 / AES-256</span>
            </div>
          </RevealChild>

          {/* Navigation Links Columns */}
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:col-span-8">
            {LINK_GROUPS.map((group) => (
              <RevealChild key={group.heading}>
                <h3 className="font-mono text-caption font-semibold uppercase tracking-wider text-content-primary">
                  {group.heading}
                </h3>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-body-sm text-content-secondary transition-colors duration-200 ease-out hover:text-content-primary hover:underline hover:underline-offset-4"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </RevealChild>
            ))}
          </div>
        </RevealGroup>

        {/* Bottom Bar: Copyright & Social SVG Icons */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-8 sm:flex-row">
          <div className="flex flex-wrap items-center gap-4 text-caption text-content-muted">
            <span>© {new Date().getFullYear()} Qelvix Inc. All rights reserved.</span>
            <span className="hidden sm:inline" aria-hidden>•</span>
            <span className="font-mono text-content-secondary">100% Deterministic Security Evaluation</span>
          </div>
          <div className="flex items-center gap-5 text-content-muted">
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter / X"
              className="transition-colors hover:text-content-primary"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="transition-colors hover:text-content-primary"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="transition-colors hover:text-content-primary"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.64a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}



