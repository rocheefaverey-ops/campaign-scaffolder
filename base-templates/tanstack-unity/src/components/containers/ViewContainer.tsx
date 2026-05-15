import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { useLoaderData } from '@tanstack/react-router';
import type { IDefaultProps } from '~/interfaces/IComponentProps.ts';
import { AuthProvider } from '~/components/contexts/AuthContext.tsx';
import { UnityProvider } from '~/components/game/UnityContext.tsx';

export function ViewContainer({ children }: IDefaultProps) {
  const { copy, branding, baseUrl } = useLoaderData({ from: '__root__' });
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    setQrUrl(getShareableUrl());
  }, []);

  const b = branding as Record<string, unknown> | null;
  const logoUrl = b?.logoUrl as string | undefined
               || b?.['general.header.logo'] as string | undefined;
  const bgUrl   = b?.backgroundUrl as string | undefined
               || b?.['desktop.backgroundIllustration'] as string | undefined;

  const description = copy.desktop.description;
  const qrLabel     = copy.desktop.qrText;

  return (
    <div className="desktop-wrapper" data-enabled="true">
      {bgUrl && <div className="desktop-wrapper__bg" style={{ backgroundImage: `url('${bgUrl}')` }} />}
      <div className="desktop-wrapper__overlay" />

      <div className="desktop-wrapper__stage">
        <div className="desktop-wrapper__info">
          {logoUrl && <img src={logoUrl} alt="Logo" className="desktop-wrapper__logo" />}
          <p className="desktop-wrapper__description">{description}</p>
          <div className="desktop-wrapper__qr-container">
            <div className="desktop-wrapper__qr-box">
              {qrUrl && <QRCodeSVG value={qrUrl || baseUrl} size={160} />}
            </div>
            <span className="desktop-wrapper__qr-label">{qrLabel}</span>
          </div>
        </div>

        <div className="desktop-wrapper__phone">
          <div className="desktop-wrapper__phone-frame">
            <div className="desktop-wrapper__app-shell">
              <AuthProvider>
                <UnityProvider>
                  {children}
                </UnityProvider>
              </AuthProvider>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getShareableUrl(): string {
  const current = new URL(window.location.href);
  const configuredOrigin = import.meta.env.VITE_DEV_ORIGIN?.trim();

  if (configuredOrigin && (current.hostname === 'localhost' || current.hostname === '127.0.0.1')) {
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
