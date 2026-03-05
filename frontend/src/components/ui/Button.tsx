import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'gray';
  size?: 'small' | 'default' | 'large';
  dark?: boolean;
  children: ReactNode;
}

export const Button = ({
  variant = 'primary',
  size = 'default',
  dark = false,
  className,
  children,
  ...props
}: ButtonProps) => {
  const baseStyles = 'font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-teal-500 hover:bg-teal-600 text-white',
    secondary: dark
      ? 'bg-slate-800 border-2 border-teal-500 text-teal-500 hover:bg-slate-700'
      : 'bg-white border-2 border-teal-500 text-teal-600 hover:bg-teal-50',
    ghost: dark
      ? 'text-teal-400 hover:bg-slate-800 hover:text-teal-300'
      : 'text-teal-600 hover:bg-teal-50',
    gray: dark
      ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
      : 'bg-gray-200 hover:bg-gray-300 text-gray-900',
  };

  const sizes = {
    small: 'px-4 py-2 text-sm',
    default: 'px-6 py-3 text-base',
    large: 'px-8 py-4 text-lg',
  };

  return (
    <button
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        'inline-flex items-center justify-center', // Ensure proper alignment for icons and text
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
