import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { PageContainer } from '~/components/containers/PageContainer.tsx';
import { useGameNavigation } from '~/hooks/useGameNavigation.ts';
import { loadVideoData } from '~/loaders/VideoLoader.ts';

export const Route = createFileRoute('/video')({
  component: VideoPage,
  loader: async ({ context }) => await loadVideoData(context.language, 'video'),
});

function VideoPage() {
  const { copy, videoUrl, skipAfterSeconds } = Route.useLoaderData();
  const { navigate } = useGameNavigation();
  const [canSkip, setCanSkip] = useState(skipAfterSeconds <= 0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!videoUrl) { navigate(); return; }
    if (skipAfterSeconds > 0) {
      timerRef.current = setTimeout(() => setCanSkip(true), skipAfterSeconds * 1000);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [navigate, videoUrl, skipAfterSeconds]);

  return (
    <PageContainer className="campaign-screen--video" disableTransition>
      {videoUrl ? (
        <video src={videoUrl} className="campaign-video-fill" autoPlay muted playsInline onEnded={navigate} />
      ) : (
        <div className="campaign-video-placeholder" />
      )}
      {canSkip && (
        <button type="button" className="campaign-video-skip" onClick={navigate}>{copy.cta}</button>
      )}
    </PageContainer>
  );
}
