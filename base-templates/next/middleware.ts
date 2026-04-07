import { NextRequest, NextResponse } from 'next/server';
import { parsePlatform } from '@/utils/platform';

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev =
    process.env.APP_ENV === 'local' || process.env.NODE_ENV === 'development';

  const platform = parsePlatform(request.headers.get('user-agent') ?? '');

  const capeUrl = process.env.NEXT_PUBLIC_CAPE_URL ?? '';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
  const unityUrl = process.env.NEXT_PUBLIC_UNITY_BASE_URL ?? '';

  const csp = [
    `default-src 'self'`,
    // nonce for inline scripts injected by Next.js; strict-dynamic allows their children
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}${unityUrl ? ` ${unityUrl}` : ''}`,
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
    `img-src 'self' blob: data: https://storage.googleapis.com ${capeUrl}`,
    `font-src 'self' data: ${capeUrl}`,
    // blob: required for Unity AudioContext / WebWorkers; wasm-unsafe-eval for Unity WASM
    `script-src-attr 'none'`,
    `worker-src 'self' blob:`,
    `child-src 'self' blob:`,
    `media-src 'self' blob: ${capeUrl}`,
    `connect-src 'self' ${apiUrl} ${capeUrl} https://www.google-analytics.com${unityUrl ? ` ${unityUrl}` : ''}`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `upgrade-insecure-requests`,
    // lw-scaffold:csp — module CSP injections are appended above this line by the scaffolder CLI
  ]
    .filter(Boolean)
    .join('; ');

  // Pass nonce and platform to Server Components via headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('x-platform', platform);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // Only apply CSP in non-local environments (avoids HMR breakage in dev)
  if (!isDev) {
    response.headers.set('Content-Security-Policy', csp);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static assets)
     * - _next/image (image optimisation)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt).*)',
  ],
};
