import { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { LinkProps } from 'react-router-dom';
import { cn } from '../../utils/cn';

export type JournalButtonVariant = 'primary' | 'secondary';
export type JournalButtonSize = 'default' | 'large';

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans font-medium text-xs tracking-[0.12em] uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journal-teal focus-visible:ring-offset-2';

const variants: Record<JournalButtonVariant, string> = {
  primary: 'bg-journal-ink text-journal-bone hover:bg-journal-ink/90',
  secondary: 'bg-transparent text-journal-ink border border-journal-ink hover:bg-journal-ink hover:text-journal-bone',
};

const sizes: Record<JournalButtonSize, string> = {
  default: 'px-6 py-3',
  large: 'px-7 py-4',
};

export interface JournalButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: JournalButtonVariant;
  size?: JournalButtonSize;
  children: ReactNode;
}

export const JournalButton = ({
  variant = 'primary',
  size = 'default',
  className,
  children,
  ...props
}: JournalButtonProps) => (
  <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
    {children}
  </button>
);

export interface JournalLinkButtonProps extends LinkProps {
  variant?: JournalButtonVariant;
  size?: JournalButtonSize;
  children: ReactNode;
  className?: string;
}

/** Same visual system as JournalButton, but renders a router <Link> for navigation CTAs. */
export const JournalLinkButton = ({
  variant = 'primary',
  size = 'default',
  className,
  children,
  ...props
}: JournalLinkButtonProps) => (
  <Link className={cn(base, variants[variant], sizes[size], className)} {...props}>
    {children}
  </Link>
);

/**
 * "Fused hairline group" — two actions sharing one 1px ink border, divided by a
 * 1px border, no gap, no radius between. Children should be JournalButton /
 * JournalLinkButton instances styled with `border-0` (the group supplies the
 * shared outer border and the internal divider).
 */
export const JournalButtonGroup = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      'flex flex-col sm:flex-row w-full sm:w-max border border-journal-ink [&>*]:border-0 [&>*+*]:border-t sm:[&>*+*]:border-t-0 sm:[&>*+*]:border-l [&>*+*]:border-journal-ink',
      className
    )}
  >
    {children}
  </div>
);
