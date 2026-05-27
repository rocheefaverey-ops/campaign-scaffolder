import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { PageContainer } from '~/components/containers/PageContainer.tsx';
import { loadVideoData } from '~/loaders/VideoLoader.ts';

export const Route = createFileRoute('/ad-video')({
  component: AdVideoPage,
  loader: async ({ context }) => await loadVideoData(context.language, 'ad-video'),
});

function AdVideoPage() {
  const { copy, videoUrl, skipAfterSeconds } = Route.useLoaderData();
  const router = useRouter();
  const [canSkip, setCanSkip] = useState(skipAfterSeconds <= 0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goNext = () => void router.navigate({ to: '{{NEXT_AFTER_AD_VIDEO}}' as never, replace: true });

  useEffect(() => {
    if (!videoUrl) { goNext(); return; }
    if (skipAfterSeconds > 0) {
      timerRef.current = setTimeout(() => setCanSkip(true), skipAfterSeconds * 1000);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [videoUrl, skipAfterSeconds]);

  return (
    <PageContainer className="campaign-screen--video" disableTransition>
      {videoUrl ? (
        <video src={videoUrl} className="campaign-video-fill" autoPlay muted playsInline onEnded={goNext} />
      ) : (
        <div className="campaign-video-placeholder" />
      )}
      {canSkip && (
        <button type="button" className="campaign-video-skip" onClick={goNext}>{copy.cta}</button>
      )}
    </PageContainer>
  );
}
