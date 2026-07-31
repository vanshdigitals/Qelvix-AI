'use client';

import { Github, Linkedin, Twitter } from 'lucide-react';
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
      { label: 'Pricing', href: '/pricing' },
      { label: 'Docs', href: '/docs' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'Status', href: '/status' },
      { label: 'Questions', href: '/#faq' },
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
  {
    heading: 'Legal & Trust',
    links: [
      { label: 'Privacy Policy', href: '/legal/privacy' },
      { label: 'Terms of Service', href: '/legal/terms' },
      { label: 'Scanning Policy', href: '/legal/scanning-policy' },
      { label: 'DPA', href: '/legal/dpa' },
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
              Continuous, deterministic attack surface monitoring and DPDP readiness for Indian
              enterprises and growing brands.
            </p>

            {/* Live Operational Status Badge */}
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border/80 bg-surface px-3 py-1 tabular-nums text-caption font-semibold text-content-secondary shadow-2xs">
              <span
                aria-hidden
                className="inline-flex h-2 w-2 animate-pulse rounded-full bg-success-text"
              />
              <span>All 7 Scan Engines Operational</span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 tabular-nums text-[11px] text-content-secondary">
              <span className="rounded border border-border/60 bg-surface-inset px-2 py-0.5">
                DPDP Act (2023) Aligned
              </span>
              <span className="rounded border border-border/60 bg-surface-inset px-2 py-0.5">
                TLS 1.3 / AES-256
              </span>
            </div>
          </RevealChild>

          {/* Navigation Links Columns */}
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 lg:col-span-8">
            {LINK_GROUPS.map((group) => (
              <RevealChild key={group.heading}>
                <h3 className="tabular-nums text-caption font-semibold uppercase tracking-wider text-content-primary">
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
          <div className="flex flex-wrap items-center gap-4 text-caption text-content-secondary">
            <span>© {new Date().getFullYear()} Qelvix Inc. All rights reserved.</span>
            <span className="hidden sm:inline" aria-hidden>
              •
            </span>
            <span className="tabular-nums text-content-secondary">
              100% Deterministic Security Evaluation
            </span>
          </div>
          <div className="flex items-center gap-5 text-content-muted">
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter / X"
              className="transition-colors hover:text-content-primary"
            >
              {/* eslint-disable-next-line @typescript-eslint/no-deprecated */}
              <Twitter className="h-4 w-4" aria-hidden="true" />
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="transition-colors hover:text-content-primary"
            >
              {/* eslint-disable-next-line @typescript-eslint/no-deprecated */}
              <Github className="h-4 w-4" aria-hidden="true" />
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="transition-colors hover:text-content-primary"
            >
              {/* eslint-disable-next-line @typescript-eslint/no-deprecated */}
              <Linkedin className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
