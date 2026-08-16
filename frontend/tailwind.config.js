/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
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
          'in-progress': '#8B5CF6',
          completed: '#10B981',
          error: '#EF4444',
        },
        // "The Garage Journal" design system — client-facing redesign only.
        // Does not replace `primary`/`status` above, which admin pages still use.
        journal: {
          bone: '#f5f2ea',
          ink: '#16150f',
          'ink-nav': '#3f3c33',
          body: '#4a473c',
          muted: '#6b6759',
          faint: '#8a8674',
          hairline: '#d8d2c4',
          'input-border': '#cfc7b8',
          divider: '#eee6da',
          teal: '#115e59',
          'teal-bright': '#5eead4',
          'teal-tint': '#e4f3ef',
          'teal-tint-border': '#bfe3d9',
          'deep-teal': '#0f2e29',
          sand: '#ece9df',
          'warn-text': '#b06a12',
          'warn-bg': '#f6ecd8',
          'danger-text': '#9a3d2a',
          'danger-bg': '#f6e7e2',
          'error-border': '#e7c3ba',
          'error-border-strong': '#c0392b',
          'star-empty': '#d9d1c2',
          'footer-1': '#c7c3b6',
          'footer-2': '#8f8b7e',
          'footer-3': '#6f6b5f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        // "The Garage Journal" design system fonts — client-facing redesign only.
        // Namespaced (not `serif`/`mono`) because those Tailwind defaults are
        // already used elsewhere (e.g. admin pages, transaction ID displays)
        // expecting the standard monospace/serif stacks, not these brand fonts.
        journal: ['Newsreader', 'Georgia', 'serif'],
        'journal-mono': ['"Space Mono"', 'monospace'],
      },
      borderRadius: {
        journal: '2px',
      },
    },
  },
  plugins: [],
}
