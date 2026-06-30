/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'sans-serif',
        ],
        serif: ['ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        ink: {
          50: '#fafaf9',
          100: '#f4f4f2',
          200: '#e7e7e3',
          300: '#d3d3cd',
          400: '#a8a8a0',
          500: '#787872',
          600: '#52524d',
          700: '#3a3a36',
          800: '#262624',
          900: '#1a1a18',
          950: '#0d0d0c',
        },
        paper: {
          DEFAULT: '#fbfbf9',
          dark: '#15151a',
        },
        accent: {
          // vermelho suave usado no marcador inteligente (50% transparency)
          DEFAULT: '#dc2626',
          soft: 'rgba(220, 38, 38, 0.18)',
          glow: 'rgba(220, 38, 38, 0.35)',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(0,0,0,0.04), 0 4px 24px rgba(0,0,0,0.04)',
        ring: '0 0 0 1px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06)',
      },
      animation: {
        'fade-in': 'fade-in 240ms ease-out',
        'slide-up': 'slide-up 320ms cubic-bezier(0.22, 1, 0.36, 1)',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.65' },
        },
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '72ch',
            color: '#262624',
          },
        },
      },
    },
  },
  plugins: [],
};