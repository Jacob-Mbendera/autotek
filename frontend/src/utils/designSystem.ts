/**
 * Design System Constants
 * Centralized design tokens for the AutoTek platform
 */

export const colors = {
  primary: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6', // Primary teal
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
  },
  status: {
    pending: '#F59E0B',
    processing: '#3B82F6',
    inProgress: '#8B5CF6',
    completed: '#10B981',
    error: '#EF4444',
  },
  semantic: {
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
  },
} as const;

export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
  },
  fontSize: {
    h1: '2.25rem', // 36px - text-4xl
    h2: '1.875rem', // 30px - text-3xl
    h3: '1.5rem', // 24px - text-2xl
    h4: '1.25rem', // 20px - text-xl
    body: '1rem', // 16px - text-base
    bodySmall: '0.875rem', // 14px - text-sm
    caption: '0.75rem', // 12px - text-xs
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    h1: 1.2,
    h2: 1.3,
    h3: 1.4,
    h4: 1.5,
    body: 1.6,
    bodySmall: 1.5,
    caption: 1.4,
  },
} as const;

export const spacing = {
  container: {
    maxWidth: '1280px', // 7xl
  },
  padding: {
    mobile: '16px',
    tablet: '24px',
    desktop: '32px',
  },
  section: {
    mobile: '48px',
    desktop: '64px',
  },
  card: {
    mobile: '16px',
    desktop: '24px',
  },
} as const;

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
} as const;

export const borderRadius = {
  sm: '0.5rem', // 8px
  md: '0.75rem', // 12px
  lg: '1rem', // 16px
  xl: '1.5rem', // 24px
} as const;
