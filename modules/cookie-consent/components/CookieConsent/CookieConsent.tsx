import Script from 'next/script';

interface Props {
  cbid?: string;
}

/**
 * CookieConsent — Server Component.
 * Injects the Cookiebot consent banner script.
 * Mount inside <head> in app/layout.tsx:
 *
 *   <CookieConsent cbid={process.env.NEXT_PUBLIC_COOKIEBOT_CBID} />
 */
export default function CookieConsent({ cbid }: Props) {
  if (!cbid) return null;

  return (
    <Script
      id="cookiebot"
      src="https://consent.cookiebot.com/uc.js"
      data-cbid={cbid}
      data-blockingmode="auto"
      type="text/javascript"
      strategy="beforeInteractive"
    />
  );
}
