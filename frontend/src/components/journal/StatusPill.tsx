import { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export type StatusPillTone = 'pending' | 'active' | 'completed' | 'unpaid' | 'cancelled';

const tones: Record<StatusPillTone, string> = {
  pending: 'bg-journal-warn-bg text-journal-warn-text',
  active: 'bg-journal-teal-tint text-journal-teal',
  completed: 'bg-journal-teal-tint text-journal-teal',
  unpaid: 'bg-journal-danger-bg text-journal-danger-text',
  cancelled: 'bg-journal-sand text-journal-muted',
};

/** Maps the app's real ServiceStatus values onto the design's 4-tone pill palette (assigned/in-progress read as "active"). */
export const SERVICE_STATUS_TONE: Record<string, StatusPillTone> = {
  pending: 'pending',
  assigned: 'active',
  'in-progress': 'active',
  completed: 'completed',
  cancelled: 'cancelled',
};

export interface StatusPillProps extends HTMLAttributes<HTMLSpanElement> {
  tone: StatusPillTone;
  children: string;
}

/** 999px pill, 11px uppercase Inter 500-600, per-tone color mapping. */
export const StatusPill = ({ tone, children, className, ...props }: StatusPillProps) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full px-3 py-1 font-sans font-semibold text-[11px] tracking-[0.08em] uppercase',
      tones[tone],
      className
    )}
    {...props}
  >
    {children}
  </span>
);
