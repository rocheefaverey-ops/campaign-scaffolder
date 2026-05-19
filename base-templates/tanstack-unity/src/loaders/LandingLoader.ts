import { getCapeCopy, getCapeProperty } from '~/server/cape/CapeProvider.ts';

export async function loadLandingData(language: string) {
  const [[title, description, button, kicker], heroImage, pageLogoImage, headerLogoImage] = await Promise.all([
    getCapeCopy(language, [
      ['landing', 'headline'],
      ['landing', 'subline'],
      ['landing', 'cta'],
      ['landing', 'kicker'],
    ]),
    getCapeProperty({ type: 'general', path: ['landing', 'background'] }),
    getCapeProperty({ type: 'general', path: ['landing', 'logo'] }),
    getCapeProperty({ type: 'general', path: ['header', 'logo'] }),
  ]);

  return {
    copy: { title, description, button, kicker },
    heroUrl:       heroImage.asFile()?.url      ?? null,
    pageLogoUrl:   pageLogoImage.asFile()?.url  ?? null,
    headerLogoUrl: headerLogoImage.asFile()?.url ?? null,
  };
}
