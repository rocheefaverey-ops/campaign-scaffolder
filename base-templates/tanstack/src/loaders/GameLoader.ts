import { getCapeTranslatedProperty } from '~/server/cape/CapeProvider.ts';

export async function loadGameData(language: string) {
  const terms = await getCapeTranslatedProperty(language, { type: 'files', path: ['pdfs', 'terms'] });

  return {
    copy: {
      terms: terms.asFile()?.url,
    },
  };
}
