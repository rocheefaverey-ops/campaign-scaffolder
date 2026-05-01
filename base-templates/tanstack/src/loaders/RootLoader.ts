import { getCapeCopy, getCapeCopyMapUnity, getCapeProperty } from '~/server/cape/CapeProvider.ts';
import { getBaseUrl, getUnityEnvironment } from '~/utils/Functions.ts';
import LogoImage from '~/assets/images/logo.png';
import { getBlurUri } from '~/server/ImageBlurUri.ts';

export async function loadRootData(language: string) {
  const [
    game,
    [desktopDesc, desktopQr, loadTitle, loadDesc1, loadDesc2, loadDesc3],
    gtmId,
    branding,
    logoPlaceholder,
    unityEnv,
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
    getBlurUri(LogoImage),
    getUnityEnvironment(),
  ]);

  return {
    copy: {
      game,
      desktop: { description: desktopDesc, qrText: desktopQr },
      loading: { title: loadTitle, descriptions: [loadDesc1, loadDesc2, loadDesc3] },
    },
    gtmId: gtmId.asString('GTM-XXXXXXX'),
    branding: branding.asType<Record<string, unknown>>() ?? null,
    logoPlaceholder: logoPlaceholder,
    unityEnvironment: unityEnv,
    baseUrl: getBaseUrl(),
  };
}
