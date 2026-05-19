import { getCapeProperty } from '~/server/cape/CapeProvider.ts';

export async function loadVideoData(language: string) {
  const [videoAsset, minPlaybackProp, alwaysSkipProp, readyFallbackProp] = await Promise.all([
    getCapeProperty({ type: 'general', path: ['video', 'introVideo'] }),
    getCapeProperty({ type: 'settings', path: ['pages', 'video', 'minPlaybackSec'] }),
    getCapeProperty({ type: 'settings', path: ['pages', 'video', 'alwaysSkip'] }),
    getCapeProperty({ type: 'settings', path: ['pages', 'video', 'readyFallbackSec'] }),
  ]);

  return {
    videoUrl:         videoAsset.asFile()?.url ?? null,
    minPlaybackSec:   minPlaybackProp.asNumber()  ?? 3,
    alwaysSkip:       alwaysSkipProp.asBoolean()  ?? false,
    readyFallbackSec: readyFallbackProp.asNumber() ?? 8,
  };
}
