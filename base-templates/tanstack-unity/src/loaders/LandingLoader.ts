import { getCapeCopy, getCapeProperty } from '~/server/cape/CapeProvider.ts';

export async function loadLandingData(language: string) {
  const [
    [headline, subline, cta, kicker, title, description, buttonStart],
    generalBackground,
    fileBackgroundImage,
    fileHeroImage,
    fileHeroVideo,
    pageLogoImage,
    headerLogoImage,
  ] = await Promise.all([
    getCapeCopy(language, [
      ['landing', 'headline'],
      ['landing', 'subline'],
      ['landing', 'cta'],
      ['landing', 'kicker'],
      ['landing', 'title'],
      ['landing', 'description'],
      ['landing', 'buttonStart'],
    ]),
    getCapeProperty({ type: 'general', path: ['landing', 'background'] }),
    getCapeProperty({ type: 'files', path: ['landing', 'backgroundImage'] }),
    getCapeProperty({ type: 'files', path: ['landing', 'heroImage'] }),
    getCapeProperty({ type: 'files', path: ['landing', 'heroVideo'] }),
    getCapeProperty({ type: 'general', path: ['landing', 'logo'] }),
    getCapeProperty({ type: 'general', path: ['header', 'logo'] }),
  ]);

  return {
    copy: {
      title: headline || title,
      description: subline || description,
      button: cta || buttonStart,
      kicker,
    },
    heroUrl:
      generalBackground.asFile()?.url ??
      fileBackgroundImage.asFile()?.url ??
      fileHeroImage.asFile()?.url ??
      fileHeroVideo.asFile()?.url ??
      null,
    pageLogoUrl:   pageLogoImage.asFile()?.url   ?? null,
    headerLogoUrl: headerLogoImage.asFile()?.url ?? null,
  };
}
