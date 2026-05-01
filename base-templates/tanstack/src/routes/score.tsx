import { createFileRoute } from '@tanstack/react-router';
import styles from './score.module.scss';
import type { IConfettiConfig } from '~/components/confetti/engine/ConfettiEngine.ts';
import { PageContainer } from '~/components/containers/PageContainer.tsx';
import { useUnityStore } from '~/hooks/stores/useUnityStore.ts';
import { StyledText } from '~/components/texts/StyledText.tsx';
import { StyledButton } from '~/components/buttons/StyledButton.tsx';
import { ConfettiOverlay } from '~/components/confetti/ConfettiOverlay.tsx';
import { loadScoreData } from '~/loaders/ScoreLoader.ts';

const confettiConfig: IConfettiConfig = {
  maxParticleCount: 30,
  spawnRate: 500,
  speed: { min: 20, max: 40 },
  scale: { min: 0.5, max: 0.8 },
  drift: { min: -0.5, max: 0.5 },
  spin: { min: -1, max: 1 },
  wobble: { amplitude: 30, speed: { min: 1, max: 3 } },
};

export const Route = createFileRoute('/score')({
  component: Score,
  loader: async ({ context }) => await loadScoreData(context.language),
});

function Score() {
  const result = useUnityStore((state) => state.result);
  const { copy } = Route.useLoaderData();

  return (
    <PageContainer className={styles.score}>
      <ConfettiOverlay config={confettiConfig} visual={'confetti'} visualCount={2} />

      <StyledText type={'header'} alternate>{result.playTime}</StyledText>
      <StyledText type={'title'} marginTop={8} alternate>{copy.title}</StyledText>
      <StyledText type={'description'} marginTop={8} alternate>{copy.description}</StyledText>
      <StyledButton linkOptions={{ to: '/register' }} marginTop={16}>Register</StyledButton>
    </PageContainer>
  );
}
