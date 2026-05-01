/**
 * cli/tanstack-page-builder.js
 *
 * Page builder for the TanStack (unity-tanstack-boilerplate) stack.
 * Generates route files (.tsx) and loader files (.ts) matching the
 * exact patterns used in unity-tanstack-boilerplate/frontend/src/routes/.
 *
 * Usage:
 *   import { TS_PAGE_ELEMENTS, TS_PAGE_DEFAULTS, buildTsPage } from './tanstack-page-builder.js';
 *
 *   const { route, loader } = buildTsPage('launch', ['logo', 'title', 'cta-play']);
 */

// ─── Constants ────────────────────────────────────────────────────────────────

export const TS_ALL_PAGES = ['launch', 'tutorial', 'game', 'register', 'score'];

export const TS_PAGE_ROUTES = {
  launch:   '/launch',
  tutorial: '/tutorial',
  game:     '/game',
  register: '/register',
  score:    '/score',
};

// ─── Element catalogue ────────────────────────────────────────────────────────

export const TS_ELEMENT_CATALOGUE = {
  // ── Launch ──────────────────────────────────────────────────────────────────
  'logo': {
    label: 'Logo image',
    description: 'Brand logo from static asset (logo.png)',
    pages: ['launch'],
  },
  'title': {
    label: 'Title',
    description: 'Main heading from CAPE copy',
    pages: ['launch', 'score'],
  },
  'description': {
    label: 'Description',
    description: 'Body text from CAPE copy',
    pages: ['launch', 'score'],
  },
  'cta-play': {
    label: 'Play button',
    description: 'Primary CTA — navigates to /game',
    pages: ['launch'],
  },
  'cta-tutorial': {
    label: 'Tutorial button',
    description: 'Secondary link button to /tutorial',
    pages: ['launch'],
  },
  // ── Tutorial ─────────────────────────────────────────────────────────────────
  'steps': {
    label: 'Tutorial steps',
    description: 'ContentSlider carousel with how-to-play steps',
    pages: ['tutorial'],
  },
  'skip': {
    label: 'Skip button',
    description: 'Close icon button — skips directly to game',
    pages: ['tutorial'],
  },
  // ── Score ─────────────────────────────────────────────────────────────────────
  'confetti': {
    label: 'Confetti animation',
    description: 'Full-screen confetti particle overlay',
    pages: ['score'],
  },
  'play-time': {
    label: 'Play time / score display',
    description: 'Shows game result (playTime) from Unity store',
    pages: ['score'],
  },
  'cta-register': {
    label: 'Register button',
    description: 'Primary CTA linking to /register',
    pages: ['score'],
  },
  'cta-play-again': {
    label: 'Play again button',
    description: 'Alternate link button back to /launch',
    pages: ['score'],
  },
  // ── Register ─────────────────────────────────────────────────────────────────
  'reg-title': {
    label: 'Title',
    description: 'Registration page heading from CAPE',
    pages: ['register'],
  },
  'reg-description': {
    label: 'Description',
    description: 'Registration page body text from CAPE',
    pages: ['register'],
  },
  'field-name': {
    label: 'Name field',
    description: 'Text input for player name',
    pages: ['register'],
  },
  'field-email': {
    label: 'Email field',
    description: 'Email input',
    pages: ['register'],
  },
  'field-password': {
    label: 'Password fields',
    description: 'Password + repeat password inputs',
    pages: ['register'],
  },
  'field-country': {
    label: 'Country selector',
    description: 'Select dropdown for country',
    pages: ['register'],
  },
  'field-optin-1': {
    label: 'Opt-in 1 (required)',
    description: 'Required checkbox with terms & conditions link',
    pages: ['register'],
  },
  'field-optin-2': {
    label: 'Opt-in 2 (optional)',
    description: 'Optional marketing/newsletter checkbox',
    pages: ['register'],
  },
  'cta-back': {
    label: 'Back button',
    description: 'Alternate link button back to /launch',
    pages: ['register'],
  },
};

