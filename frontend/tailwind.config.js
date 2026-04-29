module.exports = {
  content: ['./pages/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}', './app/**/*.{js,ts,jsx,tsx,mdx}'],
  corePlugins: {
    aspectRatio: false
  },
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        tertiary: 'var(--color-tertiary)',
        statusRed: 'var(--color-statusRed)'
      },
      fontFamily: {
        default: 'Open Sans, sans-serif'
      }
    },
    spacing: {
      px: '1px',
      0: '0',
      0.5: '4px',
      1: '8px',
      1.5: '12px',
      2: '16px',
      2.5: '20px',
      3: '24px',
      3.5: '28px',
      4: '32px',
      5: '36px',
      6: '40px',
      7: '48px',
      8: '56px',
      9: '64px',
      10: '72px',
      11: '80px',
      12: '96px',
      14: '128px'
    }
  },
  safelist: [],
  plugins: [
    // Aspect ratio safari fallback
    ({ matchUtilities, theme /* … */ }) => {
      // …
      matchUtilities(
        // https://gist.github.com/olets/9b833a33d01384eed1e9f1e106003a3b
        {
          aspect: (value) => ({
            '@supports (aspect-ratio: 1 / 1)': {
              aspectRatio: value
            },
            '@supports not (aspect-ratio: 1 / 1)': {
              // https://github.com/takamoso/postcss-aspect-ratio-polyfill

              '&::before': {
                content: '""',
                float: 'left',
                paddingTop: `calc(100% / (${value}))`
              },
              '&::after': {
                clear: 'left',
                content: '""',
                display: 'block'
              }
            }
          })
        },
        { values: theme('aspectRatio') }
      );
    }
  ]
};
