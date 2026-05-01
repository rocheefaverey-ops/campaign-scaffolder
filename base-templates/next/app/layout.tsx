import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { Inter } from 'next/font/google';
import { baseMetadata } from './metadata';
import Providers from './providers';
import { getCapeDataServer } from '@lib/cape/cape.server';
import DesktopWrapper from '@components/_core/DesktopWrapper/DesktopWrapper';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-inter',
});

export const metadata: Metadata = baseMetadata;

export async function generateViewport(): Promise<Viewport> {
  const capeData = await getCapeDataServer();
  return {
    themeColor: capeData?.settings?.branding?.themeColor ?? '#000000',
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const nonce    = headersList.get('x-nonce') ?? '';
  const platform = (headersList.get('x-platform') ?? 'desktop') as 'ios' | 'android' | 'desktop';

  const capeData = await getCapeDataServer();

  return (
    <html lang={process.env.NEXT_PUBLIC_CAPE_LANGUAGE ?? 'en'} className={inter.variable}>
      <body className="antialiased bg-[var(--surface-base)] text-[var(--text-primary)]">
        <Providers capeData={capeData} platform={platform} nonce={nonce}>
          <DesktopWrapper>
            {children}
          </DesktopWrapper>
        </Providers>
      </body>
    </html>
  );
}
