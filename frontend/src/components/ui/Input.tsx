import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  phoneNumber?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, phoneNumber = false, className, ...props }, ref) => {
    const baseStyles = 'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all';
    const errorStyles = error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300';

    if (phoneNumber) {
      return (
        <div>
          {label && (
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {label}
            </label>
          )}
          <div className="flex">
            <span className="px-4 py-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-gray-700">
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
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