export const TS_PAGE_DEFAULTS = {
  launch:   ['logo', 'title', 'description', 'cta-play', 'cta-tutorial'],
  tutorial: ['steps', 'skip'],
  game:     [],
  register: ['reg-title', 'reg-description', 'field-name', 'field-email', 'field-country', 'field-optin-1', 'cta-back'],
  score:    ['confetti', 'play-time', 'title', 'description', 'cta-register'],
};

export const TS_PAGE_ELEMENTS = {
  launch:   ['logo', 'title', 'description', 'cta-play', 'cta-tutorial'],
  tutorial: ['steps', 'skip'],
  game:     [],
  register: ['reg-title', 'reg-description', 'field-name', 'field-email', 'field-password', 'field-country', 'field-optin-1', 'field-optin-2', 'cta-back'],
  score:    ['confetti', 'play-time', 'title', 'description', 'cta-register', 'cta-play-again'],
};

// ─── Launch page ──────────────────────────────────────────────────────────────

function buildLaunchRoute(els) {
  const hasLogo    = els.includes('logo');
  const hasTitle   = els.includes('title');
  const hasDesc    = els.includes('description');
  const hasCta     = els.includes('cta-play');
  const hasTutBtn  = els.includes('cta-tutorial');

  const lines = [
    `import { createFileRoute, useLoaderData } from '@tanstack/react-router';`,
    hasLogo   ? `import { SmartImage } from '~/components/visuals/SmartImage.tsx';` : '',
    hasLogo   ? `import VisualImage from '~/assets/images/logo.svg';` : '',
    `import { PageContainer } from '~/components/containers/PageContainer.tsx';`,
    (hasTitle || hasDesc) ? `import { StyledText } from '~/components/texts/StyledText.tsx';` : '',
    (hasCta || hasTutBtn) ? `import { StyledButton } from '~/components/buttons/StyledButton.tsx';` : '',
    `import { loadLaunchData } from '~/routes/-loaders/launchLoader.ts';`,
    hasCta    ? `import { useGameNavigation } from '~/hooks/useGameNavigation.ts';` : '',
    `import styles from './launch.module.scss';`,
  ].filter(Boolean).join('\n');

  const body = [
    hasLogo   ? `      <SmartImage src={VisualImage} alt={'logo'} width={240} aspectRatio={2} placeholder={logoPlaceholder} />` : '',
    hasTitle  ? `      <StyledText type={'title'} marginTop={16} alternate>{copy.title}</StyledText>` : '',
    hasDesc   ? `      <StyledText type={'description'} marginTop={8} alternate>{copy.description}</StyledText>` : '',
    hasCta    ? `      <StyledButton marginTop={16} loading={isPending} onClick={navigate}>{copy.button}</StyledButton>` : '',
    hasTutBtn ? `      <StyledButton marginTop={8} linkOptions={{ to: '/tutorial' }} alternate>Tutorial</StyledButton>` : '',
  ].filter(Boolean).join('\n');

  return `${lines}

export const Route = createFileRoute('/launch')({
  component: Launch,
  loader: async ({ context }) => await loadLaunchData(context.language),
});

function Launch() {
  const { copy } = Route.useLoaderData();
  ${hasLogo ? `const { logoPlaceholder } = useLoaderData({ from: '__root__' });` : ''}
  ${hasCta  ? `const { isPending, navigate } = useGameNavigation();` : ''}

  return (
    <PageContainer className={styles.launch}>
${body}
    </PageContainer>
  );
}
`;
}

function buildLaunchLoader(els) {
  const hasTitle = els.includes('title');
  const hasDesc  = els.includes('description');
  const hasCta   = els.includes('cta-play');

  const vars  = [hasTitle && 'title', hasDesc && 'description', hasCta && 'button'].filter(Boolean);
  const paths = [
    hasTitle && `    ['launch', 'title'],`,
    hasDesc  && `    ['launch', 'description'],`,
    hasCta   && `    ['launch', 'buttonStart'],`,
  ].filter(Boolean).join('\n');

  const copy = vars.map(v => `      ${v},`).join('\n');

  return `import { getCapeCopy } from '~/server/cape/CapeProvider.ts';

export async function loadLaunchData(language: string) {
  const [${vars.join(', ')}] = await getCapeCopy(language, [
${paths}
  ]);

  return {
    copy: {
${copy}
    },
  };
}
`;
}

