import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
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
