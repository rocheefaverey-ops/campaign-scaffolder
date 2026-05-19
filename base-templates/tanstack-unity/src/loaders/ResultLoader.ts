import { getCapeCopy } from '~/server/cape/CapeProvider.ts';

export async function loadResultData(language: string) {
  const [title, description, scoreLabel] = await getCapeCopy(language, [
    ['result', 'headline'],
    ['result', 'kicker'],
    ['result', 'scoreLabel'],
  ]);

  return {
    copy: { title, description, scoreLabel },
  };
}
