import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useEffect, useRef, useTransition } from 'react';
import styles from './index.module.scss';
import { PageContainer } from '~/components/containers/PageContainer.tsx';
import { useUnity } from '~/components/game/UnityContext.tsx';
import { UnityLoader } from '~/components/game/UnityLoader.tsx';

export const Route = createFileRoute('/')({
  component: App,
});

function App() {
  const router = useRouter();
  const { setTargetScene, initializeUnity } = useUnity();
  const [_, startTransition] = useTransition();
  const initialized = useRef(false);

  // Begin loading Unity on mount
  useEffect(() => {
    if (initialized.current) {
      return;
    }
    initialized.current = true;

    startTransition(async () => {
      setTargetScene('example'); // TODO: Replace with actual scene name

      // Preload next route
      await router.preloadRoute({ to: '/launch' });

      // Initialize Unity
      await initializeUnity();

      // Navigate to launch after Unity loading
      router.navigate({ to: '/launch', replace: true });
    });
  }, []);

  return (
    <PageContainer className={styles.index}>
      <UnityLoader />
    </PageContainer>
  );
}
