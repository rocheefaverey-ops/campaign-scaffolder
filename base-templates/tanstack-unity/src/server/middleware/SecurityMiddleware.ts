import { createIsomorphicFn, createMiddleware } from '@tanstack/react-start';
import { getResponseHeaders, setResponseHeaders } from '@tanstack/react-start/server';
import { getStartContext } from '@tanstack/start-storage-context';
import { extractBaseUrl, isLocal } from '~/utils/Helper.ts';

export const securityMiddleware = createMiddleware().server(({ next }) => {
  const headers = getResponseHeaders();

  // Generate nonce & CSP template
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const cspTemplate = `
    default-src 'none';
    connect-src 'self' https://region1.google-analytics.com ${extractBaseUrl(process.env.UNITY_BASE_URL ?? '')} https://config.uca.cloud.unity3d.com https://cdp.cloud.unity3d.com;
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval' ${isLocal() ? "'unsafe-eval'" : ''};
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com ${extractBaseUrl(process.env.CAPE_BASE_URL ?? '')};
    media-src 'self' blob: ${extractBaseUrl(process.env.CAPE_BASE_URL ?? '')};
    img-src 'self' data: blob: ${extractBaseUrl(process.env.CAPE_BASE_URL ?? '')};
    font-src 'self' data: https://fonts.gstatic.com ${extractBaseUrl(process.env.CAPE_BASE_URL ?? '')};
    ${isLocal() ? '' : "frame-ancestors 'none';"}
    ${!isLocal() ? 'upgrade-insecure-requests' : ''}
  `;

  // Apply security headers
  const cspHeader = cspTemplate.replace(/\s{2,}/g, ' ').trim();
  headers.set('Content-Security-Policy', cspHeader);
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  setResponseHeaders(headers);

  // Set global nonce for use in loaders / components
  return next({
    context: {
      nonce,
    },
  });
});

// Utility to get the nonce value in an isomorphic way
export const getNonce = createIsomorphicFn()
  .server(() => getStartContext().contextAfterGlobalMiddlewares.nonce)
  .client(() => '');
