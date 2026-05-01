import { getCapeCopy } from '~/server/cape/CapeProvider.ts';

export async function loadTutorialData(language: string) {
  const [step1Title, step1Description, step2Title, step2Description, step3Title, step3Description, buttonNext, buttonReady] = await getCapeCopy(language, [
    ['tutorial', 'step1', 'title'],
    ['tutorial', 'step1', 'description'],
    ['tutorial', 'step2', 'title'],
    ['tutorial', 'step2', 'description'],
    ['tutorial', 'step3', 'title'],
    ['tutorial', 'step3', 'description'],
    ['tutorial', 'buttonNext'],
    ['tutorial', 'buttonReady'],
  ]);

  return {
    steps: [
      {
        title: step1Title,
        description: step1Description,
        button: buttonNext,
      },
      {
        title: step2Title,
        description: step2Description,
        button: buttonNext,
      },
      {
        title: step3Title,
        description: step3Description,
        button: buttonReady,
      },
    ],
  };
}
