'use client';

import { useToast } from '@/components/dashboard/AppShell';
import {
  Panel,
  PanelTitle,
  PrimaryButton,
  ScreenHeader,
  TableWrap,
  Th,
} from '@/components/dashboard/shared';
import { TEAM } from '@/lib/data/dashboard';
import { cn } from '@/lib/utils/cn';

const ROLE_PERMS = [
  {
    role: 'Owner',
    can: 'Full control including billing, deleting the organisation and managing every member.',
  },
  {
    role: 'Admin',
    can: 'Manage assets, findings, scans and invite members. Cannot change billing or delete the org.',
  },
  {
    role: 'Member',
    can: 'View findings and reports, acknowledge issues. Read-only on settings and team.',
  },
];

export function TeamScreen() {
  const toast = useToast();

  return (
    <div className="flex flex-col gap-5">
      <ScreenHeader
        title="Team & roles"
        caption={`${String(TEAM.length)} people · 5 seats on the Starter plan`}
        actions={
          <PrimaryButton
            onClick={() => {
              toast('Invite member — coming soon.');
            }}
          >
            Invite member
          </PrimaryButton>
        }
      />

      <TableWrap>
        <table className="w-full min-w-[760px] border-collapse text-body-sm">
          <thead>
            <tr className="bg-surface-inset">
              <Th>Member</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th>Last active</Th>
              <Th align="right" />
            </tr>
          </thead>
          <tbody>
            {TEAM.map((m) => (
              <tr key={m.email} className="border-t border-border/60">
                <td className="px-3 py-3 pl-4">
                  <div className="flex items-center gap-3">
                    <span className="font-heading grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-inset text-caption font-bold text-content-primary">
                      {m.initials}
                    </span>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-medium text-content-primary">{m.name}</span>
                      <span className="font-mono text-caption text-content-muted">{m.email}</span>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-content-secondary">
                  {m.role}
                  {m.you && <span className="text-content-muted"> · you</span>}
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5',
                      m.status === 'Active' ? 'text-success-text' : 'text-high-text',
                    )}
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        m.status === 'Active' ? 'bg-success-text' : 'bg-high-text',
                      )}
                    />
                    {m.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-content-secondary">
                  {m.lastActive}
                </td>
                <td className="px-3 py-3 pr-4 text-right">
                  {!m.you && (
                    <button
                      type="button"
                      onClick={() => {
                        toast(`Removed ${m.name}.`);
                      }}
                      className="inline-flex h-7 items-center rounded-lg border border-border px-2.5 text-caption font-semibold text-critical-text transition-colors hover:bg-critical-bg"
                    >
                      {m.status === 'Invited' ? 'Revoke' : 'Remove'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>

      <Panel className="flex max-w-3xl flex-col gap-3">
        <PanelTitle>What each role can do</PanelTitle>
        <div className="flex flex-col">
          {ROLE_PERMS.map((rp) => (
            <div
              key={rp.role}
              className="flex items-start gap-3.5 border-t border-border/60 py-2.5 first:border-0"
            >
              <span className="w-16 shrink-0 text-body-sm font-medium text-content-primary">
                {rp.role}
              </span>
              <span className="flex-1 text-body-sm leading-relaxed text-content-secondary">
                {rp.can}
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
