import { getCapeCopy } from '~/server/cape/CapeProvider.ts';

export async function loadLaunchData(language: string) {
  const [title, description, button] = await getCapeCopy(language, [
    ['launch', 'title'],
    ['launch', 'description'],
    ['launch', 'buttonStart'],
  ]);

  return {
    copy: {
      title,
      description,
      button,
    },
  };
}
