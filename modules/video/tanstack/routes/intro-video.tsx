import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useEffect } from 'react';
import { PageContainer } from '~/components/containers/PageContainer.tsx';
import { StyledButton } from '~/components/buttons/StyledButton.tsx';
import { loadVideoData } from '~/loaders/VideoLoader.ts';

export const Route = createFileRoute('/intro-video')({
  component: IntroVideoPage,
  loader: async ({ context }) => await loadVideoData(context.language, 'intro-video'),
});

function IntroVideoPage() {
  const { copy, videoUrl, logoUrl } = Route.useLoaderData();
  const router = useRouter();

  const goNext = () => void router.navigate({ to: '{{NEXT_AFTER_INTRO_VIDEO}}' as never, replace: true });

  // If there's no intro video configured, skip the page entirely.
  useEffect(() => {
    if (!videoUrl) goNext();
  }, [videoUrl]);

  return (
    <PageContainer className="campaign-screen--hero">
      {videoUrl && (
        <video src={videoUrl} className="campaign-hero-bleed" autoPlay muted loop playsInline aria-hidden />
      )}
      <div className="campaign-hero-shade" aria-hidden />

      <div className="campaign-shell">
        <header className="campaign-hero-header" style={{ animation: 'fadeIn 0.4s ease both' }}>
          {logoUrl && <img src={logoUrl} alt="Logo" className="campaign-hero-logo" />}
        </header>

        <div />

        <div className="campaign-actions" style={{ animation: 'fadeIn 0.5s 0.2s ease both' }}>
          <StyledButton onClick={goNext}>{copy.cta || 'Continue'}</StyledButton>
        </div>
      </div>
    </PageContainer>
  );
}
