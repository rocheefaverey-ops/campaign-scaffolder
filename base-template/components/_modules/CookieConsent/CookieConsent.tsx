'use client';

import Script from 'next/script';

interface CookieConsentProps {
  /** Cookiebot domain group ID */
  cbid: string;
  nonce?: string;
}

/**
 * [module: cookie-consent]
 * Injects the Cookiebot script. Must be rendered in the root layout.
 * Add the Cookiebot domain to your CSP script-src in middleware.ts:
 *   https://consent.cookiebot.com
 */
export default function CookieConsent({ cbid, nonce }: CookieConsentProps) {
  return (
    <Script
      id="Cookiebot"
      src="https://consent.cookiebot.com/uc.js"
      data-cbid={cbid}
      data-blockingmode="auto"
      strategy="beforeInteractive"
      nonce={nonce}
    />
  );
}
