import { getCapeCopy, getCapeProperty } from '~/server/cape/CapeProvider.ts';

type VideoPageId = 'intro-video' | 'loading-video' | 'ad-video' | 'video';

function toCapeModelId(pageId: VideoPageId) {
  return pageId.replace(/-([a-z0-9])/g, (_, chr: string) => chr.toUpperCase());
}

export async function loadVideoData(language: string, pageId: VideoPageId) {
  const modelId = toCapeModelId(pageId);
  const [
    [cta, loadingText],
    introVideo,
    loadingVideo,
    legacyLoadingVideo,
    logo,
    skipAfterSeconds,
  ] = await Promise.all([
    getCapeCopy(language, [
      [modelId, 'cta'],
      [modelId, 'loadingText'],
    ]),
    getCapeProperty({ type: 'general', path: [modelId, 'introVideo'] }),
    getCapeProperty({ type: 'files', path: [modelId, 'loadingVideo'] }),
    getCapeProperty({ type: 'files', path: ['video', 'loadingVideo'] }),
    getCapeProperty({ type: 'general', path: [modelId, 'logo'] }),
    getCapeProperty({ type: 'settings', path: ['pages', modelId, 'skipAfterSeconds'] }),
  ]);

  return {
    copy: {
      cta: cta || 'Skip',
      loadingText: loadingText || 'Loading...',
    },
    videoUrl: introVideo.asFile()?.url ?? loadingVideo.asFile()?.url ?? legacyLoadingVideo.asFile()?.url ?? null,
    logoUrl: logo.asFile()?.url ?? null,
    skipAfterSeconds: skipAfterSeconds.asNumber() ?? 3,
  };
}
