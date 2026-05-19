import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { PageContainer } from '~/components/containers/PageContainer.tsx';
import { loadVideoData } from '~/loaders/VideoLoader.ts';
import { useGameNavigation } from '~/hooks/useGameNavigation.ts';
import { useUnity } from '~/components/game/UnityContext.tsx';

export const Route = createFileRoute('/loading-video')({
  component: LoadingVideoPage,
  loader: async ({ context }) => await loadVideoData(context.language),
});

function LoadingVideoPage() {
  const { videoUrl, alwaysSkip, readyFallbackSec } = Route.useLoaderData();
  const { navigate } = useGameNavigation();
  const { fullBoot } = useUnity();
  const [canSkip, setCanSkip] = useState(alwaysSkip);
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const booted = useRef(false);

  useEffect(() => {
    if (alwaysSkip) { setCanSkip(true); return; }

    // Start Unity boot in background; navigate when ready
    if (!booted.current) {
      booted.current = true;
      fullBoot()
        .then(() => navigate())
        .catch(() => setCanSkip(true));
    }

    // Fallback: allow skip if Unity never signals ready
    fallbackRef.current = setTimeout(() => setCanSkip(true), readyFallbackSec * 1000);
    return () => { if (fallbackRef.current) clearTimeout(fallbackRef.current); };
  }, []);

  return (
    <PageContainer className="campaign-screen campaign-screen--video">
      {videoUrl ? (
        <video src={videoUrl} className="campaign-video-fill" autoPlay muted loop playsInline />
      ) : (
        <div className="campaign-video-loader" aria-label="Loading game…">
          <span className="campaign-spinner" />
        </div>
      )}
      {canSkip && (
        <button type="button" className="campaign-video-skip" onClick={navigate}>Skip →</button>
      )}
    </PageContainer>
  );
}
