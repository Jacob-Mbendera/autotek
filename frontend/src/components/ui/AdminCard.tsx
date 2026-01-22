import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface AdminCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'kpi' | 'chart' | 'table' | 'default';
  accentColor?: 'teal' | 'blue' | 'green' | 'purple' | 'orange';
  children: ReactNode;
}

export const AdminCard = ({
  variant = 'default',
  accentColor = 'teal',
  className,
  children,
  ...props
}: AdminCardProps) => {
  const baseStyles = 'bg-slate-800 border border-gray-700 rounded-xl text-gray-50';
  
  const variantStyles = {
    kpi: 'p-6 border-l-4',
    chart: 'p-6',
    table: 'p-6 overflow-x-auto',
    default: 'p-6',
  };

  const accentColors = {
    teal: 'border-l-teal-500',
    blue: 'border-l-blue-500',
    green: 'border-l-green-500',
    purple: 'border-l-purple-500',
    orange: 'border-l-orange-500',
  };

  return (
    <div
      className={cn(
        baseStyles,
        variantStyles[variant],
        variant === 'kpi' && accentColors[accentColor],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
