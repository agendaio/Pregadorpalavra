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
        serif: ['"Source Serif 4"', 'ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        // Escala própria para tipografia editorial do app
        '2xs':  ['11px',  { lineHeight: '14px', letterSpacing: '0' }],
        'xs':   ['12px',  { lineHeight: '16px' }],
        'sm':   ['13px',  { lineHeight: '18px' }],
        'base': ['15px',  { lineHeight: '22px' }],
        'md':   ['15px',  { lineHeight: '22px' }],
        'lg':   ['17px',  { lineHeight: '26px' }],
        'xl':   ['20px',  { lineHeight: '28px', letterSpacing: '-0.01em' }],
        '2xl':  ['24px',  { lineHeight: '32px', letterSpacing: '-0.015em' }],
        '3xl':  ['30px',  { lineHeight: '36px', letterSpacing: '-0.02em' }],
        '4xl':  ['36px',  { lineHeight: '42px', letterSpacing: '-0.025em' }],
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
          DEFAULT: '#dc2626',
          soft: 'rgba(220, 38, 38, 0.18)',
          glow: 'rgba(220, 38, 38, 0.35)',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(0,0,0,0.04), 0 4px 24px rgba(0,0,0,0.04)',
        ring: '0 0 0 1px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06)',
        nav: '0 -1px 0 rgba(0,0,0,0.04), 0 -8px 24px rgba(0,0,0,0.04)',
        fab: '0 8px 24px rgba(13,13,12,0.18), 0 0 0 1px rgba(255,255,255,0.06) inset',
      },
      borderRadius: {
        'xl': '14px',
        '2xl': '18px',
        '3xl': '24px',
      },
      spacing: {
        'safe': 'env(safe-area-inset-bottom, 0)',
        'safe-top': 'env(safe-area-inset-top, 0)',
      },
      animation: {
        'fade-in': 'fade-in 240ms cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-up': 'slide-up 320ms cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-down': 'slide-down 200ms ease-out',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
        'spin-slow': 'spin 1.4s linear infinite',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          from: { transform: 'translateY(-100%)' },
          to:   { transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.6' },
        },
      },
      transitionTimingFunction: {
        'ios': 'cubic-bezier(0.32, 0.72, 0, 1)',
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
