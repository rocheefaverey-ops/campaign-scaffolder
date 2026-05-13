'use client';

import { useCapeData } from '@hooks/useCapeData';
import { useInstanceId } from '@hooks/useInstanceId';
import { useSafeNavigation } from '@hooks/useSafeNavigation';
import { getCapeImage, getCapeBoolean, buildCopyResolver, buildImageResolver, isVideoUrl } from '@utils/getCapeData';
import { useGameContext } from '@hooks/useGameContext';
import Button from '@components/_core/Button/Button';

export default function LandingPage() {
  const navigate     = useSafeNavigation();
  const { capeData } = useCapeData();
  const instanceId   = useInstanceId('landing');
  const { onboardingCompleted, hasPlayed } = useGameContext();

  const t   = buildCopyResolver(capeData, 'landing', instanceId);
  const img = buildImageResolver(capeData, 'landing', instanceId);

  // Static leaderboard button — campaign-manager controlled via CAPE
  const showLeaderboard  = getCapeBoolean(capeData, `settings.pages.${instanceId}.showLeaderboardButton`, false);
  const onboardingFirstRunOnlyRaw = '{{LANDING_ONBOARDING_FIRST_RUN_ONLY}}';
  const onboardingFirstRunOnly = onboardingFirstRunOnlyRaw.startsWith('{{')
    ? true
    : onboardingFirstRunOnlyRaw === 'true';
  const leaderboardLabel = t('ctaLeaderboard', 'Leaderboard');

  const bgUrl    = img('background')
                || getCapeImage(capeData, `files.${instanceId}.backgroundImage`)
                || getCapeImage(capeData, `files.${instanceId}.heroImage`)
                || '/assets/hero-mobile.png';
  const logoUrl  = img('logo')
                || getCapeImage(capeData, 'general.header.logo')
                || '/assets/logo-livewall-wordmark.svg';
  const menuIcon = getCapeImage(capeData, 'general.header.menuIcon');
  const headline = t('headline', '[copy.landing.headline]');
  const subline  = t('subline',  '');
  const kicker   = t('kicker',   'Live experience');
  const cta      = t('cta',      'Play');

  // Return-player copy — falls back to primary CTA label if not set in CAPE
  const ctaReturning         = t('ctaReturning', cta);
  const leaderboardReturnCta = t('leaderboardCta', leaderboardLabel);

  const nextAfterLanding = '{{NEXT_AFTER_LANDING}}';
  const nextAfterOnboardingRaw = '{{NEXT_AFTER_ONBOARDING}}';
  const nextAfterOnboarding = nextAfterOnboardingRaw.startsWith('{{')
    ? nextAfterLanding
    : nextAfterOnboardingRaw;

  const playRoute = onboardingFirstRunOnly && onboardingCompleted
    ? nextAfterOnboarding
    : nextAfterLanding;
  const handlePlay = () => navigate(playRoute);

  return (
    <div className="campaign-screen campaign-screen--hero">
      {isVideoUrl(bgUrl)
        ? <video src={bgUrl} className="campaign-hero-bleed" autoPlay muted loop playsInline aria-hidden />
        // eslint-disable-next-line @next/next/no-img-element
        : <img   src={bgUrl} alt="" className="campaign-hero-bleed" aria-hidden />
      }

      <div className="campaign-hero-shade" aria-hidden />

      <div className="campaign-shell relative z-10">
        <header className="campaign-hero-header campaign-hero-header--with-close" style={{ animation: 'fadeIn 0.4s ease both' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt="Logo" className="campaign-hero-logo" />
          <button
            type="button"
            className="campaign-menu-btn"
            aria-label="Menu"
            onClick={() => navigate('/menu')}
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
          <Button className="w-full" size="lg" onClick={handlePlay}>
            {hasPlayed ? ctaReturning : cta}
          </Button>
          {(showLeaderboard || hasPlayed) && (
            <Button variant="secondary" className="w-full" size="lg" onClick={() => navigate('{{LANDING_LEADERBOARD_ROUTE}}')}>
              {hasPlayed ? leaderboardReturnCta : leaderboardLabel}
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
