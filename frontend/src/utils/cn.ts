/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx and tailwind-merge functionality
 */
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
