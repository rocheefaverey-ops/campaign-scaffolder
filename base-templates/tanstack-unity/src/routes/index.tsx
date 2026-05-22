import { createFileRoute, useLoaderData, useRouter } from '@tanstack/react-router';
import { useEffect, useRef, useTransition } from 'react';
import styles from './index.module.scss';
import { PageContainer } from '~/components/containers/PageContainer.tsx';
import { useUnity } from '~/components/game/UnityContext.tsx';
import { UnityLoader } from '~/components/game/UnityLoader.tsx';

// Mirrors the pattern used by all current TanStack production campaigns
// (NHL Crush, Achmea Autozeker, HEMA Stapelgek): the index route shows the
// branded loader while Unity initialises, then forwards to /landing.
export const Route = createFileRoute('/')({
  component: App,
});

function App() {
  const router = useRouter();
  const { sceneKey } = useLoaderData({ from: '__root__' });
  const { setTargetScene, initializeUnity } = useUnity();
  const [_, startTransition] = useTransition();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    startTransition(async () => {
      setTargetScene(sceneKey);

      await router.preloadRoute({ to: '/landing' });
      await initializeUnity();

      // viewTransition: false — Unity is still mutating the DOM right now
      // (canvas, audio context, addressable bundles), and a view transition
      // started here gets aborted by those mutations and surfaces as
      // "InvalidStateError: Transition was aborted". Subsequent user-driven
      // navigations still animate.
      router.navigate({ to: '/landing', replace: true, viewTransition: false });
    });
  }, []);

  return (
    <PageContainer className={styles.index}>
      <UnityLoader />
    </PageContainer>
  );
}
