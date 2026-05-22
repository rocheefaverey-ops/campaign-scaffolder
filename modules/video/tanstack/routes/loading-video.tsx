import { createFileRoute, useLoaderData, useRouter } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { PageContainer } from '~/components/containers/PageContainer.tsx';
import { useUnity } from '~/components/game/UnityContext.tsx';
import { loadVideoData } from '~/loaders/VideoLoader.ts';

export const Route = createFileRoute('/loading-video')({
  component: LoadingVideoPage,
  loader: async ({ context }) => await loadVideoData(context.language, 'loading-video'),
});

function LoadingVideoPage() {
  const { copy, videoUrl, logoUrl } = Route.useLoaderData();
  const { copy: sharedCopy, sceneKey } = useLoaderData({ from: '__root__' });
  const { setTargetScene, setData, fullBoot } = useUnity();
  const router = useRouter();
  const [canContinue, setCanContinue] = useState(false);
  const started = useRef(false);

  const goGame = () => void router.navigate({ to: '/game', replace: true });

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    setTargetScene(sceneKey);
    setData({ translations: sharedCopy.game });

    fullBoot()
      .then(goGame)
      .catch((error) => {
        console.error('Unity loading video failed to boot game:', error);
        setCanContinue(true);
      });
  }, [fullBoot, sceneKey, setData, setTargetScene, sharedCopy.game]);

  return (
    <PageContainer className="campaign-screen--video" disableTransition>
      {videoUrl ? (
        <video src={videoUrl} className="campaign-video-fill" autoPlay muted loop playsInline />
      ) : (
        <div className="campaign-video-loader" aria-label={copy.loadingText}>
          <span className="campaign-spinner" />
          <span>{copy.loadingText}</span>
        </div>
      )}
      {logoUrl && <img src={logoUrl} alt="" className="campaign-video-logo" />}
      {canContinue && (
        <button type="button" className="campaign-video-skip" onClick={goGame}>{copy.cta}</button>
      )}
    </PageContainer>
  );
}
