import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface TextProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

/** Body copy — Inter 400, 14-16px/1.6-1.65. */
export const JournalBody = ({ children, className, ...props }: TextProps) => (
  <p className={cn('font-sans text-[15px] leading-[1.65] text-journal-body', className)} {...props}>
    {children}
  </p>
);

/** Eyebrow (accent) — Inter 600, 12px, 0.16em tracking, uppercase, teal. */
export const Eyebrow = ({ children, className, ...props }: TextProps) => (
  <span
    className={cn(
      'font-sans font-semibold text-xs tracking-[0.16em] uppercase text-journal-teal',
      className
    )}
    {...props}
  >
    {children}
  </span>
);

/** Mono label — Space Mono 400, 11-12px, 0.10em tracking, uppercase, faint. For "No. 01", "FIG. 01", index/figure system only. */
export const MonoLabel = ({ children, className, ...props }: TextProps) => (
  <span
    className={cn(
      'font-journal-mono text-[11px] tracking-[0.10em] uppercase text-journal-faint',
      className
    )}
    {...props}
  >
    {children}
  </span>
);

/** Field label — Inter 600, 11px, 0.10em tracking, uppercase, muted. For form field labels. */
export const FieldLabel = ({ children, className, ...props }: HTMLAttributes<HTMLLabelElement>) => (
  <label
    className={cn(
      'block font-sans font-semibold text-[11px] tracking-[0.10em] uppercase text-journal-muted mb-1.5',
      className
    )}
    {...props}
  >
    {children}
  </label>
);
