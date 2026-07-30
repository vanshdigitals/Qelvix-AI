'use client';

import { useToast } from '@/components/dashboard/AppShell';
import { ScreenHeader, TableWrap, Th } from '@/components/dashboard/shared';
import { AUDIT } from '@/lib/data/dashboard';

export function AuditScreen() {
  const toast = useToast();

  return (
    <div className="flex flex-col gap-5">
      <ScreenHeader
        title="Audit log"
        caption="Append-only. Entries cannot be edited or deleted, including by owners."
      />

      <TableWrap>
        <table className="w-full min-w-[880px] border-collapse text-body-sm">
          <thead>
            <tr className="bg-surface-inset">
              <Th>Time</Th>
              <Th>Actor</Th>
              <Th>Action</Th>
              <Th>Target</Th>
              <Th>IP</Th>
            </tr>
          </thead>
          <tbody>
            {AUDIT.map((a, idx) => (
              <tr key={`${a.time}-${String(idx)}`} className="border-t border-border/60">
                <td className="whitespace-nowrap px-3 py-3 pl-4 font-mono text-caption text-content-secondary">
                  {a.time}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-content-primary">{a.actor}</td>
                <td className="whitespace-nowrap px-3 py-3">
                  <span className="rounded-md bg-surface-inset px-2 py-0.5 font-mono text-caption text-content-secondary">
                    {a.action}
                  </span>
                </td>
                <td className="px-3 py-3 text-content-secondary">{a.target}</td>
                <td className="whitespace-nowrap px-3 py-3 pr-4 font-mono text-caption text-content-muted">
                  {a.ip}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border bg-surface-inset px-4 py-3">
          <span className="text-caption text-content-muted">
            Showing the last {AUDIT.length} of 1,284 entries · retained 12 months
          </span>
          <button
            type="button"
            onClick={() => {
              toast('Exporting audit log as CSV…');
            }}
            className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-caption font-semibold text-content-secondary transition-colors hover:bg-surface hover:text-content-primary"
          >
            Export CSV
          </button>
        </div>
      </TableWrap>
    </div>
  );
}
