import { NextRequest, NextResponse } from 'next/server';

const unityOrigin = (() => {
  try {
    const raw = process.env.NEXT_PUBLIC_UNITY_BASE_URL ?? '';
    return raw ? new URL(raw).origin : '';
  } catch { return ''; }
})();

// Restrict iframe embedding — update with your own domains before going live
const frameAncestors = [
  "'self'",
  'https://*.lwdev.nl',
  'https://*.lwprod.nl',
  'http://localhost:*',
].join(' ');

export function middleware(request: NextRequest) {
  const nonce  = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev  = process.env.APP_ENV === 'local' || process.env.NODE_ENV === 'development';

  const csp = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} 'wasm-unsafe-eval'${unityOrigin ? ` ${unityOrigin}` : ''} https://www.googletagmanager.com https://storage.googleapis.com;
    style-src 'self' 'unsafe-inline';
    connect-src 'self'${unityOrigin ? ` ${unityOrigin}` : ''} https://storage.bycape.io https://storage-acceptance.bycape.io https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com https://consentcdn.cookiebot.com;
    img-src 'self' blob: data: https://storage.bycape.io https://storage-acceptance.bycape.io https://api.qrserver.com https://www.googletagmanager.com;
    font-src 'self' https://fonts.gstatic.com https://storage.bycape.io https://storage-acceptance.bycape.io;
    media-src 'self' blob: https://storage.bycape.io https://storage-acceptance.bycape.io;
    worker-src 'self' blob:;
    child-src 'self' blob:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors ${frameAncestors};
    frame-src https://consentcdn.cookiebot.com;
    // lw-scaffold:csp
  `.replace(/\s{2,}/g, ' ').trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // Apply CSP everywhere except local dev (avoids HMR issues)
  if (!isDev) {
    response.headers.set('Content-Security-Policy', csp);
  }

  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
