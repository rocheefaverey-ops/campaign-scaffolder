import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { baseMetadata } from './metadata';
import Providers from './providers';
import { getCapeDataServer } from '@lib/cape/cape.server';
import FontInjector from '@components/_core/FontInjector/FontInjector';
import './globals.css';

export const metadata: Metadata = baseMetadata;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') ?? '';
  const platform = (headersList.get('x-platform') ?? 'desktop') as
    | 'ios'
    | 'android'
    | 'desktop';

  // CAPE data is fetched once at the root layout — cached with 5-min TTL.
  // All children access it via useCapeData() without re-fetching.
  const capeData = await getCapeDataServer();

  return (
    <html lang={process.env.NEXT_PUBLIC_CAPE_LANGUAGE ?? 'en'}>
      <head>
        <FontInjector capeData={capeData} nonce={nonce} />
      </head>
      <body data-platform={platform}>
        <Providers capeData={capeData} platform={platform} nonce={nonce}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
