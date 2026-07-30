'use client';

import { useToast } from '@/components/dashboard/AppShell';
import {
  OpenLink,
  PrimaryButton,
  ScreenHeader,
  TableWrap,
  Th,
} from '@/components/dashboard/shared';
import { SCANS } from '@/lib/data/dashboard';
import { cn } from '@/lib/utils/cn';

const STATUS_COLOR: Record<string, string> = {
  Running: 'text-accent',
  Complete: 'text-success-text',
  Partial: 'text-high-text',
  Failed: 'text-critical-text',
};

export function ScansScreen() {
  const toast = useToast();

  return (
    <div className="flex flex-col gap-5">
      <ScreenHeader
        title="Scans"
        caption="Weekly schedule · Mondays 06:00 IST · 1 manual scan left this month"
        actions={
          <PrimaryButton
            onClick={() => {
              toast('Scan started — results in about 2 minutes.');
            }}
          >
            Run scan now
          </PrimaryButton>
        }
      />

      <div className="flex items-center gap-4 rounded-2xl border border-accent bg-surface p-5 shadow-xs">
        <span className="relative grid h-3.5 w-3.5 shrink-0 place-items-center">
          <span className="absolute h-2 w-2 animate-ping rounded-full bg-accent" />
          <span className="h-2 w-2 rounded-full bg-accent" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-body-md font-medium text-content-primary">
            Scan running · vardhmanexports.in
          </span>
          <span className="text-caption text-content-muted">
            Started 2 minutes ago · DNS analysis in progress · 6 of 13 agents complete
          </span>
        </div>
        <OpenLink href={`/scans/${SCANS[0]?.id ?? ''}`} />
      </div>

      <TableWrap>
        <table className="w-full min-w-[780px] border-collapse text-body-sm">
          <thead>
            <tr className="bg-surface-inset">
              <Th>Scan</Th>
              <Th>Started</Th>
              <Th>Trigger</Th>
              <Th>Status</Th>
              <Th>Duration</Th>
              <Th>Findings</Th>
              <Th align="right" />
            </tr>
          </thead>
          <tbody>
            {SCANS.map((s) => (
              <tr
                key={s.id}
                className="border-t border-border/60 transition-colors hover:bg-surface-inset/60"
              >
                <td className="whitespace-nowrap px-3 py-3 pl-4 font-mono text-caption text-content-primary">
                  {s.id}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-content-secondary">{s.started}</td>
                <td className="whitespace-nowrap px-3 py-3 text-content-secondary">{s.trigger}</td>
                <td className="whitespace-nowrap px-3 py-3">
                  <span className={cn('inline-flex items-center gap-1.5', STATUS_COLOR[s.status])}>
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        STATUS_COLOR[s.status]?.replace('text-', 'bg-'),
                      )}
                    />
                    {s.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-3 font-mono text-caption text-content-secondary">
                  {s.duration}
                </td>
                <td className="whitespace-nowrap px-3 py-3 font-mono text-caption text-content-primary">
                  {s.findings}
                </td>
                <td className="px-3 py-3 pr-4 text-right">
                  <OpenLink href={`/scans/${s.id}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}
