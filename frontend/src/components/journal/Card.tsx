import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface JournalCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Padded interior spacing. Pass `padding="none"` when the content manages its own padding (e.g. list rows with dividers). */
  padding?: 'none' | 'default' | 'lg';
}

const paddings: Record<NonNullable<JournalCardProps['padding']>, string> = {
  none: '',
  default: 'p-6',
  lg: 'p-8',
};

/** Ink-bordered card — 1px solid ink border, 2px radius, no shadow. The signature container of the new design system. */
export const JournalCard = ({ children, className, padding = 'default', ...props }: JournalCardProps) => (
  <div
    className={cn('bg-white border border-journal-ink rounded-journal', paddings[padding], className)}
    {...props}
  >
    {children}
  </div>
);
