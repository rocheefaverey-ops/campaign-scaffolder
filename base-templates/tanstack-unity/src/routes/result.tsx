import { createFileRoute } from '@tanstack/react-router';
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
  const { copy } = Route.useLoaderData();

  return (
    <PageContainer className="campaign-screen--hero">
      <ConfettiOverlay config={confettiConfig} visual="confetti" visualCount={2} />
      <div className="campaign-hero-shade" />

      <div className="campaign-shell">
        <div />

        <div className="campaign-hero-content">
          <div className="result-plate">
            <span className="result-plate__label">{copy.scoreLabel || 'Your score'}</span>
            <span className="result-plate__score">{result.playTime}</span>
          </div>

          {copy.title && <h2 className="campaign-title" style={{ marginTop: '1.25rem' }}>{copy.title}</h2>}
          {copy.description && <p className="campaign-copy" style={{ marginTop: '0.5rem' }}>{copy.description}</p>}

          <div className="campaign-actions" style={{ marginTop: '1.5rem' }}>
            <StyledButton linkOptions={{ to: '/register' }}>Register</StyledButton>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
