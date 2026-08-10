'use client';

import { UserPlus } from 'lucide-react';

import { Panel, PanelTitle, ScreenHeader } from '@/components/dashboard/shared';
import { useAuth } from '@/components/providers/AuthProvider';

// Factual description of the real RBAC the backend enforces (require_role).
const ROLE_PERMS = [
  {
    role: 'Owner',
    can: 'Full control including billing, deleting the organisation and managing every member.',
  },
  {
    role: 'Admin',
    can: 'Manage assets, findings and scans, and invite members. Cannot change billing or delete the org.',
  },
  {
    role: 'Member',
    can: 'View findings and reports and acknowledge issues. Read-only on settings and team.',
  },
];

export function TeamScreen() {
  const auth = useAuth();
  const name = auth.user
    ? ((auth.user.user_metadata.full_name as string | undefined) ??
      auth.user.email?.split('@')[0] ??
      'You')
    : 'You';
  const email = auth.user?.email ?? '';

  return (
    <div className="flex flex-col gap-5">
      <ScreenHeader title="Team & roles" caption="Who can access this organisation." />

      <Panel className="flex flex-col gap-3">
        <PanelTitle>Members</PanelTitle>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-inset px-4 py-3">
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-body-sm font-medium text-content-primary">{name}</span>
            {email && <span className="truncate text-caption text-content-muted">{email}</span>}
          </div>
          <span className="shrink-0 rounded-full border border-border/80 px-2.5 py-0.5 text-caption font-medium text-content-secondary">
            Owner · you
          </span>
        </div>
        <div className="flex items-start gap-2.5 rounded-xl border border-dashed border-border p-4 text-body-sm text-content-secondary">
          <UserPlus className="mt-0.5 h-4 w-4 shrink-0 text-content-muted" />
          <p>
            <span className="font-medium text-content-primary">
              Inviting teammates isn&apos;t available in the current MVP.
            </span>{' '}
            You&apos;re set up as the organisation owner. Multi-user invitations and role management
            are coming after launch.
          </p>
        </div>
      </Panel>

      <Panel className="flex flex-col gap-2">
        <PanelTitle>What each role can do</PanelTitle>
        {ROLE_PERMS.map((r) => (
          <div key={r.role} className="border-t border-border/60 py-2.5 first:border-0">
            <span className="text-body-sm font-medium text-content-primary">{r.role}</span>
            <p className="text-caption text-content-secondary">{r.can}</p>
          </div>
        ))}
      </Panel>
    </div>
  );
}