// ─── Tutorial page ────────────────────────────────────────────────────────────

function buildTutorialRoute(els, stepCount) {
  const hasSteps = els.includes('steps');
  const hasSkip  = els.includes('skip');

  const stepsArr = Array.from({ length: stepCount }, (_, i) => `    { image: LogoVisual, ...copy.step${i + 1} },`).join('\n');

  return `import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useRef } from 'react';
import type { IContentSliderItem } from '~/components/slider/ContentSliderItem.tsx';
import type { IContentSliderHandle } from '~/components/slider/ContentSlider.tsx';
${hasSteps ? `import { ContentSlider } from '~/components/slider/ContentSlider.tsx';` : ''}
import { PageContainer } from '~/components/containers/PageContainer.tsx';
import LogoVisual from '~/assets/images/logo.svg';
import { loadTutorialData } from '~/routes/-loaders/tutorialLoader.ts';
import { useGameNavigation } from '~/hooks/useGameNavigation.ts';
${hasSkip ? `import { IconButton } from '~/components/buttons/IconButton.tsx';` : ''}
import styles from './tutorial.module.scss';

export const Route = createFileRoute('/tutorial')({
  component: Tutorial,
  loader: async ({ context }) => await loadTutorialData(context.language),
});

function Tutorial() {
  const { copy } = Route.useLoaderData();
  const { isPending, navigate } = useGameNavigation();
  ${hasSteps ? `const contentRef = useRef<IContentSliderHandle>(null);` : ''}

  ${hasSteps ? `const data: Array<IContentSliderItem> = [
${stepsArr}
  ];

  const onItemClicked = useCallback((_: number, isLast: boolean) => {
    if (!isLast) { contentRef.current?.goToNext(); } else { navigate(); }
  }, [navigate]);` : ''}

  return (
    <PageContainer className={styles.tutorial}>
      ${hasSteps ? `<ContentSlider ref={contentRef} items={data} loading={isPending} onItemClicked={onItemClicked} />` : ''}
      ${hasSkip  ? `<IconButton icon={'close'} loading={isPending} onClick={navigate} />` : ''}
    </PageContainer>
  );
}
`;
}

function buildTutorialLoader(els, stepCount) {
  const paths = [];
  const vars  = [];
  for (let i = 1; i <= stepCount; i++) {
    paths.push(`    ['tutorial', 'step${i}', 'title'],`, `    ['tutorial', 'step${i}', 'description'],`);
    vars.push(`step${i}Title`, `step${i}Desc`);
  }
  paths.push(`    ['tutorial', 'buttonNext'],`, `    ['tutorial', 'buttonReady'],`);
  vars.push('buttonNext', 'buttonReady');

  const stepsReturn = Array.from({ length: stepCount }, (_, i) =>
    `      step${i + 1}: { title: step${i + 1}Title, description: step${i + 1}Desc, button: ${i === stepCount - 1 ? 'buttonReady' : 'buttonNext'} },`
  ).join('\n');

  return `import { getCapeCopy } from '~/server/cape/CapeProvider.ts';

export async function loadTutorialData(language: string) {
  const [${vars.join(', ')}] = await getCapeCopy(language, [
${paths.join('\n')}
  ]);

  return {
    copy: {
${stepsReturn}
    },
  };
}
`;
}

// ─── Score page ───────────────────────────────────────────────────────────────

