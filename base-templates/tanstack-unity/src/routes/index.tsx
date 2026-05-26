import { createFileRoute, useLoaderData, useRouter } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { useUnity } from '~/components/game/UnityContext.tsx';

// Silent handoff route: send the visitor straight into the scaffolded entry
// page. The visible loading experience belongs to the configured flow.
export const Route = createFileRoute('/')({
  component: App,
});

function App() {
  const router = useRouter();
  const entryRoute = '{{FLOW_ENTRY}}';
  const { sceneKey } = useLoaderData({ from: '__root__' });
  const { setTargetScene } = useUnity();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    setTargetScene(sceneKey);
    void router.preloadRoute({ to: entryRoute as never });
    void router.navigate({ to: entryRoute as never, replace: true, viewTransition: false });
  }, []);

  return null;
}
