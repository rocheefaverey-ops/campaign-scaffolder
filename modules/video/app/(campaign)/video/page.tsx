'use client';

import { useRouter } from 'next/navigation';
import { useCapeData } from '@hooks/useCapeData';
import VideoIntro from '@components/_modules/VideoIntro/VideoIntro';

export default function VideoPage() {
  const router = useRouter();
  const capeData = useCapeData();

  // TODO: update this path to match your CAPE structure
  const videoSrc = capeData?.intro?.video?.src as string | undefined;

  const handleEnd = () => {
    router.push('{{NEXT_AFTER_VIDEO}}');
  };

  if (!videoSrc) {
    // No video configured — skip straight through
    handleEnd();
    return null;
  }

  return (
    <main className="h-full w-full">
      <VideoIntro src={videoSrc} onEnd={handleEnd} skipAfterSeconds={3} />
    </main>
  );
}
