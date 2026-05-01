'use client';

import { useRouter } from 'next/navigation';
import { useCapeData } from '@hooks/useCapeData';
import { useInstanceId } from '@hooks/useInstanceId';
import { getCapeText, getCapeImage, getCapeBoolean } from '@utils/getCapeData';
import Button from '@components/_core/Button/Button';

export default function LandingPage() {
  const router       = useRouter();
  const { capeData } = useCapeData();
  const instanceId   = useInstanceId('landing');

  // Optional secondary CTA — toggled in the wizard via the exits checkbox,
  // persisted at settings.pages.{instanceId}.showLeaderboardButton so a
  // duplicate landing (e.g. /landing-2) gets its own visibility rule.
  const showLeaderboard   = getCapeBoolean(capeData, `settings.pages.${instanceId}.showLeaderboardButton`, false);
  const leaderboardLabel  = getCapeText   (capeData, 'copy.landing.ctaLeaderboard', 'Leaderboard');

  // CAPE-supplied assets win. When CAPE is empty (fresh campaign, no uploads
  // yet), we fall back to the bundled Livewall agency assets so the landing
  // page never renders as a blank cream card. Once a client uploads their own
  // hero/logo to CAPE, those instantly take over.
  const bgUrl     = getCapeImage(capeData, 'general.landing.background') || '/assets/hero-mobile.png';
  const logoUrl   = getCapeImage(capeData, 'general.landing.logo')
                 || getCapeImage(capeData, 'general.header.logo')
                 || '/assets/logo-livewall-wordmark.svg';
  const menuIcon  = getCapeImage(capeData, 'general.header.menuIcon');
  const headline = getCapeText(capeData, 'copy.landing.headline', '[copy.landing.headline]');
  const subline  = getCapeText(capeData, 'copy.landing.subline', '');
  const kicker   = getCapeText(capeData, 'copy.landing.kicker', 'Live experience');
  const cta      = getCapeText(capeData, 'copy.landing.cta', '[copy.landing.cta]');

  return (
    <div className="campaign-screen campaign-screen--hero">
      {/* Full-bleed hero image — fills the entire screen. Falls back to the
          bundled Livewall hero when CAPE has no background uploaded yet. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={bgUrl} alt="" className="campaign-hero-bleed" aria-hidden />

      {/* Atmospheric shade — top dim for logo legibility, bottom dim + lime
          glow for headline/CTA legibility. Always on, with or without an image. */}
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

        <div className="campaign-stack campaign-hero-content" style={{ animation: 'fadeIn 0.5s 0.14s ease both' }}>
          <p className="campaign-kicker">{kicker}</p>
          <h1 className="campaign-title">{headline}</h1>
          {subline && <p className="campaign-copy max-w-[28rem] text-base sm:text-lg">{subline}</p>}
        </div>

        <div className="campaign-actions" style={{ animation: 'fadeIn 0.5s 0.28s ease both' }}>
          <Button className="w-full" size="lg" onClick={() => router.push('{{NEXT_AFTER_LANDING}}')}>
            {cta}
          </Button>
          {showLeaderboard && (
            <Button variant="secondary" className="w-full" size="lg" onClick={() => router.push('{{LANDING_LEADERBOARD_ROUTE}}')}>
              {leaderboardLabel}
            </Button>
          )}
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
