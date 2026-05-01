import { getCapeCopy } from '~/server/cape/CapeProvider.ts';

export async function loadScoreData(language: string) {
  const [title, description] = await getCapeCopy(language, [
    ['score', 'title'],
    ['score', 'description'],
  ]);

  return {
    copy: {
      title,
      description,
    },
  };
}
