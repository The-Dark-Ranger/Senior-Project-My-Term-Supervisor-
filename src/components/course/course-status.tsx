import { CheckCircle2, CircleDot, Lock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CourseStatus } from '@/types';

export const STATUS_META: Record<CourseStatus, { label: string; icon: typeof Lock; className: string; swatch: string }> = {
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    className: 'border-status-completed-border bg-status-completed text-status-completed-fg',
    swatch: 'bg-status-completed border-status-completed-border',
  },
  planned: {
    label: 'Planned',
    icon: Sparkles,
    className: 'border-status-planned-border bg-status-planned text-status-planned-fg',
    swatch: 'bg-status-planned border-status-planned-border',
  },
  available: {
    label: 'Available',
    icon: CircleDot,
    className: 'border-status-available-border bg-status-available text-status-available-fg',
    swatch: 'bg-status-available border-status-available-border',
  },
  locked: {
    label: 'Locked',
    icon: Lock,
    className: 'border-status-locked-border bg-status-locked text-status-locked-fg',
    swatch: 'bg-status-locked border-status-locked-border',
  },
};

export function CourseStatusBadge({ status, className }: { status: CourseStatus; className?: string }) {
  const { label, icon: Icon, className: tone } = STATUS_META[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        tone,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {label}
    </span>
  );
}

export function StatusLegend({ className }: { className?: string }) {
  return (
    <ul className={cn('flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground', className)} aria-label="Legend">
      {(Object.keys(STATUS_META) as CourseStatus[]).map(status => (
        <li key={status} className="flex items-center gap-1.5">
          <span className={cn('size-3 rounded-full border-2', STATUS_META[status].swatch)} aria-hidden />
          {STATUS_META[status].label}
        </li>
      ))}
    </ul>
  );
}
