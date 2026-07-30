'use client';

import { Search } from 'lucide-react';
import { useState } from 'react';

import {
  OpenLink,
  ScreenHeader,
  SeverityBadge,
  TableWrap,
  Th,
} from '@/components/dashboard/shared';
import { FINDINGS } from '@/lib/data/dashboard';
import { cn } from '@/lib/utils/cn';

const STATUS_COLOR: Record<string, string> = {
  Open: 'text-high-text',
  Acknowledged: 'text-accent',
  Resolved: 'text-success-text',
};

const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'] as const;

export function FindingsScreen() {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<string | null>(null);

  const rows = FINDINGS.filter((f) => {
    const matchesQuery =
      query.trim().length === 0 ||
      `${f.title} ${f.asset} ${f.ruleId}`.toLowerCase().includes(query.trim().toLowerCase());
    const matchesSev = !active || f.severity === active;
    return matchesQuery && matchesSev;
  });

  return (
    <div className="flex flex-col gap-5">
      <ScreenHeader
        title="Findings"
        caption={`${String(FINDINGS.length)} findings across 4 assets · sorted by severity`}
      />

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-3">
        <div className="flex h-9 min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-border bg-surface-inset px-3">
          <Search className="h-4 w-4 shrink-0 text-content-muted" aria-hidden />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            placeholder="Filter by title, asset or rule id"
            aria-label="Filter findings"
            className="w-full bg-transparent text-body-sm text-content-primary outline-none placeholder:text-content-muted"
          />
        </div>
        {SEVERITIES.map((sev) => {
          const on = active === sev;
          const count = FINDINGS.filter((f) => f.severity === sev).length;
          return (
            <button
              key={sev}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setActive(on ? null : sev);
              }}
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-body-sm font-medium transition-colors',
                on
                  ? 'border-accent bg-accent/10 text-content-primary'
                  : 'border-border bg-surface-inset text-content-secondary hover:text-content-primary',
              )}
            >
              {sev}
              <span className="font-mono text-[11px] text-content-muted">{count}</span>
            </button>
          );
        })}
        {(query || active) && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setActive(null);
            }}
            className="h-9 rounded-lg px-3 text-body-sm font-medium text-accent"
          >
            Clear
          </button>
        )}
      </div>

      <TableWrap>
        <table className="w-full min-w-[820px] border-collapse text-body-sm">
          <thead>
            <tr className="bg-surface-inset">
              <Th>Severity</Th>
              <Th>Finding</Th>
              <Th>Asset</Th>
              <Th>Age</Th>
              <Th>Status</Th>
              <Th align="right" />
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => (
              <tr
                key={f.id}
                className="border-t border-border/60 transition-colors hover:bg-surface-inset/60"
              >
                <td className="px-3 py-3">
                  <SeverityBadge severity={f.severity} />
                </td>
                <td className="max-w-[340px] px-3 py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-content-primary">{f.title}</span>
                    <span className="font-mono text-[11px] text-content-muted">{f.ruleId}</span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-3 font-mono text-caption text-content-secondary">
                  {f.asset}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-content-secondary">{f.age}</td>
                <td className="whitespace-nowrap px-3 py-3">
                  <span className={cn('inline-flex items-center gap-1.5', STATUS_COLOR[f.status])}>
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        STATUS_COLOR[f.status]?.replace('text-', 'bg-'),
                      )}
                    />
                    {f.status}
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  <OpenLink href={`/findings/${f.id}`} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr className="border-t border-border/60">
                <td colSpan={6} className="px-3 py-10 text-center text-body-sm text-content-muted">
                  No findings match your filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}