function buildScoreRoute(els, pages = []) {
  const hasConfetti   = els.includes('confetti');
  const hasPlayTime   = els.includes('play-time');
  const hasTitle      = els.includes('title');
  const hasDesc       = els.includes('description');
  const hasCtaReg     = els.includes('cta-register');
  const hasCtaAgain   = els.includes('cta-play-again');
  const registerRoute = pages.includes('register') ? '/register' : '/launch';

  const body = [
    hasConfetti ? `      <ConfettiOverlay config={confettiConfig} visual={'confetti'} visualCount={2} />` : '',
    hasPlayTime ? `      <StyledText type={'header'} alternate>{result.playTime}</StyledText>` : '',
    hasTitle    ? `      <StyledText type={'title'} marginTop={8} alternate>{copy.title}</StyledText>` : '',
    hasDesc     ? `      <StyledText type={'description'} marginTop={8} alternate>{copy.description}</StyledText>` : '',
    hasCtaReg   ? `      <StyledButton linkOptions={{ to: '${registerRoute}' }} marginTop={16}>{copy.buttonRegister || 'Play Again'}</StyledButton>` : '',
    hasCtaAgain ? `      <StyledButton linkOptions={{ to: '/launch' }} marginTop={8} alternate>{copy.buttonPlayAgain}</StyledButton>` : '',
  ].filter(Boolean).join('\n');

  return `import { createFileRoute } from '@tanstack/react-router';
${hasConfetti ? `import { useMemo } from 'react';\nimport type { IConfettiConfig } from '~/components/confetti/engine/ConfettiEngine.ts';\nimport { ConfettiOverlay } from '~/components/confetti/ConfettiOverlay.tsx';` : ''}
import { PageContainer } from '~/components/containers/PageContainer.tsx';
${hasPlayTime ? `import { useUnityStore } from '~/hooks/stores/useUnityStore.ts';` : ''}
import { StyledText } from '~/components/texts/StyledText.tsx';
${(hasCtaReg || hasCtaAgain) ? `import { StyledButton } from '~/components/buttons/StyledButton.tsx';` : ''}
import { loadScoreData } from '~/routes/-loaders/scoreLoader.ts';
import styles from './score.module.scss';

export const Route = createFileRoute('/score')({
  component: Score,
  loader: async ({ context }) => await loadScoreData(context.language),
});

function Score() {
  ${hasPlayTime ? `const result = useUnityStore((state) => state.result);` : ''}
  const { copy } = Route.useLoaderData();
  ${hasConfetti ? `
  const confettiConfig: IConfettiConfig = useMemo(() => ({
    maxParticleCount: 30, spawnRate: 500,
    speed: { min: 20, max: 40 }, scale: { min: 0.5, max: 0.8 },
    drift: { min: -0.5, max: 0.5 }, spin: { min: -1, max: 1 },
    wobble: { amplitude: 30, speed: { min: 1, max: 3 } },
  }), []);` : ''}

  return (
    <PageContainer className={styles.score}>
${body}
    </PageContainer>
  );
}
`;
}

function buildScoreLoader(els) {
  const hasTitle    = els.includes('title');
  const hasDesc     = els.includes('description');
  const hasCtaReg   = els.includes('cta-register');
  const hasCtaAgain = els.includes('cta-play-again');

  const vars  = [hasTitle && 'title', hasDesc && 'description', hasCtaReg && 'buttonRegister', hasCtaAgain && 'buttonPlayAgain'].filter(Boolean);
  const paths = [
    hasTitle    && `    ['score', 'title'],`,
    hasDesc     && `    ['score', 'description'],`,
    hasCtaReg   && `    ['score', 'buttonRegister'],`,
    hasCtaAgain && `    ['score', 'buttonPlayAgain'],`,
  ].filter(Boolean).join('\n');

  return `import { getCapeCopy } from '~/server/cape/CapeProvider.ts';

export async function loadScoreData(language: string) {
  const [${vars.join(', ')}] = await getCapeCopy(language, [
${paths}
  ]);

  return {
    copy: {
${vars.map(v => `      ${v},`).join('\n')}
    },
  };
}
`;
}

// ─── Register page ────────────────────────────────────────────────────────────

