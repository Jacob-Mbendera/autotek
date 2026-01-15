import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'small' | 'default' | 'large';
  children: ReactNode;
}

export const Button = ({
  variant = 'primary',
  size = 'default',
  className,
  children,
  ...props
}: ButtonProps) => {
  const baseStyles = 'font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-teal-500 hover:bg-teal-600 text-white',
    secondary: 'bg-white border-2 border-teal-500 text-teal-600 hover:bg-teal-50',
    ghost: 'text-teal-600 hover:bg-teal-50',
  };

  const sizes = {
    small: 'px-4 py-2 text-sm',
    default: 'px-6 py-3 text-base',
    large: 'px-8 py-4 text-lg',
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
};
