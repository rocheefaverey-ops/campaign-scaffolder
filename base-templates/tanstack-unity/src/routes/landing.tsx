import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { PageContainer } from '~/components/containers/PageContainer.tsx';
import { StyledButton } from '~/components/buttons/StyledButton.tsx';
import { BaseButton } from '~/components/buttons/BaseButton.tsx';
import { loadLandingData } from '~/loaders/LandingLoader.ts';
import LogoImage from '~/assets/images/logo.png';

export const Route = createFileRoute('/landing')({
  component: Landing,
  loader: async ({ context }) => await loadLandingData(context.language),
});

const ONBOARDING_KEY = 'lw_onboarding_done_{{CAPE_ID}}';
const isOnboardingDone = () =>
  typeof window !== 'undefined' && window.localStorage.getItem(ONBOARDING_KEY) === '1';

function Landing() {
  const { copy, heroUrl, headerLogoUrl, pageLogoUrl } = Route.useLoaderData();
  const router = useRouter();
  const nextAfterLanding = '{{NEXT_AFTER_LANDING}}';
  const nextAfterTutorialRaw = '{{NEXT_AFTER_TUTORIAL}}';
  const nextAfterTutorial = nextAfterTutorialRaw.startsWith('{{') ? nextAfterLanding : nextAfterTutorialRaw;
  const onboardingFirstRunOnlyRaw = '{{LANDING_ONBOARDING_FIRST_RUN_ONLY}}';
  const onboardingFirstRunOnly = onboardingFirstRunOnlyRaw.startsWith('{{')
    ? true
    : isTokenValue(onboardingFirstRunOnlyRaw, 'true');
  const tutorialRoute = '{{LANDING_TUTORIAL_ROUTE}}';
  // Derived from the landing cta-group block at scaffold time (see flow-bridge).
  // Unreplaced token (e.g. a non-flow build) falls back to hidden.
  const showTutorialButtonRaw = '{{SHOW_LANDING_TUTORIAL_BUTTON}}';
  const showTutorialButton = showTutorialButtonRaw.startsWith('{{') ? false : isTokenValue(showTutorialButtonRaw, 'true');

  // Rehydrate the "tutorial seen" flag client-side so returning players skip
  // straight past the tutorial when pressing Play.
  const [onboardingDone, setOnboardingDone] = useState(false);
  useEffect(() => { setOnboardingDone(isOnboardingDone()); }, []);
  const nextRoute = onboardingFirstRunOnly && onboardingDone ? nextAfterTutorial : nextAfterLanding;

  const resolvedHeaderLogo = pageLogoUrl || headerLogoUrl || LogoImage;
  const isVideoHero = !!heroUrl && /\.(mp4|webm|mov)$/i.test(heroUrl);

  return (
    <PageContainer className="campaign-screen--hero">
      {heroUrl && (
        isVideoHero
          ? <video src={heroUrl} className="campaign-hero-bleed" autoPlay muted loop playsInline aria-hidden />
          : <img src={heroUrl} alt="" className="campaign-hero-bleed" aria-hidden />
      )}
      <div className="campaign-hero-shade" aria-hidden />

      <div className="campaign-shell">
        <header
          className="campaign-hero-header campaign-hero-header--with-close"
          style={{ animation: 'fadeIn 0.4s ease both' }}
        >
          <img src={resolvedHeaderLogo} alt="Logo" className="campaign-hero-logo" />
          <button type="button" className="campaign-menu-btn" aria-label="Menu" onClick={() => router.navigate({ to: '/menu' as never })}>
            <HamburgerIcon />
          </button>
        </header>

        <div
          className="campaign-stack campaign-hero-content"
          style={{ animation: 'fadeIn 0.5s 0.14s ease both' }}
        >
          {copy.kicker && <p className="campaign-kicker">{copy.kicker}</p>}
          <h1 className="campaign-title">{copy.title || 'Welcome'}</h1>
          {copy.description && <p className="campaign-copy">{copy.description}</p>}
        </div>

        <div
          className="campaign-actions"
          style={{ animation: 'fadeIn 0.5s 0.28s ease both' }}
        >
          <StyledButton onClick={() => router.navigate({ to: nextRoute as never, replace: true })}>
            {copy.button || 'Play'}
          </StyledButton>
          {showTutorialButton && (
            <BaseButton onClick={() => router.navigate({ to: tutorialRoute as never, replace: true })} className="campaign-skip">
              Tutorial
            </BaseButton>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

function isTokenValue(value: string, expected: string): boolean {
  return !value.startsWith('{{') && value === expected;
}

function HamburgerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <line x1="4" y1="7"  x2="20" y2="7"  stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="4" y1="17" x2="20" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
