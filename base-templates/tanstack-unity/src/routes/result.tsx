import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import type { IConfettiConfig } from '~/components/confetti/engine/ConfettiEngine.ts';
import { PageContainer } from '~/components/containers/PageContainer.tsx';
import { useUnityStore } from '~/hooks/stores/useUnityStore.ts';
import { StyledButton } from '~/components/buttons/StyledButton.tsx';
import { ConfettiOverlay } from '~/components/confetti/ConfettiOverlay.tsx';
import { loadResultData } from '~/loaders/ResultLoader.ts';

const REGISTERED_KEY = 'lw_registered_{{CAPE_ID}}';
const isRegistered = () =>
  typeof window !== 'undefined' && window.localStorage.getItem(REGISTERED_KEY) === '1';

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
  const nextAfterResult = '{{NEXT_AFTER_RESULT}}';
  const nextAfterRegisterRaw = '{{NEXT_AFTER_REGISTER}}';
  const nextAfterRegister = nextAfterRegisterRaw.startsWith('{{') ? nextAfterResult : nextAfterRegisterRaw;
  const playAgainRoute = '{{PLAY_AGAIN_ROUTE}}';
  const leaderboardRoute = '{{RESULT_LEADERBOARD_ROUTE}}';
  const resultCopy = copy as typeof copy & Record<string, string | undefined>;
  // Derived from the result cta-group block at scaffold time (see flow-bridge).
  // Unreplaced tokens fall back to the historical defaults (play again on, rest off).
  const showPlayAgainButtonRaw = '{{SHOW_RESULT_PLAY_AGAIN_BUTTON}}';
  const showPlayAgainButton = showPlayAgainButtonRaw.startsWith('{{') ? true : showPlayAgainButtonRaw === 'true';
  const showLeaderboardButtonRaw = '{{SHOW_RESULT_LEADERBOARD_BUTTON}}';
  const showLeaderboardButton = showLeaderboardButtonRaw.startsWith('{{') ? false : showLeaderboardButtonRaw === 'true';
  const resultVisualUrl = winImageUrl || backgroundUrl;
  const isVideoVisual = !!resultVisualUrl && /\.(mp4|webm|mov)$/i.test(resultVisualUrl);

  // If the user has already registered for this campaign, skip the register
  // page on Continue and use the neutral "Continue" label instead of "Register".
  const [hasRegistered, setHasRegistered] = useState(false);
  useEffect(() => { setHasRegistered(isRegistered()); }, []);
  const nextRoute = hasRegistered ? nextAfterRegister : nextAfterResult;
  const continueLabel = hasRegistered
    ? (resultCopy.buttonContinue || 'Continue')
    : (copy.buttonRegister || resultCopy.buttonContinue || 'Continue');

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
            <StyledButton onClick={() => router.navigate({ to: nextRoute as never, replace: true })}>{continueLabel}</StyledButton>
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
