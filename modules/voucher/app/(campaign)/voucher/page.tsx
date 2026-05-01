'use client';

import { useRouter } from 'next/navigation';
import { useCapeData } from '@hooks/useCapeData';
import { useInstanceId } from '@hooks/useInstanceId';
import { getCapeText, getCapeImage, getCapeBoolean, getCapeNumber } from '@utils/getCapeData';
import Voucher from '@components/_modules/Voucher/Voucher';
import Button from '@components/_core/Button/Button';

export default function VoucherPage() {
  const router       = useRouter();
  const { capeData } = useCapeData();

  const bgUrl    = getCapeImage(capeData, 'general.voucher.background')
               || getCapeImage(capeData, 'general.landing.background')
               || '/assets/hero-mobile.png';
  const logoUrl  = getCapeImage(capeData, 'general.landing.logo')
               || getCapeImage(capeData, 'general.header.logo')
               || '/assets/logo-livewall-wordmark.svg';
  const menuIcon = getCapeImage(capeData, 'general.header.menuIcon');

  const kicker     = getCapeText(capeData, 'copy.voucher.kicker',   'Reward');
  const headline   = getCapeText(capeData, 'copy.voucher.headline', 'Your voucher');
  const subline    = getCapeText(capeData, 'copy.voucher.subline',  '');
  const cta        = getCapeText(capeData, 'copy.voucher.cta',      'Done');
  const instanceId = useInstanceId('voucher');
  const showQr     = getCapeBoolean(capeData, `settings.pages.${instanceId}.showQr`,     true);
  const codeLength = getCapeNumber (capeData, `settings.pages.${instanceId}.codeLength`, 0);

  return (
    <div className="campaign-screen campaign-screen--hero">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={bgUrl} alt="" className="campaign-hero-bleed" aria-hidden />
      <div className="campaign-hero-shade" aria-hidden />

      <div className="campaign-shell">
        <header className="campaign-hero-header campaign-hero-header--with-close" style={{ animation: 'fadeIn 0.4s ease both' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt="Logo" className="campaign-hero-logo" />
          <button
            type="button"
            className="campaign-menu-btn"
            aria-label="Menu"
            onClick={() => router.push('/menu')}
          >
            {menuIcon
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={menuIcon} alt="" width={18} height={18} />
              : <HamburgerIcon />
            }
          </button>
        </header>

        <div className="campaign-stack campaign-hero-content items-center text-center" style={{ animation: 'fadeIn 0.5s 0.1s ease both' }}>
          <p className="campaign-kicker">{kicker}</p>
          <h1 className="campaign-title campaign-title--compact">{headline}</h1>
          {subline && <p className="campaign-copy max-w-[26rem]">{subline}</p>}

          {/* Voucher code is the focal element — keep it as a prominent panel
              so the prize feels tangible against the brand atmosphere. */}
          <section className="voucher-plate" style={{ animation: 'fadeIn 0.5s 0.22s ease both' }}>
            <Voucher showQr={showQr} codeLength={codeLength} />
          </section>
        </div>

        <div className="campaign-actions" style={{ animation: 'fadeIn 0.5s 0.32s ease both' }}>
          <Button className="w-full" size="lg" onClick={() => router.push('{{NEXT_AFTER_VOUCHER}}')}>
            {cta}
          </Button>
        </div>
      </div>
    </div>
  );
}

function HamburgerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <line x1="4" y1="7"  x2="20" y2="7"  />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}
