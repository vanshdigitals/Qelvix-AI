import {
  Bell,
  CreditCard,
  Database,
  FileText,
  Flag,
  History,
  Key,
  LayoutDashboard,
  type LucideIcon,
  Radar,
  HelpCircle,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

export type UserRole = 'owner' | 'admin' | 'member';

/** Leading icon per sidebar nav item, keyed by nav item `key`. */
export const NAV_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  findings: Flag,
  assets: Database,
  scans: Radar,
  compliance: ShieldCheck,
  reports: FileText,
  settings: Settings,
  team: Users,
  notifications: Bell,
  billing: CreditCard,
  audit: History,
  'api-keys': Key,
  help: HelpCircle,
};

export interface NavItem {
  label: string;
  key: string;
  count?: string;
  href: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Sidebar structure. Every item routes to a real page (04 §navigation). */
export function buildNavGroups(role: UserRole): NavGroup[] {
  const groups: NavGroup[] = [
    {
      label: 'OVERVIEW',
      items: [{ label: 'Dashboard', key: 'dashboard', href: '/dashboard' }],
    },
    {
      label: 'SECURITY',
      items: [
        { label: 'Findings', key: 'findings', count: '9', href: '/findings' },
        { label: 'Assets', key: 'assets', href: '/assets' },
        { label: 'Scans', key: 'scans', href: '/scans' },
      ],
    },
    {
      label: 'COMPLIANCE',
      items: [
        { label: 'DPDP readiness', key: 'compliance', href: '/compliance' },
        { label: 'Reports', key: 'reports', href: '/reports' },
      ],
    },
    {
      label: 'ORGANISATION',
      items:
        role === 'member'
          ? [{ label: 'Notifications', key: 'notifications', href: '/notifications' }]
          : [
              { label: 'Settings', key: 'settings', href: '/settings' },
              { label: 'Team & roles', key: 'team', href: '/team' },
              { label: 'Notifications', key: 'notifications', href: '/notifications' },
            ],
    },
  ];

  if (role === 'owner') {
    groups.push({
      label: 'ACCOUNT',
      items: [
        { label: 'Billing', key: 'billing', href: '/billing' },
        { label: 'API keys', key: 'api-keys', href: '/api-keys' },
        { label: 'Audit log', key: 'audit', href: '/audit' },
      ],
    });
  }

  groups.push({
    label: 'SUPPORT',
    items: [{ label: 'Help center', key: 'help', href: '/help' }],
  });

  return groups;
}

export type Severity = 'critical' | 'high' | 'medium' | 'low';

const SEVERITY_STYLES: Record<Severity, { badge: string; dot: string }> = {
  critical: { badge: 'bg-critical-bg text-critical-text', dot: 'bg-critical-text' },
  high: { badge: 'bg-high-bg text-high-text', dot: 'bg-high-text' },
  medium: { badge: 'bg-medium-bg text-accent', dot: 'bg-accent' },
  low: { badge: 'bg-surface-inset text-content-secondary', dot: 'bg-content-muted' },
};

export function severityKey(label: string): Severity {
  const k = label.toLowerCase();
  return k === 'critical' || k === 'high' || k === 'medium' || k === 'low' ? k : 'low';
}

/** Pill with a leading dot, matching the mockup's severity badge. */
export function SeverityBadge({ severity }: { severity: string }) {
  const s = SEVERITY_STYLES[severityKey(severity)];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-caption font-medium capitalize',
        s.badge,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
      {severity}
    </span>
  );
}

/** Page title block: H1, caption, and optional right-aligned actions. */
export function ScreenHeader({
  title,
  caption,
  actions,
}: {
  title: string;
  caption?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-h1 tracking-tight text-content-primary">{title}</h1>
        {caption && <p className="text-body-sm text-content-secondary">{caption}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Standard surface card used across every screen. */
export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-2xl border border-border bg-surface p-6 shadow-xs', className)}>
      {children}
    </div>
  );
}

export function PanelTitle({ children }: { children: ReactNode }) {
  return <h2 className="font-display text-h3 text-content-primary">{children}</h2>;
}

/** Solid accent button (dark text for AA contrast on the accent hue). */
export function PrimaryButton({
  children,
  onClick,
  type = 'button',
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  return (
    <button
      // eslint-disable-next-line react/button-has-type
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg bg-accent px-3.5 text-body-sm font-semibold text-[#0B0E16] shadow-2xs transition-colors hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg border border-border-strong px-3.5 text-body-sm font-semibold text-content-secondary transition-colors hover:bg-surface-inset hover:text-content-primary"
    >
      {children}
    </button>
  );
}

/** Small in-row "Open" affordance linking to a detail route. */
export function OpenLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-7 items-center rounded-lg border border-border px-2.5 text-caption font-semibold text-accent transition-colors hover:bg-surface-inset"
    >
      Open
    </Link>
  );
}

/** Horizontally scrollable wrapper so wide tables never break the layout. */
export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xs">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function Th({
  children,
  align = 'left',
}: {
  children?: ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <th
      scope="col"
      className={cn(
        'whitespace-nowrap px-3 py-2.5 font-mono text-[11px] font-medium uppercase tracking-wider text-content-muted',
        align === 'right' ? 'text-right' : 'text-left',
      )}
    >
      {children}
    </th>
  );
}
