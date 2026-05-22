import { getCapeCopy, getCapeCopyMapUnity, getCapeProperty } from '~/server/cape/CapeProvider.ts';
import { getBaseUrl, getUnityEnvironment } from '~/utils/Functions.ts';
import LogoImage from '~/assets/images/logo.svg';
import { getBlurUri } from '~/server/ImageBlurUri.ts';
import { getNonce } from '~/server/middleware/SecurityMiddleware.ts';

export async function loadRootData(language: string) {
  const [
    game,
    [desktopDesc, desktopQr, loadTitle, loadDesc1, loadDesc2, loadDesc3],
    gtmId,
    branding,
    desktopLogo,
    desktopBackground,
    landingBackground,
    landingBackgroundImage,
    loadingLogo,
    loadingBackground,
    loadingVideo,
    logoPlaceholder,
    unityEnv,
    sceneKeyProp,
  ] = await Promise.all([
    getCapeCopyMapUnity(language, ['game']),
    getCapeCopy(language, [
      ['desktop', 'description'],
      ['desktop', 'qrText'],
      ['loading', 'title'],
      ['loading', 'description1'],
      ['loading', 'description2'],
      ['loading', 'description3'],
    ]),
    getCapeProperty({ type: 'settings', path: ['tagmanager'] }),
    getCapeProperty({ type: 'settings', path: ['branding'] }),
    getCapeProperty({ type: 'desktop', path: ['logo'] }),
    getCapeProperty({ type: 'desktop', path: ['backgroundIllustration'] }),
    getCapeProperty({ type: 'general', path: ['landing', 'background'] }),
    getCapeProperty({ type: 'files', path: ['landing', 'backgroundImage'] }),
    getCapeProperty({ type: 'general', path: ['loading', 'logo'] }),
    getCapeProperty({ type: 'general', path: ['loading', 'background'] }),
    getCapeProperty({ type: 'files', path: ['video', 'loadingVideo'] }),
    getBlurUri(LogoImage),
    getUnityEnvironment(),
    getCapeProperty({ type: 'settings', path: ['game', 'sceneKey', 'value'] }),
  ]);

  // Sensible defaults when CAPE hasn't been populated yet (fresh scaffold) so
  // the loading screen still looks intentional. Empty descriptions are dropped
  // so the TextScroller doesn't render an empty row.
  const loadingDescriptions = [loadDesc1, loadDesc2, loadDesc3].filter(
    (d): d is string => typeof d === 'string' && d.trim().length > 0,
  );
  if (loadingDescriptions.length === 0) {
    loadingDescriptions.push('Preparing your experience', 'This will only take a moment');
  }

  const loadingBackgroundUrl = loadingBackground.asFile()?.url ?? loadingVideo.asFile()?.url ?? null;

  return {
    copy: {
      game,
      desktop: { description: desktopDesc, qrText: desktopQr },
      loading: {
        title: loadTitle?.trim() ? loadTitle : 'Loading…',
        descriptions: loadingDescriptions,
      },
    },
    gtmId: gtmId.asString('GTM-XXXXXXX'),
    branding: branding.asType<Record<string, unknown>>() ?? null,
    desktop: {
      logoUrl: desktopLogo.asFile()?.url ?? null,
      backgroundUrl: desktopBackground.asFile()?.url
        ?? landingBackground.asFile()?.url
        ?? landingBackgroundImage.asFile()?.url
        ?? null,
    },
    loading: {
      logoUrl: loadingLogo.asFile()?.url ?? null,
      backgroundUrl: loadingBackgroundUrl,
      isBackgroundVideo: !!loadingBackgroundUrl && /\.(mp4|webm|mov)$/i.test(loadingBackgroundUrl),
    },
    logoPlaceholder: logoPlaceholder,
    unityEnvironment: unityEnv,
    baseUrl: getBaseUrl(),
    nonce: getNonce(),
    sceneKey: process.env.UNITY_SCENE_KEY || sceneKeyProp.asString('game'),
  };
}