function buildRegisterRoute(els) {
  const hasTitle    = els.includes('reg-title');
  const hasDesc     = els.includes('reg-description');
  const hasName     = els.includes('field-name');
  const hasEmail    = els.includes('field-email');
  const hasPassword = els.includes('field-password');
  const hasCountry  = els.includes('field-country');
  const hasOptin1   = els.includes('field-optin-1');
  const hasOptin2   = els.includes('field-optin-2');
  const hasBack     = els.includes('cta-back');

  const fields = [
    hasName && `    { type: 'text', name: 'name', label: copy.name.label, error: copy.name.error, placeholder: copy.name.placeholder, validator: z.string().min(1).max(255), defaultValue: '' },`,
    hasEmail && `    { type: 'email', name: 'email', label: copy.email.label, error: copy.email.error, placeholder: copy.email.placeholder, validator: z.email().max(255), defaultValue: '' },`,
    hasPassword && `    { type: 'password', name: 'password', label: 'Password', error: 'Please enter a valid password', placeholder: '...', validator: z.string().min(8).max(255), defaultValue: '' },
    { type: 'password', name: 'repeatPassword', label: 'Repeat Password', error: 'Please enter a valid password', placeholder: '...', validator: z.string().min(8).max(255), defaultValue: '', linkTo: 'password' },`,
    hasCountry && `    { type: 'select', name: 'country', label: copy.country.label, error: copy.country.error, options: countryOptions, validator: z.string().refine((val) => val in countryOptions), placeholder: '-', defaultValue: '' },`,
    hasOptin1 && `    { type: 'checkbox', name: 'optInOne', label: copy.optInOne.label, error: copy.optInOne.error, link: copy.optInOne.link, validator: z.literal(true), defaultValue: false },`,
    hasOptin2 && `    { type: 'checkbox', name: 'optInTwo', label: copy.optInTwo.label, validator: z.boolean(), defaultValue: false },`,
  ].filter(Boolean).join('\n');

  return `import { createFileRoute, useRouter } from '@tanstack/react-router';
import { z } from 'zod';
import { useState, useTransition } from 'react';
import type { IFormData } from '~/interfaces/form/IFormData.ts';
import { PageContainer } from '~/components/containers/PageContainer.tsx';
${(hasTitle || hasDesc) ? `import { StyledText } from '~/components/texts/StyledText.tsx';` : ''}
import { DynamicForm } from '~/components/forms/DynamicForm.tsx';
import { sleep } from '~/utils/Helper.ts';
${hasBack ? `import { StyledButton } from '~/components/buttons/StyledButton.tsx';` : ''}
import { loadRegisterData } from '~/routes/-loaders/registerLoader.ts';

export const Route = createFileRoute('/register')({
  component: Register,
  loader: async ({ context }) => await loadRegisterData(context.language),
});

function Register() {
  const { copy } = Route.useLoaderData();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [error, setError] = useState<string>('');
  ${hasCountry ? `const countryOptions = { NL: 'Netherlands', BE: 'Belgium', DE: 'Germany', FR: 'France', UK: 'United Kingdom', US: 'United States' };` : ''}

  const formData: IFormData = [
${fields}
  ];

  function processForm(data: Record<string, unknown>) {
    console.log('Form submitted:', data);
    startTransition(async () => {
      setError('');
      try {
        await sleep(2000);
        router.navigate({ to: '/launch' });
      } catch (e) {
        console.error('Error during form submission:', e);
        setError(copy.genericError);
      }
    });
  }

  return (
    <PageContainer>
      ${hasTitle ? `<StyledText type={'title'} alternate>{copy.title}</StyledText>` : ''}
      ${hasDesc  ? `<StyledText type={'description'} marginTop={8} alternate>{copy.description}</StyledText>` : ''}
      <DynamicForm formData={formData} buttonText={copy.button} errorText={error} loading={isPending} onSubmit={(data) => processForm(data)} />
      ${hasBack  ? `<StyledButton linkOptions={{ to: '/launch' }} marginTop={8} alternate>Back</StyledButton>` : ''}
    </PageContainer>
  );
}
`;
}

