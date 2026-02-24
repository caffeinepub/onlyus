/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'blush-white': 'oklch(0.97 0.015 10)',
        'rose-pink': 'oklch(0.62 0.18 10)',
        'warm-accent': 'oklch(0.70 0.14 30)',
        'rose-dark': 'oklch(0.35 0.10 15)',
        border: 'oklch(0.90 0.03 10)',
        input: 'oklch(0.90 0.03 10)',
        ring: 'oklch(0.62 0.18 10)',
        background: 'oklch(0.98 0.01 10)',
        foreground: 'oklch(0.25 0.04 15)',
        primary: {
          DEFAULT: 'oklch(0.62 0.18 10)',
          foreground: 'oklch(1 0 0)',
        },
        secondary: {
          DEFAULT: 'oklch(0.94 0.03 10)',
          foreground: 'oklch(0.35 0.06 15)',
        },
        muted: {
          DEFAULT: 'oklch(0.95 0.02 10)',
          foreground: 'oklch(0.55 0.06 15)',
        },
        accent: {
          DEFAULT: 'oklch(0.70 0.14 30)',
          foreground: 'oklch(1 0 0)',
        },
        destructive: {
          DEFAULT: 'oklch(0.55 0.22 25)',
          foreground: 'oklch(1 0 0)',
        },
        card: {
          DEFAULT: 'oklch(1 0 0)',
          foreground: 'oklch(0.25 0.04 15)',
        },
        popover: {
          DEFAULT: 'oklch(1 0 0)',
          foreground: 'oklch(0.25 0.04 15)',
        },
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        romantic: '0 4px 24px oklch(0.62 0.18 10 / 0.15)',
        'romantic-lg': '0 8px 40px oklch(0.62 0.18 10 / 0.20)',
        soft: '0 2px 12px oklch(0.25 0.04 15 / 0.08)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        shimmer: 'shimmer 1.5s infinite',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/typography'),
  ],
};
