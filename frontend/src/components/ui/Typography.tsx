import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface TypographyProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span';
}

export const H1 = ({ children, className, ...props }: TypographyProps) => (
  <h1 className={cn('text-4xl font-bold text-gray-900 leading-tight', className)} {...props}>
    {children}
  </h1>
);

export const H2 = ({ children, className, ...props }: TypographyProps) => (
  <h2 className={cn('text-3xl font-semibold text-gray-900 leading-snug', className)} {...props}>
    {children}
  </h2>
);

export const H3 = ({ children, className, ...props }: TypographyProps) => (
  <h3 className={cn('text-2xl font-semibold text-gray-800 leading-normal', className)} {...props}>
    {children}
  </h3>
);

export const H4 = ({ children, className, ...props }: TypographyProps) => (
  <h4 className={cn('text-xl font-semibold text-gray-800 leading-normal', className)} {...props}>
    {children}
  </h4>
);

export const Body = ({ children, className, ...props }: TypographyProps) => (
  <p className={cn('text-base text-gray-700 leading-relaxed', className)} {...props}>
    {children}
  </p>
);

export const BodySmall = ({ children, className, ...props }: TypographyProps) => (
  <p className={cn('text-sm text-gray-600 leading-normal', className)} {...props}>
    {children}
  </p>
);

export const Caption = ({ children, className, ...props }: TypographyProps) => (
  <span className={cn('text-xs text-gray-500 leading-tight', className)} {...props}>
    {children}
  </span>
);
