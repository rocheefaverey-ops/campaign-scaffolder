import type { NextConfig } from 'next';

const isDev = process.env.APP_ENV === 'local' || process.env.APP_ENV === 'development';

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'X-XSS-Protection',          value: '1; mode=block' },
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  async headers() {
    if (isDev) return [];
    return [
      { source: '/',                    headers: [...securityHeaders, { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }] },
      { source: '/_next/static/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
      { source: '/:path*',              headers: securityHeaders },
    ];
  },
};

export default nextConfig;
