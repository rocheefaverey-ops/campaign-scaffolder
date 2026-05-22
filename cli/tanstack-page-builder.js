/**
 * cli/tanstack-page-builder.js
 *
 * Page builder for the TanStack (unity-tanstack-boilerplate) stack.
 * Generates route files (.tsx) and loader files (.ts) matching the
 * exact patterns used in base-templates/tanstack-unity/frontend/src.
 *
 * Usage:
 *   import { TS_PAGE_ELEMENTS, TS_PAGE_DEFAULTS, buildTsPage } from './tanstack-page-builder.js';
 *
 *   const { route, loader } = buildTsPage('landing', ['logo', 'title', 'cta-play']);
 */

// ─── Constants ────────────────────────────────────────────────────────────────

export const TS_ALL_PAGES = ['landing', 'tutorial', 'game', 'register', 'result'];

export const TS_PAGE_ROUTES = {
  landing:  '/landing',
  tutorial: '/tutorial',
  game:     '/game',
  register: '/register',
  result:   '/result',
};

// ─── Element catalogue ────────────────────────────────────────────────────────

export const TS_ELEMENT_CATALOGUE = {
  // ── Launch ──────────────────────────────────────────────────────────────────
  'logo': {
    label: 'Logo image',
    description: 'Brand logo from static asset (logo.png)',
    pages: ['landing'],
  },
  'title': {
    label: 'Title',
    description: 'Main heading from CAPE copy',
    pages: ['landing', 'result'],
  },
  'description': {
    label: 'Description',
    description: 'Body text from CAPE copy',
    pages: ['landing', 'result'],
  },
  'cta-play': {
    label: 'Play button',
    description: 'Primary CTA — navigates to /game',
    pages: ['landing'],
  },
  'cta-tutorial': {
    label: 'Tutorial button',
    description: 'Secondary link button to /tutorial',
    pages: ['landing'],
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
  // ── Result ────────────────────────────────────────────────────────────────────
  'confetti': {
    label: 'Confetti animation',
    description: 'Full-screen confetti particle overlay',
    pages: ['result'],
  },
  'play-time': {
    label: 'Play time / score display',
    description: 'Shows game result (playTime) from Unity store',
    pages: ['result'],
  },
  'cta-register': {
    label: 'Register button',
    description: 'Primary CTA linking to /register',
    pages: ['result'],
  },
  'cta-play-again': {
    label: 'Play again button',
    description: 'Alternate link button back to /landing',
    pages: ['result'],
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
  landing:  ['logo', 'title', 'description', 'cta-play', 'cta-tutorial'],
  tutorial: ['steps', 'skip'],
  game:     [],
  register: ['reg-title', 'reg-description', 'field-name', 'field-email', 'field-country', 'field-optin-1', 'cta-back'],
  result:   ['confetti', 'play-time', 'title', 'description', 'cta-register'],
};

export const TS_PAGE_ELEMENTS = {
  landing:  ['logo', 'title', 'description', 'cta-play', 'cta-tutorial'],
  tutorial: ['steps', 'skip'],
  game:     [],
  register: ['reg-title', 'reg-description', 'field-name', 'field-email', 'field-password', 'field-country', 'field-optin-1', 'field-optin-2', 'cta-back'],
  result:   ['confetti', 'play-time', 'title', 'description', 'cta-register', 'cta-play-again'],
};

// ─── Landing page ─────────────────────────────────────────────────────────────

function buildLandingRoute(els) {
  const hasLogo    = els.includes('logo');
  const hasTitle   = els.includes('title');
  const hasDesc    = els.includes('description');
  const hasCta     = els.includes('cta-play');
  const hasTutBtn  = els.includes('cta-tutorial');

  const lines = [
    `import { createFileRoute, useLoaderData, useRouter } from '@tanstack/react-router';`,
    hasLogo   ? `import { SmartImage } from '~/components/visuals/SmartImage.tsx';` : '',
    hasLogo   ? `import VisualImage from '~/assets/images/logo.svg';` : '',
    `import { PageContainer } from '~/components/containers/PageContainer.tsx';`,
    (hasTitle || hasDesc) ? `import { StyledText } from '~/components/texts/StyledText.tsx';` : '',
    (hasCta || hasTutBtn) ? `import { StyledButton } from '~/components/buttons/StyledButton.tsx';` : '',
    `import { loadLandingData } from '~/loaders/LandingLoader.ts';`,
    `import styles from './landing.module.scss';`,
  ].filter(Boolean).join('\n');

  const body = [
    hasLogo   ? `      <SmartImage src={VisualImage} alt={'logo'} width={240} aspectRatio={2} placeholder={logoPlaceholder} />` : '',
    hasTitle  ? `      <StyledText type={'title'} marginTop={16} alternate>{copy.title}</StyledText>` : '',
    hasDesc   ? `      <StyledText type={'description'} marginTop={8} alternate>{copy.description}</StyledText>` : '',
    hasCta    ? `      <StyledButton marginTop={16} loading={isPending} onClick={() => navigate(nextRoute)}>{copy.button}</StyledButton>` : '',
    hasTutBtn ? `      {showTutorialButton && <StyledButton marginTop={8} onClick={() => navigate(tutorialRoute)} alternate>Tutorial</StyledButton>}` : '',
  ].filter(Boolean).join('\n');

  return `${lines}

export const Route = createFileRoute('/landing')({
  component: Landing,
  loader: async ({ context }) => await loadLandingData(context.language),
});

function Landing() {
  const { copy } = Route.useLoaderData();
  ${hasLogo ? `const { logoPlaceholder } = useLoaderData({ from: '__root__' });` : ''}
  const router = useRouter();
  const nextRoute = '{{NEXT_AFTER_LANDING}}';
  const tutorialRoute = '{{LANDING_TUTORIAL_ROUTE}}';
  const showTutorialButton = JSON.parse('{{SHOW_LANDING_TUTORIAL_BUTTON}}') as boolean;
  const isPending = false;
  const navigate = (to: string) => void router.navigate({ to: to as never, replace: true });

  return (
    <PageContainer className={styles.landing}>
${body}
    </PageContainer>
  );
}
`;
}

function buildLandingLoader(els) {
  const hasTitle = els.includes('title');
  const hasDesc  = els.includes('description');
  const hasCta   = els.includes('cta-play');

  const vars  = [hasTitle && 'title', hasDesc && 'description', hasCta && 'button'].filter(Boolean);
  const paths = [
    hasTitle && `    ['landing', 'title'],`,
    hasDesc  && `    ['landing', 'description'],`,
    hasCta   && `    ['landing', 'buttonStart'],`,
  ].filter(Boolean).join('\n');

  const copy = vars.map(v => `      ${v},`).join('\n');

  return `import { getCapeCopy } from '~/server/cape/CapeProvider.ts';

export async function loadLandingData(language: string) {
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

  return `import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useCallback, useRef } from 'react';
import type { IContentSliderItem } from '~/components/slider/ContentSliderItem.tsx';
import type { IContentSliderHandle } from '~/components/slider/ContentSlider.tsx';
${hasSteps ? `import { ContentSlider } from '~/components/slider/ContentSlider.tsx';` : ''}
import { PageContainer } from '~/components/containers/PageContainer.tsx';
import LogoVisual from '~/assets/images/logo.svg';
import { loadTutorialData } from '~/loaders/TutorialLoader.ts';
${hasSkip ? `import { IconButton } from '~/components/buttons/IconButton.tsx';` : ''}
import styles from './tutorial.module.scss';

export const Route = createFileRoute('/tutorial')({
  component: Tutorial,
  loader: async ({ context }) => await loadTutorialData(context.language),
});

function Tutorial() {
  const { copy } = Route.useLoaderData();
  const router = useRouter();
  const nextRoute = '{{NEXT_AFTER_TUTORIAL}}';
  const isPending = false;
  const navigate = () => void router.navigate({ to: nextRoute as never, replace: true });
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

// ─── Result page ──────────────────────────────────────────────────────────────

function buildResultRoute(els, pages = []) {
  const hasConfetti   = els.includes('confetti');
  const hasPlayTime   = els.includes('play-time');
  const hasTitle      = els.includes('title');
  const hasDesc       = els.includes('description');
  const hasCtaReg     = els.includes('cta-register');
  const hasCtaAgain   = els.includes('cta-play-again');

  const body = [
    hasConfetti ? `      <ConfettiOverlay config={confettiConfig} visual={'confetti'} visualCount={2} />` : '',
    hasPlayTime ? `      <StyledText type={'header'} alternate>{result.playTime}</StyledText>` : '',
    hasTitle    ? `      <StyledText type={'title'} marginTop={8} alternate>{copy.title}</StyledText>` : '',
    hasDesc     ? `      <StyledText type={'description'} marginTop={8} alternate>{copy.description}</StyledText>` : '',
    hasCtaReg   ? `      <StyledButton onClick={() => navigate(nextRoute)} marginTop={16}>{copy.buttonRegister || 'Continue'}</StyledButton>` : '',
    hasCtaAgain ? `      {showPlayAgainButton && <StyledButton onClick={() => navigate(playAgainRoute)} marginTop={8} alternate>{copy.buttonPlayAgain || 'Play again'}</StyledButton>}` : '',
  ].filter(Boolean).join('\n');

  return `import { createFileRoute, useRouter } from '@tanstack/react-router';
${hasConfetti ? `import { useMemo } from 'react';\nimport type { IConfettiConfig } from '~/components/confetti/engine/ConfettiEngine.ts';\nimport { ConfettiOverlay } from '~/components/confetti/ConfettiOverlay.tsx';` : ''}
import { PageContainer } from '~/components/containers/PageContainer.tsx';
${hasPlayTime ? `import { useUnityStore } from '~/hooks/stores/useUnityStore.ts';` : ''}
import { StyledText } from '~/components/texts/StyledText.tsx';
${(hasCtaReg || hasCtaAgain) ? `import { StyledButton } from '~/components/buttons/StyledButton.tsx';` : ''}
import { loadResultData } from '~/loaders/ResultLoader.ts';
import styles from './result.module.scss';

export const Route = createFileRoute('/result')({
  component: Result,
  loader: async ({ context }) => await loadResultData(context.language),
});

function Result() {
  ${hasPlayTime ? `const result = useUnityStore((state) => state.result);` : ''}
  const { copy } = Route.useLoaderData();
  const router = useRouter();
  const nextRoute = '{{NEXT_AFTER_RESULT}}';
  const playAgainRoute = '{{PLAY_AGAIN_ROUTE}}';
  const showPlayAgainButton = JSON.parse('{{SHOW_RESULT_PLAY_AGAIN_BUTTON}}') as boolean;
  const navigate = (to: string) => void router.navigate({ to: to as never, replace: true });
  ${hasConfetti ? `
  const confettiConfig: IConfettiConfig = useMemo(() => ({
    maxParticleCount: 30, spawnRate: 500,
    speed: { min: 20, max: 40 }, scale: { min: 0.5, max: 0.8 },
    drift: { min: -0.5, max: 0.5 }, spin: { min: -1, max: 1 },
    wobble: { amplitude: 30, speed: { min: 1, max: 3 } },
  }), []);` : ''}

  return (
    <PageContainer className={styles.result}>
${body}
    </PageContainer>
  );
}
`;
}

function buildResultLoader(els) {
  const hasTitle    = els.includes('title');
  const hasDesc     = els.includes('description');
  const hasCtaReg   = els.includes('cta-register');
  const hasCtaAgain = els.includes('cta-play-again');

  const vars  = [hasTitle && 'title', hasDesc && 'description', hasCtaReg && 'buttonRegister', hasCtaAgain && 'buttonPlayAgain'].filter(Boolean);
  const paths = [
    hasTitle    && `    ['result', 'title'],`,
    hasDesc     && `    ['result', 'description'],`,
    hasCtaReg   && `    ['result', 'buttonRegister'],`,
    hasCtaAgain && `    ['result', 'buttonPlayAgain'],`,
  ].filter(Boolean).join('\n');

  return `import { getCapeCopy } from '~/server/cape/CapeProvider.ts';

export async function loadResultData(language: string) {
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
import { loadRegisterData } from '~/loaders/RegisterLoader.ts';

export const Route = createFileRoute('/register')({
  component: Register,
  loader: async ({ context }) => await loadRegisterData(context.language),
});

function Register() {
  const { copy } = Route.useLoaderData();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const nextRoute = '{{NEXT_AFTER_REGISTER}}';
  const backRoute = '{{FLOW_ENTRY}}';
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
        router.navigate({ to: nextRoute as never, replace: true });
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
      ${hasBack  ? `<StyledButton onClick={() => router.navigate({ to: backRoute as never, replace: true })} marginTop={8} alternate>Back</StyledButton>` : ''}
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
 * @param {'landing'|'tutorial'|'result'|'register'} pageType
 * @param {string[]} elements  — element IDs from TS_PAGE_ELEMENTS[pageType]
 * @param {object}   opts      — { stepCount }
 * @returns {{ route: string, loader: string }}
 */
export function buildTsPage(pageType, elements, opts = {}) {
  const stepCount = opts.stepCount ?? 3;
  const pages = opts.pages ?? [];
  switch (pageType) {
    case 'landing':  return { route: buildLandingRoute(elements),  loader: buildLandingLoader(elements) };
    case 'tutorial': return { route: buildTutorialRoute(elements, stepCount), loader: buildTutorialLoader(elements, stepCount) };
    case 'result':   return { route: buildResultRoute(elements, pages),   loader: buildResultLoader(elements) };
    case 'register': return { route: buildRegisterRoute(elements), loader: buildRegisterLoader(elements) };
    default: throw new Error(`Unknown TanStack page type: ${pageType}`);
  }
}
