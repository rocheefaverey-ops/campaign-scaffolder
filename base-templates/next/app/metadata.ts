import type { Metadata } from 'next';

/**
 * Base metadata shared across all routes.
 * Override per-page with generateMetadata() using CAPE data.
 */
export const baseMetadata: Metadata = {
  title: {
    default: 'Campaign',
    template: '%s | Campaign',
  },
  description: '',
  robots: { index: false, follow: false }, // Campaigns are not public search targets
  openGraph: {
    type: 'website',
  },
  icons: {
    icon: [
      { url: '/favicon.ico',              sizes: 'any' },
      { url: '/assets/favicon.svg',       type: 'image/svg+xml' },
      { url: '/assets/favicon-16.png',    type: 'image/png', sizes: '16x16' },
      { url: '/assets/favicon-32.png',    type: 'image/png', sizes: '32x32' },
      { url: '/assets/favicon-192.png',   type: 'image/png', sizes: '192x192' },
      { url: '/assets/favicon-512.png',   type: 'image/png', sizes: '512x512' },
    ],
    apple: [
      { url: '/assets/apple-touch-icon.png', sizes: '180x180' },
    ],
  },
};
