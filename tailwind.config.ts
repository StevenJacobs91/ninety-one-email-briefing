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
          primary: '#134848',
          'primary-hover': '#0d3232',
          secondary: '#0a3323',
          'secondary-hover': '#071f15',
          accent: '#fbaa96',
        },
      },
      transitionDuration: {
        fast: '150ms',
        normal: '250ms',
        slow: '400ms',
      },
    },
  },
  plugins: [],
} satisfies Config
