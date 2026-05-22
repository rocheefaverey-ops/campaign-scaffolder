import { getCapeCopy, getCapeProperty } from '~/server/cape/CapeProvider.ts';

export async function loadResultData(language: string) {
  const [[headline, subline, kicker, scoreLabel, ctaContinue, ctaRegister, title, description, buttonRegister], background, logo, winImage, loseImage] = await Promise.all([
    getCapeCopy(language, [
      ['result', 'headline'],
      ['result', 'subline'],
      ['result', 'kicker'],
      ['result', 'scoreLabel'],
      ['result', 'ctaContinue'],
      ['result', 'ctaRegister'],
      ['result', 'title'],
      ['result', 'description'],
      ['result', 'buttonRegister'],
    ]),
    getCapeProperty({ type: 'general', path: ['result', 'background'] }),
    getCapeProperty({ type: 'general', path: ['result', 'logo'] }),
    getCapeProperty({ type: 'files', path: ['result', 'winImage'] }),
    getCapeProperty({ type: 'files', path: ['result', 'loseImage'] }),
  ]);

  return {
    copy: {
      title: headline || title,
      description: subline || description || kicker,
      scoreLabel,
      buttonRegister: ctaRegister || buttonRegister || ctaContinue,
    },
    backgroundUrl: background.asFile()?.url ?? null,
    logoUrl: logo.asFile()?.url ?? null,
    winImageUrl: winImage.asFile()?.url ?? null,
    loseImageUrl: loseImage.asFile()?.url ?? null,
  };
}
