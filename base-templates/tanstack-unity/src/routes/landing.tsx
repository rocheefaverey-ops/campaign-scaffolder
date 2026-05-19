import { createFileRoute } from '@tanstack/react-router';
import { PageContainer } from '~/components/containers/PageContainer.tsx';
import { StyledButton } from '~/components/buttons/StyledButton.tsx';
import { BaseButton } from '~/components/buttons/BaseButton.tsx';
import { loadLandingData } from '~/loaders/LandingLoader.ts';
import { useGameNavigation } from '~/hooks/useGameNavigation.ts';
import LogoImage from '~/assets/images/logo.png';

export const Route = createFileRoute('/landing')({
  component: Landing,
  loader: async ({ context }) => await loadLandingData(context.language),
});

function Landing() {
  const { copy, heroUrl, headerLogoUrl, pageLogoUrl } = Route.useLoaderData();
  const { isPending, navigate } = useGameNavigation();

  const resolvedHeaderLogo = headerLogoUrl || LogoImage;
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
          <button type="button" className="campaign-menu-btn" aria-label="Menu">
            <HamburgerIcon />
          </button>
        </header>

        <div
          className="campaign-stack campaign-hero-content"
          style={{ animation: 'fadeIn 0.5s 0.14s ease both' }}
        >
          {pageLogoUrl && (
            <img src={pageLogoUrl} alt="" className="campaign-hero-page-logo" />
          )}
          {copy.kicker && <p className="campaign-kicker">{copy.kicker}</p>}
          <h1 className="campaign-title">{copy.title || 'Welcome'}</h1>
          {copy.description && <p className="campaign-copy">{copy.description}</p>}
        </div>

        <div
          className="campaign-actions"
          style={{ animation: 'fadeIn 0.5s 0.28s ease both' }}
        >
          <StyledButton loading={isPending} onClick={navigate}>
            {copy.button || 'Play'}
          </StyledButton>
          <BaseButton linkOptions={{ to: '{{LANDING_TUTORIAL_ROUTE}}' }} className="campaign-skip">
            Tutorial
          </BaseButton>
        </div>
      </div>
    </PageContainer>
  );
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
