'use client';

import { useEffect, useState } from 'react';
import { useCapeData } from '@hooks/useCapeData';
import { getCapeText, getCapeImage, getCapeBoolean, isVideoUrl } from '@utils/getCapeData';

interface DesktopWrapperProps {
  children: React.ReactNode;
}

export default function DesktopWrapper({ children }: DesktopWrapperProps) {
  const { capeData } = useCapeData();
  const [qrTargetUrl, setQrTargetUrl] = useState('');

  useEffect(() => {
    setQrTargetUrl(getShareableDevUrl());
  }, []);

  const useDesktopLayout  = getCapeBoolean(capeData, 'desktop.useDesktopWrapper', true);

  if (!useDesktopLayout) return <>{children}</>;

  const description = getCapeText(capeData, 'desktop.description', 'Scan the QR code to play on your mobile device');
  const labelQr     = getCapeText(capeData, 'desktop.qrText',      'Scan to play');
  const logoUrl     = getCapeImage(capeData, 'desktop.logo')
                   || getCapeImage(capeData, 'general.header.logo')
                   || getCapeImage(capeData, 'general.landing.logo');
  const bgUrl       = getCapeImage(capeData, 'desktop.backgroundIllustration')
                   || getCapeImage(capeData, 'general.landing.background')
                   || getCapeImage(capeData, 'files.landing.backgroundImage');
  const qrUrl       = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrTargetUrl)}&bgcolor=ffffff&color=000000`;

  const bgIsVideo   = isVideoUrl(bgUrl);
  const logoIsVideo = isVideoUrl(logoUrl);

  return (
    <div className="desktop-wrapper" data-enabled={useDesktopLayout}>
      {bgUrl && (
        bgIsVideo
          ? <video src={bgUrl} autoPlay loop muted playsInline className="desktop-wrapper__bg desktop-wrapper__bg--video" style={{ pointerEvents: 'none' }} onEnded={e => { e.currentTarget.currentTime = 0; e.currentTarget.play(); }} />
          : <div className="desktop-wrapper__bg" style={{ backgroundImage: `url('${bgUrl}')` }} />
      )}
      <div className="desktop-wrapper__overlay" />

      <div className="desktop-wrapper__stage">
        <div className="desktop-wrapper__info">
          {logoUrl && (
            logoIsVideo
              ? <video src={logoUrl} autoPlay loop muted playsInline className="desktop-wrapper__logo" />
              // eslint-disable-next-line @next/next/no-img-element
              : <img src={logoUrl} alt="Logo" className="desktop-wrapper__logo" />
          )}
          <p className="desktop-wrapper__description">{description}</p>
          <div className="desktop-wrapper__qr-container">
            <div className="desktop-wrapper__qr-box">
              {qrTargetUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrUrl} alt="QR code" className="desktop-wrapper__qr-img" />
              )}
            </div>
            <span className="desktop-wrapper__qr-label">{labelQr}</span>
          </div>
        </div>

        <div className="desktop-wrapper__phone">
          <div className="desktop-wrapper__phone-frame">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function getShareableDevUrl(): string {
  const current = new URL(window.location.href);
  const configuredOrigin = process.env.NEXT_PUBLIC_DEV_ORIGIN?.trim();

  if (
    configuredOrigin &&
    (current.hostname === 'localhost' || current.hostname === '127.0.0.1')
  ) {
    try {
      const url = new URL(configuredOrigin);
      url.pathname = current.pathname;
      url.search = current.search;
      url.hash = current.hash;
      return url.toString();
    } catch {
      return window.location.href;
    }
  }

  return window.location.href;
}
