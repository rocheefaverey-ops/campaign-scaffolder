import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './contexts/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './utils/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary:   'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        tertiary:  'var(--color-tertiary)',
        statusRed: 'var(--color-statusRed)',
      },
      fontFamily: {
        default: ['var(--default-font-family)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
