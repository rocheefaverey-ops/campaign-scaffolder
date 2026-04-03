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
};
