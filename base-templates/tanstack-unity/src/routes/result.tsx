import { createFileRoute, useRouter } from '@tanstack/react-router';
import type { IConfettiConfig } from '~/components/confetti/engine/ConfettiEngine.ts';
import { PageContainer } from '~/components/containers/PageContainer.tsx';
import { useUnityStore } from '~/hooks/stores/useUnityStore.ts';
import { StyledButton } from '~/components/buttons/StyledButton.tsx';
import { ConfettiOverlay } from '~/components/confetti/ConfettiOverlay.tsx';
import { loadResultData } from '~/loaders/ResultLoader.ts';

const confettiConfig: IConfettiConfig = {
  maxParticleCount: 30,
  spawnRate: 500,
  speed: { min: 20, max: 40 },
  scale: { min: 0.5, max: 0.8 },
  drift: { min: -0.5, max: 0.5 },
  spin: { min: -1, max: 1 },
  wobble: { amplitude: 30, speed: { min: 1, max: 3 } },
};

export const Route = createFileRoute('/result')({
  component: Result,
  loader: async ({ context }) => await loadResultData(context.language),
});

function Result() {
  const result = useUnityStore((state) => state.result);
  const { copy, backgroundUrl, logoUrl, winImageUrl } = Route.useLoaderData();
  const router = useRouter();
  const nextRoute = '/leaderboard';
  const playAgainRoute = '/game';
  const leaderboardRoute = '/leaderboard';
  const resultCopy = copy as typeof copy & Record<string, string | undefined>;
  const showPlayAgainButton = JSON.parse('true') as boolean;
  const showLeaderboardButton = JSON.parse('false') as boolean;
  const resultVisualUrl = winImageUrl || backgroundUrl;
  const isVideoVisual = !!resultVisualUrl && /\.(mp4|webm|mov)$/i.test(resultVisualUrl);

  return (
    <PageContainer className="campaign-screen--hero">
      {resultVisualUrl && (
        isVideoVisual
          ? <video src={resultVisualUrl} className="campaign-hero-bleed" autoPlay muted loop playsInline aria-hidden />
          : <img src={resultVisualUrl} alt="" className="campaign-hero-bleed" aria-hidden />
      )}
      <ConfettiOverlay config={confettiConfig} visual="confetti" visualCount={2} />
      <div className="campaign-hero-shade" aria-hidden />

      <div className="campaign-shell">
        <div />

        <div className="campaign-hero-content">
          {logoUrl && <img src={logoUrl} alt="" className="campaign-hero-page-logo" />}
          <div className="result-plate">
            <span className="result-plate__label">{copy.scoreLabel || 'Your score'}</span>
            <span className="result-plate__score">{result.playTime}</span>
          </div>

          {copy.title && <h2 className="campaign-title" style={{ marginTop: '1.25rem' }}>{copy.title}</h2>}
          {copy.description && <p className="campaign-copy" style={{ marginTop: '0.5rem' }}>{copy.description}</p>}

          <div className="campaign-actions" style={{ marginTop: '1.5rem' }}>
            <StyledButton onClick={() => router.navigate({ to: nextRoute as never, replace: true })}>{copy.buttonRegister || resultCopy.buttonContinue || 'Continue'}</StyledButton>
            {showPlayAgainButton && (
              <StyledButton onClick={() => router.navigate({ to: playAgainRoute as never, replace: true })} alternate>{resultCopy.buttonPlayAgain || 'Play again'}</StyledButton>
            )}
            {showLeaderboardButton && (
              <StyledButton onClick={() => router.navigate({ to: leaderboardRoute as never, replace: true })} alternate>{resultCopy.buttonLeaderboard || 'Leaderboard'}</StyledButton>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
