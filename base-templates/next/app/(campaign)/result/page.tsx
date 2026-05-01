'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCapeData } from '@hooks/useCapeData';
import { useInstanceId } from '@hooks/useInstanceId';
import { getCapeText, getCapeImage, getCapeNumber, getCapeBoolean } from '@utils/getCapeData';
import { useGameContext } from '@hooks/useGameContext';
import Button from '@components/_core/Button/Button';

export default function ResultPage() {
  const router       = useRouter();
  const { capeData } = useCapeData();
  const { score, rank, userName } = useGameContext();
  const instanceId = useInstanceId('result');

  // Kiosk auto-navigate. 0 (default) keeps the page interactive.
  const autoNavSec = getCapeNumber(capeData, `settings.pages.${instanceId}.autoNavSec`, 0);
  useEffect(() => {
    if (autoNavSec <= 0) return;
    const t = window.setTimeout(() => router.push('{{NEXT_AFTER_RESULT}}'), autoNavSec * 1000);
    return () => window.clearTimeout(t);
  }, [router, autoNavSec]);

  const bgUrl    = getCapeImage(capeData, 'general.result.background')
               || getCapeImage(capeData, 'general.landing.background')
               || '/assets/hero-mobile.png';
  const logoUrl  = getCapeImage(capeData, 'general.landing.logo')
               || getCapeImage(capeData, 'general.header.logo')
               || '/assets/logo-livewall-wordmark.svg';
  const menuIcon = getCapeImage(capeData, 'general.header.menuIcon');

  const headline    = getCapeText(capeData, 'copy.result.headline',     '[copy.result.headline]');
  const kicker      = getCapeText(capeData, 'copy.result.kicker',       'Result');
  const scoreLabel  = getCapeText(capeData, 'copy.result.scoreLabel',   'Score');
  const rankLabel   = getCapeText(capeData, 'copy.result.rankLabel',    'Rank');
  const cta         = getCapeText(capeData, 'copy.result.ctaContinue',  '[copy.result.ctaContinue]');
  const retryLabel  = getCapeText(capeData, 'copy.result.ctaPlayAgain', '[copy.result.ctaPlayAgain]');
  const lbLabel     = getCapeText(capeData, 'copy.result.ctaLeaderboard','Leaderboard');

  // Configurable button visibility (wizard's optional exits).
  const showPlayAgain   = getCapeBoolean(capeData, `settings.pages.${instanceId}.showPlayAgainButton`,   true);
  const showLeaderboard = getCapeBoolean(capeData, `settings.pages.${instanceId}.showLeaderboardButton`, false);

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

        <div className="campaign-stack campaign-hero-content" style={{ animation: 'fadeIn 0.5s 0.1s ease both' }}>
          <p className="campaign-kicker">{kicker}</p>
          <h1 className="campaign-title campaign-title--compact">{headline}</h1>
          {userName && (
            <p className="campaign-copy text-sm uppercase tracking-[0.16em]">{userName}</p>
          )}

          {/* Score plate — the only place a panel earns its keep on a hero
              page. Frosted glass over the brand image, lime-tinted to reinforce
              accent. Score is the visual anchor, rank rides as a chip. */}
          <section className="result-plate" style={{ animation: 'fadeIn 0.5s 0.22s ease both' }}>
            <p className="result-plate__label">{scoreLabel}</p>
            <p className="result-plate__score">{(score ?? 0).toLocaleString()}</p>
            {rank != null && (
              <span className="result-plate__rank">{rankLabel} #{rank}</span>
            )}
          </section>
        </div>

        <div className="campaign-actions" style={{ animation: 'fadeIn 0.5s 0.32s ease both' }}>
          <Button className="w-full" size="lg" onClick={() => router.push('{{NEXT_AFTER_RESULT}}')}>
            {cta}
          </Button>
          {showPlayAgain && (
            <Button variant="secondary" className="w-full" size="lg" onClick={() => router.push('{{PLAY_AGAIN_ROUTE}}')}>
              {retryLabel}
            </Button>
          )}
          {showLeaderboard && (
            <Button variant="ghost" className="w-full" size="lg" onClick={() => router.push('{{RESULT_LEADERBOARD_ROUTE}}')}>
              {lbLabel}
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