function buildRegisterLoader(els) {
  const hasTitle  = els.includes('reg-title');
  const hasDesc   = els.includes('reg-description');
  const hasName   = els.includes('field-name');
  const hasEmail  = els.includes('field-email');
  const hasCountry= els.includes('field-country');
  const hasOptin1 = els.includes('field-optin-1');
  const hasOptin2 = els.includes('field-optin-2');

  const paths = [
    hasTitle   && `      ['registration', 'title'],`,
    hasDesc    && `      ['registration', 'description'],`,
    `      ['registration', 'buttonSignUp'],`,
    `      ['registration', 'genericError'],`,
    hasName    && `      ['registration', 'nameTitle'],\n      ['registration', 'namePlaceholder'],\n      ['registration', 'nameError'],`,
    hasEmail   && `      ['registration', 'emailTitle'],\n      ['registration', 'emailPlaceholder'],\n      ['registration', 'emailError'],`,
    hasCountry && `      ['registration', 'countryTitle'],\n      ['registration', 'countryError'],`,
    hasOptin1  && `      ['registration', 'optinTextOne'],\n      ['registration', 'optinErrorOne'],`,
    hasOptin2  && `      ['registration', 'optinTextTwo'],`,
  ].filter(Boolean).join('\n');

  const vars = [
    hasTitle   && 'title',
    hasDesc    && 'description',
    'button', 'genericError',
    hasName    && 'nameTitle, namePH, nameError',
    hasEmail   && 'emailTitle, emailPH, emailError',
    hasCountry && 'countryTitle, countryError',
    hasOptin1  && 'optText1, optError1',
    hasOptin2  && 'optText2',
  ].filter(Boolean).join(', ');

  const copyFields = [
    hasTitle   && `      title,`,
    hasDesc    && `      description,`,
    `      button,`,
    `      genericError,`,
    hasName    && `      name: { label: nameTitle, placeholder: namePH, error: nameError },`,
    hasEmail   && `      email: { label: emailTitle, placeholder: emailPH, error: emailError },`,
    hasCountry && `      country: { label: countryTitle, error: countryError },`,
    hasOptin1  && `      optInOne: { label: optText1, error: optError1, link: optLink1.asFile()?.url },`,
    hasOptin2  && `      optInTwo: { label: optText2 },`,
  ].filter(Boolean).join('\n');

  if (hasOptin1) {
    return `import { getCapeCopy, getCapeTranslatedProperty } from '~/server/cape/CapeProvider.ts';

export async function loadRegisterData(language: string) {
  const [[${vars}], optLink1] = await Promise.all([
    getCapeCopy(language, [
${paths}
    ]),
    getCapeTranslatedProperty(language, { type: 'files', path: ['pdfs', 'terms'] }),
  ]);

  return {
    copy: {
${copyFields}
    },
  };
}
`;
  }

  return `import { getCapeCopy } from '~/server/cape/CapeProvider.ts';

export async function loadRegisterData(language: string) {
  const [${vars}] = await getCapeCopy(language, [
${paths}
  ]);

  return {
    copy: {
${copyFields}
    },
  };
}
`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a route file and loader file for a TanStack page.
 *
 * @param {'launch'|'tutorial'|'score'|'register'} pageType
 * @param {string[]} elements  — element IDs from TS_PAGE_ELEMENTS[pageType]
 * @param {object}   opts      — { stepCount }
 * @returns {{ route: string, loader: string }}
 */
export function buildTsPage(pageType, elements, opts = {}) {
  const stepCount = opts.stepCount ?? 3;
  const pages = opts.pages ?? [];
  switch (pageType) {
    case 'launch':   return { route: buildLaunchRoute(elements),   loader: buildLaunchLoader(elements) };
    case 'tutorial': return { route: buildTutorialRoute(elements, stepCount), loader: buildTutorialLoader(elements, stepCount) };
    case 'score':    return { route: buildScoreRoute(elements, pages),    loader: buildScoreLoader(elements) };
    case 'register': return { route: buildRegisterRoute(elements), loader: buildRegisterLoader(elements) };
    default: throw new Error(`Unknown TanStack page type: ${pageType}`);
  }
}
