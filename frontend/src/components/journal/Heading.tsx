import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
}

/** Hero H1 — Newsreader 300, 72px/0.98, -0.02em. Use once per page, on the primary hero. */
export const HeroHeading = ({ children, className, ...props }: HeadingProps) => (
  <h1
    className={cn(
      'font-journal font-light text-[44px] sm:text-[56px] lg:text-[72px] leading-[0.98] tracking-[-0.02em] text-journal-ink',
      className
    )}
    {...props}
  >
    {children}
  </h1>
);

/** Page H1 — Newsreader 300, 46-54px. Standard page-title heading. */
export const PageHeading = ({ children, className, ...props }: HeadingProps) => (
  <h1
    className={cn(
      'font-journal font-light text-[34px] sm:text-[42px] lg:text-[46px] leading-tight tracking-[-0.01em] text-journal-ink',
      className
    )}
    {...props}
  >
    {children}
  </h1>
);

/** Section H2 — Newsreader 300, 34-44px. */
export const SectionHeading = ({ children, className, ...props }: HeadingProps) => (
  <h2
    className={cn(
      'font-journal font-light text-[28px] sm:text-[34px] lg:text-[38px] leading-[1.06] text-journal-ink',
      className
    )}
    {...props}
  >
    {children}
  </h2>
);

/** Card/serif H3 — Newsreader 400, 22-26px. */
export const CardHeading = ({ children, className, ...props }: HeadingProps) => (
  <h3
    className={cn('font-journal font-normal text-[22px] leading-snug text-journal-ink', className)}
    {...props}
  >
    {children}
  </h3>
);

/** Pull-quote — Newsreader 300, 38px/1.28. Use inside a <blockquote>. */
export const PullQuote = ({ children, className, ...props }: HTMLAttributes<HTMLQuoteElement>) => (
  <blockquote
    className={cn('font-journal font-light text-[26px] sm:text-[32px] lg:text-[38px] leading-[1.28] text-journal-ink', className)}
    {...props}
  >
    {children}
  </blockquote>
);
