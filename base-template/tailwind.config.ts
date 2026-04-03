import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './contexts/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      // Design tokens are injected at runtime from CAPE via DesignTokenInjector.
      // Reference them as CSS custom properties, e.g. bg-[var(--color-primary)].
      // Only add static, campaign-agnostic values here.
      fontFamily: {
        brand: ['var(--font-brand)', 'sans-serif'],
        'brand-condensed': ['var(--font-brand-condensed)', 'sans-serif'],
      },
      colors: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        accent: 'var(--color-accent)',
      },
      screens: {
        // Kiosk / stand display (portrait 4K) — used by multi-device module
        stand: '2160px',
      },
    },
  },
  plugins: [],
};

export default config;
