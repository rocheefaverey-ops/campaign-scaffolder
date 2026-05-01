/* eslint-disable consistent-return */
// middleware.ts
import { NextRequest } from 'next/server';
import { i18nRouter } from 'next-i18n-router';
import i18nConfig from './i18nConfig';

const PUBLIC_FILE = /\.(.*)$/;

export async function proxy(req: NextRequest) {
  if (
    req.nextUrl.pathname.startsWith('/_next') ||
    req.nextUrl.pathname.includes('/api/') ||
    req.nextUrl.pathname.includes('robots.txt') ||
    PUBLIC_FILE.test(req.nextUrl.pathname)
  ) {
    return;
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  const ContentSecurityPolicy = `
  default-src 'none'; 
  frame-ancestors 'none'; 
  frame-src https://consentcdn.cookiebot.com; 
  media-src 'self'; 
  prefetch-src 'self';
  connect-src 'self' https://www.google-analytics.com https://consentcdn.cookiebot.com; 
  font-src 'self' 'unsafe-inline' data: https://use.typekit.net https://fonts.gstatic.com; 
  img-src 'self' data: blob:; 
  script-src 'self' 'nonce-${nonce}' https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net/en_US/fbevents.js https://consent.cookiebot.com https://consentcdn.cookiebot.com https://googleads.g.doubleclick.net; 
  style-src 'self' 'unsafe-inline' https://p.typekit.net https://use.typekit.net;
`;

  // Replace newline characters and spaces
  const contentSecurityPolicyHeaderValue = ContentSecurityPolicy.replace(/\s{2,}/g, ' ').trim();

  const response = i18nRouter(req, i18nConfig);
  response.headers.set('x-nonce', nonce);
  if (process.env.APP_ENV !== 'development') {
    response.headers.set('Content-Security-Policy', contentSecurityPolicyHeaderValue);
  }

  return response;
}
