import { AlertOctagon, AlertTriangle, Info, ShieldAlert } from 'lucide-react';

import type { Severity } from '@/lib/data/landing';
import { cn } from '@/lib/utils/cn';

// Severity is never signalled by colour alone: each carries a fixed icon and a
// fixed text label (05 §3.1, INV-28).
const SEVERITY = {
  critical: {
    label: 'Critical',
    Icon: AlertOctagon,
    className: 'bg-critical-bg text-critical-text',
  },
  high: { label: 'High', Icon: ShieldAlert, className: 'bg-high-bg text-high-text' },
  medium: { label: 'Medium', Icon: AlertTriangle, className: 'bg-medium-bg text-medium-text' },
  low: { label: 'Low', Icon: Info, className: 'bg-low-bg text-low-text' },
} as const satisfies Record<Severity, unknown>;

export function SeverityBadge({ severity }: { severity: Severity }) {
  const { label, Icon, className } = SEVERITY[severity];

  return (
    <span
      className={cn(
        'border-current/15 inline-flex shrink-0 items-center gap-1 rounded-[3px] border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase leading-none tracking-wider',
        className,
      )}
    >
      <Icon className="h-2.5 w-2.5" aria-hidden />
      {label}
    </span>
  );
}
