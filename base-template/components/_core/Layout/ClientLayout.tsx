'use client';

import { useEffect } from 'react';
import { usePlatform } from '@hooks/usePlatform';
import { AppProgressBar } from 'next-nprogress-bar';

interface ClientLayoutProps {
  children: React.ReactNode;
  nonce: string;
}

/**
 * Client-side layout wrapper.
 * - Stamps data-platform attribute on <body> for CSS targeting
 * - Renders the route-change progress bar
 * - Any other client-only global side effects go here
 */
export default function ClientLayout({ children, nonce }: ClientLayoutProps) {
  const platform = usePlatform();

  useEffect(() => {
    document.body.setAttribute('data-platform', platform);
  }, [platform]);

  return (
    <>
      <AppProgressBar
        height="3px"
        color="var(--color-primary)"
        options={{ showSpinner: false }}
        shallowRouting
        nonce={nonce}
      />
      {children}
    </>
  );
}
