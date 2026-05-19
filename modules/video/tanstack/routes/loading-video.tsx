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
    let cancelled = false;

    if (alwaysSkip) { setCanSkip(true); return; }

    // Start Unity boot in background; navigate when ready
    if (!booted.current) {
      booted.current = true;
      fullBoot()
        .then(() => { if (!cancelled) navigate(); })
        .catch(() => { if (!cancelled) setCanSkip(true); });
    }

    // Fallback: allow skip if Unity never signals ready
    fallbackRef.current = setTimeout(() => { if (!cancelled) setCanSkip(true); }, readyFallbackSec * 1000);

    return () => {
      cancelled = true;
      if (fallbackRef.current) clearTimeout(fallbackRef.current);
    };
  }, [navigate, alwaysSkip, fullBoot, readyFallbackSec]);

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
