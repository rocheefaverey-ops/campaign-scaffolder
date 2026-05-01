'use client';

import { useEffect, useState } from 'react';
import { useCapeData } from '@hooks/useCapeData';
import { getCapeText, getCapeImage, getCapeBoolean } from '@utils/getCapeData';

interface DesktopWrapperProps {
  children: React.ReactNode;
}

/**
 * Wraps the mobile-first campaign view with a desktop-friendly layout.
 * On screens wider than 768px: shows branding + QR code alongside a
 * 375×667 phone-frame preview.
 * On mobile: renders children fullscreen.
 *
 * Controlled by CAPE at desktop.* paths.
 */
export default function DesktopWrapper({ children }: DesktopWrapperProps) {
  const { capeData } = useCapeData();
  const [mounted, setMounted]     = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    setMounted(true);
    setCurrentUrl(window.location.href);
    const check = () => setIsDesktop(window.innerWidth > 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const useDesktopLayout = getCapeBoolean(capeData, 'desktop.useDesktopWrapper', true);
  const showDesktop = mounted && isDesktop && useDesktopLayout;

  if (!showDesktop) {
    return (
      <div style={{ width: '100vw', height: '100dvh', overflow: 'hidden', position: 'relative' }}>
        {children}
      </div>
    );
  }

  const description = getCapeText(capeData, 'desktop.description', 'Scan the QR code to play on your mobile device');
  const labelQr     = getCapeText(capeData, 'desktop.qrText',      'Scan to play');
  const logoUrl     = getCapeImage(capeData, 'desktop.logo');
  const bgUrl       = getCapeImage(capeData, 'desktop.backgroundIllustration');
  const qrUrl       = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentUrl)}&bgcolor=ffffff&color=000000`;

  return (
    <div className="desktop-wrapper">
      {bgUrl && (
        <div className="desktop-wrapper__bg" style={{ backgroundImage: `url('${bgUrl}')` }} />
      )}
      <div className="desktop-wrapper__overlay" />

      {/* Left: branding + QR */}
      <div className="desktop-wrapper__info">
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logo" className="desktop-wrapper__logo" />
        )}
        <p className="desktop-wrapper__description">{description}</p>
        <div className="desktop-wrapper__qr-container">
          <div className="desktop-wrapper__qr-box">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="QR code" className="desktop-wrapper__qr-img" />
          </div>
          <span className="desktop-wrapper__qr-label">{labelQr}</span>
        </div>
      </div>

      {/* Right: phone frame */}
      <div className="desktop-wrapper__phone">
        <div className="desktop-wrapper__phone-frame">
          {children}
        </div>
      </div>
    </div>
  );
}
