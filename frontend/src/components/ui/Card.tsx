import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'sm' | 'md' | 'lg' | 'xl';
  dark?: boolean;
  children: ReactNode;
}

export const Card = ({
  variant = 'md',
  dark = false,
  className,
  children,
  ...props
}: CardProps) => {
  const variants = {
    sm: 'p-4 rounded-lg shadow-sm',
    md: 'p-6 rounded-xl shadow-md border',
    lg: 'p-8 rounded-2xl shadow-lg border',
    xl: 'p-10 rounded-2xl shadow-xl border',
  };

  const darkStyles = dark
    ? 'bg-slate-800 border-gray-700 text-gray-50'
    : 'bg-white border-gray-200';

  return (
    <div
      className={cn(variants[variant], darkStyles, className)}
      {...props}
    >
      {children}
    </div>
  );
};
