import Script from 'next/script';

interface Props {
  gtmId?: string;
  nonce?: string;
}

/**
 * GTMScript — Server Component.
 * Mount inside <head> in app/layout.tsx:
 *
 *   <GTMScript gtmId={process.env.NEXT_PUBLIC_GTM_ID} nonce={nonce} />
 *
 * Also add a <noscript> GTM iframe at the top of <body> if required by your GTM setup.
 */
export default function GTMScript({ gtmId, nonce }: Props) {
  if (!gtmId) return null;

  return (
    <>
      <Script
        id="gtm-init"
        nonce={nonce}
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            (function(w,d,s,l,i){
              w[l]=w[l]||[];
              w[l].push({'gtm.start': new Date().getTime(), event:'gtm.js'});
              var f=d.getElementsByTagName(s)[0],
                  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
              j.async=true;
              j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
              f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${gtmId}');
          `,
        }}
      />
    </>
  );
}
