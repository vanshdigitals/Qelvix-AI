'use client';

import { Loader2 } from 'lucide-react';

import { useToast } from '@/components/dashboard/AppShell';
import { PrimaryButton, ScreenHeader, TableWrap, Th } from '@/components/dashboard/shared';
import { type ApiScan, type Paginated, useApi } from '@/lib/api/client';
import { cn } from '@/lib/utils/cn';

const STATUS_COLOR: Record<string, string> = {
  running: 'text-accent',
  completed: 'text-success-text',
  failed: 'text-critical-text',
  pending: 'text-content-muted',
};

function findingCount(fs: Record<string, unknown> | null): string {
  if (!fs) return '—';
  const total = Object.values(fs)
    .filter((v): v is number => typeof v === 'number')
    .reduce((a, b) => a + b, 0);
  return total > 0 ? String(total) : '—';
}

export function ScansScreen() {
  const toast = useToast();
  const { data, loading, error } = useApi<Paginated<ApiScan>>('/scans?limit=50');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-content-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="text-body-md font-medium text-high-text">
          Couldn&apos;t load your scans — {error}
        </div>
        <p className="text-body-sm text-content-secondary">
          Please try reloading the page or check your authentication.
        </p>
      </div>
    );
  }

  const rows = data?.items ?? [];

  return (
    <div className="flex flex-col gap-5">
      <ScreenHeader
        title="Scans"
        caption="Weekly schedule · Mondays 06:00 IST"
        actions={
          <PrimaryButton
            onClick={() => {
              toast('Scan trigger — coming soon.');
            }}
          >
            Run scan now
          </PrimaryButton>
        }
      />

      <TableWrap>
        <table className="w-full min-w-[720px] border-collapse text-body-sm">
          <thead>
            <tr className="bg-surface-inset">
              <Th>Scan</Th>
              <Th>Started</Th>
              <Th>Status</Th>
              <Th>Completed</Th>
              <Th>Findings</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-t border-border/60">
                <td className="whitespace-nowrap px-3 py-3 pl-4 tabular-nums text-caption text-content-primary">
                  {s.id.slice(0, 8)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-content-secondary">
                  {new Date(s.started_at).toLocaleString()}
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 capitalize',
                      STATUS_COLOR[s.status],
                    )}
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        STATUS_COLOR[s.status]?.replace('text-', 'bg-'),
                      )}
                    />
                    {s.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-content-secondary">
                  {s.completed_at ? new Date(s.completed_at).toLocaleString() : '—'}
                </td>
                <td className="whitespace-nowrap px-3 py-3 tabular-nums text-caption text-content-primary">
                  {findingCount(s.finding_summary)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr className="border-t border-border/60">
                <td colSpan={5} className="px-3 py-10 text-center text-body-sm text-content-muted">
                  {error ?? 'No scans yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}
