import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  phoneNumber?: boolean;
  dark?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, phoneNumber = false, dark = false, className, ...props }, ref) => {
    const baseStyles = dark
      ? 'w-full px-4 py-3 bg-slate-900 border border-gray-700 rounded-lg text-gray-50 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all'
      : 'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all';
    const errorStyles = error
      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
      : dark
      ? 'border-gray-700'
      : 'border-gray-300';
    const labelStyles = dark ? 'text-gray-300' : 'text-gray-700';

    if (phoneNumber) {
      return (
        <div>
          {label && (
            <label className={`block text-sm font-medium mb-2 ${labelStyles}`}>
              {label}
            </label>
          )}
          <div className="flex">
            <span className={`px-4 py-3 border border-r-0 rounded-l-lg ${
              dark
                ? 'bg-slate-800 border-gray-700 text-gray-300'
                : 'bg-gray-100 border-gray-300 text-gray-700'
            }`}>
              +265
            </span>
            <input
              ref={ref}
              type="tel"
              className={cn(
                baseStyles,
                errorStyles,
                'flex-1 rounded-l-none rounded-r-lg',
                className
              )}
              placeholder="XXXXXXXXX"
              {...props}
            />
          </div>
          {error && (
            <p className="mt-1 text-sm text-red-500">{error}</p>
          )}
        </div>
      );
    }

    return (
      <div>
        {label && (
          <label className={`block text-sm font-medium mb-2 ${labelStyles}`}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(baseStyles, errorStyles, className)}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
