import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        // Ninety One brand font stack — use these utilities in components
        'ni-display': ['"Ninety One Visuelt Display"', 'arial', 'helvetica', 'sans-serif'],
        'ni-heading': ['"Ninety One Visuelt"', 'arial', 'helvetica', 'sans-serif'],
        'ni-body':    ['"Ninety One Visuelt Light"', 'arial', 'helvetica', 'sans-serif'],
        'ni-medium':  ['"Ninety One Visuelt Medium"', 'arial', 'helvetica', 'sans-serif'],
        // Override Tailwind default sans → Visuelt Light (affects font-sans utility)
        sans: ['"Ninety One Visuelt Light"', 'arial', 'helvetica', 'sans-serif'],
      },
      colors: {
        brand: {
          // Primary green (Leatherback)
          primary:          '#134848',
          'primary-hover':  '#0d3232',
          'primary-dark':   '#0d3232',   // dark-mode bg for primary surfaces
          // Secondary green (Marula) — used for the final Review Brief CTA only
          secondary:        '#0a3323',
          'secondary-hover':'#071f15',
          // Coral accent
          accent:           '#fbaa96',
          'accent-muted':   '#f9896e',   // darker coral — passes 3:1 on white for large text
          // Background surfaces
          'bg-warm':        '#f0ece4',   // page background
          'bg-panel':       '#f8f5ee',   // step guide panel
          'bg-panel-dark':  '#1c1a17',   // dark-mode panel
          // Borders
          'border-warm':    '#ddd8cf',   // default warm border
          'border-field':   '#d4cfc6',   // form field border
          // Text
          'text-muted':     '#6b6660',   // secondary body text
          'text-body':      '#4a4a4a',   // primary body text on warm bg
        },
      },
      transitionDuration: {
        fast:   '150ms',
        normal: '250ms',
        slow:   '400ms',
      },
    },
  },
  plugins: [],
} satisfies Config
