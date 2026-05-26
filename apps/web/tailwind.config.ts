import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#071A2F',
          gold: '#D4AF37',
          gray: '#9CA3AF',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'glass': 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
      },
      boxShadow: {
        premium: '0 8px 32px rgba(0,0,0,0.3)',
        gold: '0 4px 20px rgba(212,175,55,0.25)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
