import { getCapeCopy, getCapeProperty } from '~/server/cape/CapeProvider.ts';
import type { CapeProperty } from '~/server/cape/CapeProperty.ts';

// CAPE's File field can be present-but-empty: { url: "" } or { url: undefined }.
// Treat anything that isn't a real, non-empty URL as null so the component falls
// back to the CSS visual instead of rendering <img src=""> (which shows the
// browser's broken-image icon).
function urlOrNull(prop: CapeProperty): string | null {
  const url = prop.asFile()?.url;
  return typeof url === 'string' && url.trim().length > 0 ? url : null;
}

export async function loadTutorialData(language: string) {
  const [
    copy,
    step1OnboardingImage,
    step2OnboardingImage,
    step3OnboardingImage,
    step1TutorialImage,
    step2TutorialImage,
    step3TutorialImage,
  ] = await Promise.all([
    getCapeCopy(language, [
      ['tutorial', 'headline'],
      ['tutorial', 'subline'],
      ['tutorial', 'cta'],
      ['tutorial', 'ctaNext'],
      ['tutorial', 'header'],
      ['tutorial', 'step1Title'],
      ['tutorial', 'step1Body'],
      ['tutorial', 'step2Title'],
      ['tutorial', 'step2Body'],
      ['tutorial', 'step3Title'],
      ['tutorial', 'step3Body'],
      ['tutorial', 'step1', 'title'],
      ['tutorial', 'step1', 'description'],
      ['tutorial', 'step2', 'title'],
      ['tutorial', 'step2', 'description'],
      ['tutorial', 'step3', 'title'],
      ['tutorial', 'step3', 'description'],
      ['tutorial', 'buttonNext'],
      ['tutorial', 'buttonReady'],
    ]),
    getCapeProperty({ type: 'files', path: ['onboarding', 'step1Image'] }),
    getCapeProperty({ type: 'files', path: ['onboarding', 'step2Image'] }),
    getCapeProperty({ type: 'files', path: ['onboarding', 'step3Image'] }),
    getCapeProperty({ type: 'files', path: ['tutorial', 'step1Image'] }),
    getCapeProperty({ type: 'files', path: ['tutorial', 'step2Image'] }),
    getCapeProperty({ type: 'files', path: ['tutorial', 'step3Image'] }),
  ]);

  const [
    headline,
    subline,
    cta,
    ctaNext,
    header,
    step1Title,
    step1Body,
    step2Title,
    step2Body,
    step3Title,
    step3Body,
    legacyStep1Title,
    legacyStep1Description,
    legacyStep2Title,
    legacyStep2Description,
    legacyStep3Title,
    legacyStep3Description,
    buttonNext,
    buttonReady,
  ] = copy;

  return {
    copy: {
      header: header || headline || 'How to play',
      headline,
      subline,
      cta: cta || buttonReady,
      ctaNext: ctaNext || buttonNext,
    },
    steps: [
      {
        title: step1Title || legacyStep1Title,
        description: step1Body || legacyStep1Description,
        image: urlOrNull(step1TutorialImage) ?? urlOrNull(step1OnboardingImage),
      },
      {
        title: step2Title || legacyStep2Title,
        description: step2Body || legacyStep2Description,
        image: urlOrNull(step2TutorialImage) ?? urlOrNull(step2OnboardingImage),
      },
      {
        title: step3Title || legacyStep3Title,
        description: step3Body || legacyStep3Description,
        image: urlOrNull(step3TutorialImage) ?? urlOrNull(step3OnboardingImage),
      },
    ],
  };
}
