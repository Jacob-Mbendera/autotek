import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'sm' | 'md' | 'lg' | 'xl';
  children: ReactNode;
}

export const Card = ({
  variant = 'md',
  className,
  children,
  ...props
}: CardProps) => {
  const variants = {
    sm: 'p-4 rounded-lg shadow-sm',
    md: 'p-6 rounded-xl shadow-md border border-gray-200',
    lg: 'p-8 rounded-2xl shadow-lg border border-gray-200',
    xl: 'p-10 rounded-2xl shadow-xl border border-gray-200',
  };

  return (
    <div
      className={cn('bg-white', variants[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
};
