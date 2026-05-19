import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { PageContainer } from '~/components/containers/PageContainer.tsx';
import { loadVideoData } from '~/loaders/VideoLoader.ts';
import { useGameNavigation } from '~/hooks/useGameNavigation.ts';

export const Route = createFileRoute('/video')({
  component: VideoPage,
  loader: async ({ context }) => await loadVideoData(context.language),
});

function VideoPage() {
  const { videoUrl, minPlaybackSec, alwaysSkip } = Route.useLoaderData();
  const { navigate } = useGameNavigation();
  const [canSkip, setCanSkip] = useState(alwaysSkip);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!videoUrl) { navigate(); return; }
    if (alwaysSkip) return;
    timerRef.current = setTimeout(() => setCanSkip(true), minPlaybackSec * 1000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <PageContainer className="campaign-screen campaign-screen--video">
      {videoUrl ? (
        <video
          src={videoUrl}
          className="campaign-video-fill"
          autoPlay
          muted={false}
          playsInline
          onEnded={navigate}
        />
      ) : (
        <div className="campaign-video-placeholder" />
      )}
      {canSkip && (
        <button type="button" className="campaign-video-skip" onClick={navigate}>
          Skip →
        </button>
      )}
    </PageContainer>
  );
}
