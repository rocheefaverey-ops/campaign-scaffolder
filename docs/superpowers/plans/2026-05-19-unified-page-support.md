# Unified Page Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every page type available to every stack — landing/tutorial/result as unified names, leaderboard/voucher/video scaffoldable on TanStack — by unifying the page registry in `config.ts`, renaming TanStack base-template routes, and adding stack-conditional module files.

**Architecture:** `config.ts` loses its stack-specific ID lists; `pagesForStack()` returns all pages. Three old page IDs (`launch`, `score`, `onboarding`) are dropped in favour of unified names (`landing`, `tutorial`, `result`). Module manifests gain a `"stacks"` field per file entry; `scaffold.js` skips entries whose stack doesn't match. New fully-working TanStack route files are added inside each module's `tanstack/` subdirectory.

**Tech Stack:** TypeScript, TanStack Router (`createFileRoute`), TanStack Start (`createServerFn`), React, CAPE (`getCapeCopy` / `getCapeProperty`), SCSS modules.

---

## File Map

**Modified:**
- `cli/wizard-ui/src/shared/config.ts`
- `base-templates/tanstack-unity/src/routes/index.tsx`
- `base-templates/tanstack-unity/src/routes/register.tsx`
- `base-templates/tanstack-unity/src/routes/game.tsx`
- `base-templates/tanstack-unity/src/routeTree.gen.ts`
- `base-templates/next-{unity,r3f,phaser,memory,none}/app/(campaign)/onboarding/page.tsx` (renamed to `tutorial/page.tsx`)
- `cli/scaffold.js`
- `modules/leaderboard/manifest.json`
- `modules/voucher/manifest.json`
- `modules/video/manifest.json`
- `cli/wizard-ui/src/steps/PreviewPane.tsx`

**Deleted:**
- `base-templates/tanstack-unity/src/routes/launch.tsx`
- `base-templates/tanstack-unity/src/routes/score.tsx`
- `base-templates/tanstack-unity/src/loaders/LaunchLoader.ts`
- `base-templates/tanstack-unity/src/loaders/ScoreLoader.ts`

**Created:**
- `base-templates/tanstack-unity/src/routes/landing.tsx`
- `base-templates/tanstack-unity/src/routes/result.tsx`
- `base-templates/tanstack-unity/src/loaders/LandingLoader.ts`
- `base-templates/tanstack-unity/src/loaders/ResultLoader.ts`
- `modules/leaderboard/tanstack/routes/leaderboard.tsx`
- `modules/leaderboard/tanstack/loaders/LeaderboardLoader.ts`
- `modules/leaderboard/tanstack/server/getLeaderboard.ts`
- `modules/voucher/tanstack/routes/voucher.tsx`
- `modules/voucher/tanstack/loaders/VoucherLoader.ts`
- `modules/video/tanstack/routes/video.tsx`
- `modules/video/tanstack/routes/intro-video.tsx`
- `modules/video/tanstack/routes/loading-video.tsx`
- `modules/video/tanstack/routes/ad-video.tsx`
- `modules/video/tanstack/loaders/VideoLoader.ts`

---

## Task 1: Unify page registry in config.ts

**Files:**
- Modify: `cli/wizard-ui/src/shared/config.ts`

- [ ] **Step 1: Replace ALL_PAGES — remove `launch`, `score`, merge `onboarding` into `tutorial`, add `tutorial` exit to `landing`**

In `config.ts`, replace the `ALL_PAGES` array and the three constants/functions below it with:

```typescript
export const ALL_PAGES: PageMeta[] = [
  { id: 'landing',     label: 'Landing',     hint: 'Hero / brand splash with CTA.',             route: '/landing',
    exits: [
      { key: 'next',        label: 'Primary CTA button',   token: 'NEXT_AFTER_LANDING',          defaultVariant: 'primary' },
      { key: 'tutorial',    label: 'Tutorial button',      token: 'LANDING_TUTORIAL_ROUTE',
        optional: true, defaultEnabled: false, capeFlag: 'showTutorialButton',    defaultVariant: 'secondary' },
      { key: 'leaderboard', label: 'Leaderboard button',   token: 'LANDING_LEADERBOARD_ROUTE',
        optional: true, defaultEnabled: false, capeFlag: 'showLeaderboardButton', defaultVariant: 'secondary' },
    ] },
  { id: 'video',       label: 'Video',       hint: 'Intro / brand video, skippable.',           route: '/video',         requires: 'video',
    exits: [{ key: 'next', label: 'On end / skip',  token: 'NEXT_AFTER_VIDEO' }] },
  { id: 'intro-video',   label: 'Intro video',   hint: 'Intro brand video before the game starts.', route: '/intro-video',   requires: 'video',
    exits: [{ key: 'next', label: 'On end / skip',  token: 'NEXT_AFTER_INTRO_VIDEO' }] },
  { id: 'loading-video', label: 'Loading video', hint: 'Looping loading screen until the game is ready.', route: '/loading-video', requires: 'video',
    exits: [{ key: 'next', label: 'On end / skip',  token: 'NEXT_AFTER_LOADING_VIDEO' }] },
  { id: 'ad-video',      label: 'Ad video',      hint: 'Interstitial ad-style video page.',         route: '/ad-video',      requires: 'video',
    exits: [{ key: 'next', label: 'On end / skip',  token: 'NEXT_AFTER_AD_VIDEO' }] },
  { id: 'tutorial',    label: 'Tutorial',    hint: 'How-to-play steps / slides before gameplay.',route: '/tutorial',
    exits: [{ key: 'next', label: 'Start / Final CTA', token: 'NEXT_AFTER_TUTORIAL', defaultVariant: 'primary' }] },
  { id: 'register',    label: 'Register',    hint: 'Player registration form.',                 route: '/register',      requires: 'registration',
    exits: [{ key: 'next', label: 'On submit',       token: 'NEXT_AFTER_REGISTER', defaultVariant: 'primary' }] },
  { id: 'game',        label: 'Game',        hint: 'The actual game canvas.',                   route: '/gameplay',
    exits: [{ key: 'next', label: 'On game end',     token: 'NEXT_AFTER_GAME' }] },
  { id: 'result',      label: 'Result',      hint: 'Score reveal / win / lose screen.',         route: '/result',
    exits: [
      { key: 'next',        label: 'Continue button',     token: 'NEXT_AFTER_RESULT',         defaultVariant: 'primary' },
      { key: 'playAgain',   label: 'Play again button',   token: 'PLAY_AGAIN_ROUTE',          defaultRule: 'first-in-flow',
        optional: true, defaultEnabled: true,  capeFlag: 'showPlayAgainButton',    defaultVariant: 'secondary' },
      { key: 'leaderboard', label: 'Leaderboard button',  token: 'RESULT_LEADERBOARD_ROUTE',
        optional: true, defaultEnabled: false, capeFlag: 'showLeaderboardButton',  defaultVariant: 'tertiary' },
    ] },
  { id: 'leaderboard', label: 'Leaderboard', hint: 'Top scores + personal best.',               route: '/leaderboard',   requires: 'leaderboard',
    exits: [{ key: 'next', label: 'CTA button',      token: 'NEXT_AFTER_LEADERBOARD', defaultVariant: 'primary' }] },
  { id: 'voucher',     label: 'Voucher',     hint: 'Reward code / QR for the prize.',           route: '/voucher',       requires: 'voucher',
    exits: [{ key: 'next', label: 'Done button',     token: 'NEXT_AFTER_VOUCHER',     defaultVariant: 'primary' }] },
];

export const ALL_PAGE_IDS: string[] = ALL_PAGES.map(p => p.id);

export function pageMeta(id: string): PageMeta | undefined {
  return ALL_PAGES.find(p => p.id === id);
}

export function pagesForStack(_stack: Stack): PageMeta[] {
  return ALL_PAGES;
}

export function defaultPagesForStack(stack: Stack): PageInstance[] {
  if (stack === 'tanstack') {
    return [
      { id: 'landing',  type: 'landing',  route: '/landing'  },
      { id: 'tutorial', type: 'tutorial', route: '/tutorial' },
      { id: 'game',     type: 'game',     route: '/game'     },
      { id: 'result',   type: 'result',   route: '/result'   },
    ];
  }
  return [
    { id: 'landing',    type: 'landing',    route: '/landing'    },
    { id: 'tutorial',   type: 'tutorial',   route: '/tutorial'   },
    { id: 'game',       type: 'game',       route: '/gameplay'   },
    { id: 'result',     type: 'result',     route: '/result'     },
  ];
}
```

Also delete these two lines from the file (they're now unused):
```typescript
export const NEXT_PAGE_IDS = ['landing', ...];
export const TANSTACK_PAGE_IDS = ['launch', ...];
```

- [ ] **Step 2: Verify the wizard builds without TypeScript errors**

```bash
cd cli/wizard-ui && npm run build 2>&1 | head -40
```

Expected: no errors referencing `launch`, `score`, `onboarding`, `TANSTACK_PAGE_IDS`, or `NEXT_PAGE_IDS`.

- [ ] **Step 3: Commit**

```bash
git add cli/wizard-ui/src/shared/config.ts
git commit -m "feat: unify page registry — drop launch/score/onboarding, add tutorial exit to landing"
```

---

## Task 2: Create landing.tsx + LandingLoader.ts in tanstack-unity

**Files:**
- Create: `base-templates/tanstack-unity/src/routes/landing.tsx`
- Create: `base-templates/tanstack-unity/src/loaders/LandingLoader.ts`
- Delete: `base-templates/tanstack-unity/src/routes/launch.tsx`
- Delete: `base-templates/tanstack-unity/src/loaders/LaunchLoader.ts`

- [ ] **Step 1: Create `base-templates/tanstack-unity/src/loaders/LandingLoader.ts`**

```typescript
import { getCapeCopy, getCapeProperty } from '~/server/cape/CapeProvider.ts';

export async function loadLandingData(language: string) {
  const [[title, description, button, kicker], heroImage, pageLogoImage, headerLogoImage] = await Promise.all([
    getCapeCopy(language, [
      ['landing', 'headline'],
      ['landing', 'subline'],
      ['landing', 'cta'],
      ['landing', 'kicker'],
    ]),
    getCapeProperty({ type: 'general', path: ['landing', 'background'] }),
    getCapeProperty({ type: 'general', path: ['landing', 'logo'] }),
    getCapeProperty({ type: 'general', path: ['header', 'logo'] }),
  ]);

  return {
    copy: { title, description, button, kicker },
    heroUrl:       heroImage.asFile()?.url      ?? null,
    pageLogoUrl:   pageLogoImage.asFile()?.url  ?? null,
    headerLogoUrl: headerLogoImage.asFile()?.url ?? null,
  };
}
```

- [ ] **Step 2: Create `base-templates/tanstack-unity/src/routes/landing.tsx`**

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { PageContainer } from '~/components/containers/PageContainer.tsx';
import { StyledButton } from '~/components/buttons/StyledButton.tsx';
import { BaseButton } from '~/components/buttons/BaseButton.tsx';
import { loadLandingData } from '~/loaders/LandingLoader.ts';
import { useGameNavigation } from '~/hooks/useGameNavigation.ts';
import LogoImage from '~/assets/images/logo.png';

export const Route = createFileRoute('/landing')({
  component: Landing,
  loader: async ({ context }) => await loadLandingData(context.language),
});

function Landing() {
  const { copy, heroUrl, headerLogoUrl, pageLogoUrl } = Route.useLoaderData();
  const { isPending, navigate } = useGameNavigation();

  const resolvedHeaderLogo = headerLogoUrl || LogoImage;
  const isVideoHero = !!heroUrl && /\.(mp4|webm|mov)$/i.test(heroUrl);

  return (
    <PageContainer className="campaign-screen--hero">
      {heroUrl && (
        isVideoHero
          ? <video src={heroUrl} className="campaign-hero-bleed" autoPlay muted loop playsInline aria-hidden />
          : <img src={heroUrl} alt="" className="campaign-hero-bleed" aria-hidden />
      )}
      <div className="campaign-hero-shade" aria-hidden />

      <div className="campaign-shell">
        <header
          className="campaign-hero-header campaign-hero-header--with-close"
          style={{ animation: 'fadeIn 0.4s ease both' }}
        >
          <img src={resolvedHeaderLogo} alt="Logo" className="campaign-hero-logo" />
          <button type="button" className="campaign-menu-btn" aria-label="Menu">
            <HamburgerIcon />
          </button>
        </header>

        <div
          className="campaign-stack campaign-hero-content"
          style={{ animation: 'fadeIn 0.5s 0.14s ease both' }}
        >
          {pageLogoUrl && (
            <img src={pageLogoUrl} alt="" className="campaign-hero-page-logo" />
          )}
          {copy.kicker && <p className="campaign-kicker">{copy.kicker}</p>}
          <h1 className="campaign-title">{copy.title || 'Welcome'}</h1>
          {copy.description && <p className="campaign-copy">{copy.description}</p>}
        </div>

        <div
          className="campaign-actions"
          style={{ animation: 'fadeIn 0.5s 0.28s ease both' }}
        >
          <StyledButton loading={isPending} onClick={navigate}>
            {copy.button || 'Play'}
          </StyledButton>
          <BaseButton linkOptions={{ to: '{{LANDING_TUTORIAL_ROUTE}}' }} className="campaign-skip">
            Tutorial
          </BaseButton>
        </div>
      </div>
    </PageContainer>
  );
}

function HamburgerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <line x1="4" y1="7"  x2="20" y2="7"  stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="4" y1="17" x2="20" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
```

- [ ] **Step 3: Delete the old files**

```bash
rm base-templates/tanstack-unity/src/routes/launch.tsx
rm base-templates/tanstack-unity/src/loaders/LaunchLoader.ts
```

- [ ] **Step 4: Commit**

```bash
git add base-templates/tanstack-unity/src/routes/landing.tsx \
        base-templates/tanstack-unity/src/loaders/LandingLoader.ts
git rm  base-templates/tanstack-unity/src/routes/launch.tsx \
        base-templates/tanstack-unity/src/loaders/LaunchLoader.ts
git commit -m "feat(tanstack-unity): rename launch→landing route + loader"
```

---

## Task 3: Create result.tsx + ResultLoader.ts in tanstack-unity

**Files:**
- Create: `base-templates/tanstack-unity/src/routes/result.tsx`
- Create: `base-templates/tanstack-unity/src/loaders/ResultLoader.ts`
- Delete: `base-templates/tanstack-unity/src/routes/score.tsx`
- Delete: `base-templates/tanstack-unity/src/loaders/ScoreLoader.ts`

- [ ] **Step 1: Create `base-templates/tanstack-unity/src/loaders/ResultLoader.ts`**

```typescript
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
```

- [ ] **Step 2: Create `base-templates/tanstack-unity/src/routes/result.tsx`**

```typescript
import { createFileRoute } from '@tanstack/react-router';
import type { IConfettiConfig } from '~/components/confetti/engine/ConfettiEngine.ts';
import { PageContainer } from '~/components/containers/PageContainer.tsx';
import { useUnityStore } from '~/hooks/stores/useUnityStore.ts';
import { StyledButton } from '~/components/buttons/StyledButton.tsx';
import { ConfettiOverlay } from '~/components/confetti/ConfettiOverlay.tsx';
import { loadResultData } from '~/loaders/ResultLoader.ts';

const confettiConfig: IConfettiConfig = {
  maxParticleCount: 30,
  spawnRate: 500,
  speed: { min: 20, max: 40 },
  scale: { min: 0.5, max: 0.8 },
  drift: { min: -0.5, max: 0.5 },
  spin: { min: -1, max: 1 },
  wobble: { amplitude: 30, speed: { min: 1, max: 3 } },
};

export const Route = createFileRoute('/result')({
  component: Result,
  loader: async ({ context }) => await loadResultData(context.language),
});

function Result() {
  const result = useUnityStore((state) => state.result);
  const { copy } = Route.useLoaderData();

  return (
    <PageContainer className="campaign-screen--hero">
      <ConfettiOverlay config={confettiConfig} visual="confetti" visualCount={2} />
      <div className="campaign-hero-shade" />

      <div className="campaign-shell">
        <div />

        <div className="campaign-hero-content">
          <div className="result-plate">
            <span className="result-plate__label">{copy.scoreLabel || 'Your score'}</span>
            <span className="result-plate__score">{result.playTime}</span>
          </div>

          {copy.title && <h2 className="campaign-title" style={{ marginTop: '1.25rem' }}>{copy.title}</h2>}
          {copy.description && <p className="campaign-copy" style={{ marginTop: '0.5rem' }}>{copy.description}</p>}

          <div className="campaign-actions" style={{ marginTop: '1.5rem' }}>
            <StyledButton linkOptions={{ to: '/register' }}>Register</StyledButton>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
```

- [ ] **Step 3: Delete the old files**

```bash
git rm base-templates/tanstack-unity/src/routes/score.tsx \
       base-templates/tanstack-unity/src/loaders/ScoreLoader.ts
```

- [ ] **Step 4: Commit**

```bash
git add base-templates/tanstack-unity/src/routes/result.tsx \
        base-templates/tanstack-unity/src/loaders/ResultLoader.ts
git commit -m "feat(tanstack-unity): rename score→result route + loader"
```

---

## Task 4: Fix /launch and /score cross-references in tanstack-unity

**Files:**
- Modify: `base-templates/tanstack-unity/src/routes/index.tsx`
- Modify: `base-templates/tanstack-unity/src/routes/register.tsx`
- Modify: `base-templates/tanstack-unity/src/routes/game.tsx`

- [ ] **Step 1: Update `index.tsx` — replace two `/launch` occurrences**

In `base-templates/tanstack-unity/src/routes/index.tsx`, replace:
```typescript
      await router.preloadRoute({ to: '/launch' });
```
with:
```typescript
      await router.preloadRoute({ to: '/landing' });
```

And replace:
```typescript
      router.navigate({ to: '/launch', replace: true });
```
with:
```typescript
      router.navigate({ to: '/landing', replace: true });
```

- [ ] **Step 2: Update `register.tsx` — replace two `/launch` occurrences**

In `base-templates/tanstack-unity/src/routes/register.tsx`, replace:
```typescript
        router.navigate({ to: '/launch' });
```
with:
```typescript
        router.navigate({ to: '/landing' });
```

And replace:
```typescript
      <StyledButton linkOptions={{ to: '/launch' }} marginTop={8} alternate>Back</StyledButton>
```
with:
```typescript
      <StyledButton linkOptions={{ to: '/landing' }} marginTop={8} alternate>Back</StyledButton>
```

- [ ] **Step 3: Update `game.tsx` — replace two `/score` occurrences**

In `base-templates/tanstack-unity/src/routes/game.tsx`, line ~47, replace:
```typescript
    void router.navigate({ to: '/score', replace: true });
```
with:
```typescript
    void router.navigate({ to: '/result', replace: true });
```

And line ~156, replace:
```typescript
    void router.preloadRoute({ to: '/score' });
```
with:
```typescript
    void router.preloadRoute({ to: '/result' });
```

- [ ] **Step 4: Commit**

```bash
git add base-templates/tanstack-unity/src/routes/index.tsx \
        base-templates/tanstack-unity/src/routes/register.tsx \
        base-templates/tanstack-unity/src/routes/game.tsx
git commit -m "fix(tanstack-unity): update /launch→/landing and /score→/result cross-references"
```

---

## Task 5: Update routeTree.gen.ts in tanstack-unity

**Files:**
- Modify: `base-templates/tanstack-unity/src/routeTree.gen.ts`

- [ ] **Step 1: Rewrite `routeTree.gen.ts` with renamed routes**

Replace the entire file content with:

```typescript
/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file was automatically generated by TanStack Router.
// You should NOT make any changes in this file as it will be overwritten.
// Additionally, you should also exclude this file from your linter and/or formatter to prevent it from being checked or modified.

import { Route as rootRouteImport } from './routes/__root'
import { Route as TutorialRouteImport } from './routes/tutorial'
import { Route as ResultRouteImport } from './routes/result'
import { Route as RegisterRouteImport } from './routes/register'
import { Route as LandingRouteImport } from './routes/landing'
import { Route as GameRouteImport } from './routes/game'
import { Route as IndexRouteImport } from './routes/index'
import { Route as ApiUnityRouteImport } from './routes/api/unity'
import { Route as ApiCapeRouteImport } from './routes/api/cape'

const TutorialRoute = TutorialRouteImport.update({
  id: '/tutorial',
  path: '/tutorial',
  getParentRoute: () => rootRouteImport,
} as any)
const ResultRoute = ResultRouteImport.update({
  id: '/result',
  path: '/result',
  getParentRoute: () => rootRouteImport,
} as any)
const RegisterRoute = RegisterRouteImport.update({
  id: '/register',
  path: '/register',
  getParentRoute: () => rootRouteImport,
} as any)
const LandingRoute = LandingRouteImport.update({
  id: '/landing',
  path: '/landing',
  getParentRoute: () => rootRouteImport,
} as any)
const GameRoute = GameRouteImport.update({
  id: '/game',
  path: '/game',
  getParentRoute: () => rootRouteImport,
} as any)
const IndexRoute = IndexRouteImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRouteImport,
} as any)
const ApiUnityRoute = ApiUnityRouteImport.update({
  id: '/api/unity',
  path: '/api/unity',
  getParentRoute: () => rootRouteImport,
} as any)
const ApiCapeRoute = ApiCapeRouteImport.update({
  id: '/api/cape',
  path: '/api/cape',
  getParentRoute: () => rootRouteImport,
} as any)

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/game': typeof GameRoute
  '/landing': typeof LandingRoute
  '/register': typeof RegisterRoute
  '/result': typeof ResultRoute
  '/tutorial': typeof TutorialRoute
  '/api/cape': typeof ApiCapeRoute
  '/api/unity': typeof ApiUnityRoute
}
export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/game': typeof GameRoute
  '/landing': typeof LandingRoute
  '/register': typeof RegisterRoute
  '/result': typeof ResultRoute
  '/tutorial': typeof TutorialRoute
  '/api/cape': typeof ApiCapeRoute
  '/api/unity': typeof ApiUnityRoute
}
export interface FileRoutesById {
  __root__: typeof rootRouteImport
  '/': typeof IndexRoute
  '/game': typeof GameRoute
  '/landing': typeof LandingRoute
  '/register': typeof RegisterRoute
  '/result': typeof ResultRoute
  '/tutorial': typeof TutorialRoute
  '/api/cape': typeof ApiCapeRoute
  '/api/unity': typeof ApiUnityRoute
}
export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths:
    | '/'
    | '/game'
    | '/landing'
    | '/register'
    | '/result'
    | '/tutorial'
    | '/api/cape'
    | '/api/unity'
  fileRoutesByTo: FileRoutesByTo
  to:
    | '/'
    | '/game'
    | '/landing'
    | '/register'
    | '/result'
    | '/tutorial'
    | '/api/cape'
    | '/api/unity'
  id:
    | '__root__'
    | '/'
    | '/game'
    | '/landing'
    | '/register'
    | '/result'
    | '/tutorial'
    | '/api/cape'
    | '/api/unity'
  fileRoutesById: FileRoutesById
}
export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  GameRoute: typeof GameRoute
  LandingRoute: typeof LandingRoute
  RegisterRoute: typeof RegisterRoute
  ResultRoute: typeof ResultRoute
  TutorialRoute: typeof TutorialRoute
  ApiCapeRoute: typeof ApiCapeRoute
  ApiUnityRoute: typeof ApiUnityRoute
}

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/tutorial': {
      id: '/tutorial'
      path: '/tutorial'
      fullPath: '/tutorial'
      preLoaderRoute: typeof TutorialRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/result': {
      id: '/result'
      path: '/result'
      fullPath: '/result'
      preLoaderRoute: typeof ResultRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/register': {
      id: '/register'
      path: '/register'
      fullPath: '/register'
      preLoaderRoute: typeof RegisterRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/landing': {
      id: '/landing'
      path: '/landing'
      fullPath: '/landing'
      preLoaderRoute: typeof LandingRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/game': {
      id: '/game'
      path: '/game'
      fullPath: '/game'
      preLoaderRoute: typeof GameRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/api/unity': {
      id: '/api/unity'
      path: '/api/unity'
      fullPath: '/api/unity'
      preLoaderRoute: typeof ApiUnityRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/api/cape': {
      id: '/api/cape'
      path: '/api/cape'
      fullPath: '/api/cape'
      preLoaderRoute: typeof ApiCapeRouteImport
      parentRoute: typeof rootRouteImport
    }
  }
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  GameRoute: GameRoute,
  LandingRoute: LandingRoute,
  RegisterRoute: RegisterRoute,
  ResultRoute: ResultRoute,
  TutorialRoute: TutorialRoute,
  ApiCapeRoute: ApiCapeRoute,
  ApiUnityRoute: ApiUnityRoute,
}
export const routeTree = rootRouteImport
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()

import type { getRouter } from './router.tsx'
import type { startInstance } from './start.ts'
declare module '@tanstack/react-start' {
  interface Register {
    ssr: true
    router: Awaited<ReturnType<typeof getRouter>>
    config: Awaited<ReturnType<typeof startInstance.getOptions>>
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd base-templates/tanstack-unity && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors referencing `launch`, `score`, `LaunchRoute`, or `ScoreRoute`.

- [ ] **Step 3: Commit**

```bash
git add base-templates/tanstack-unity/src/routeTree.gen.ts
git commit -m "fix(tanstack-unity): update routeTree.gen.ts for landing+result routes"
```

---

## Task 6: Rename onboarding→tutorial in all five Next.js base templates

**Files:** (repeat for each of next-unity, next-r3f, next-phaser, next-memory, next-none)
- Rename: `base-templates/next-*/app/(campaign)/onboarding/page.tsx` → `tutorial/page.tsx`

- [ ] **Step 1: For each template, create `tutorial/page.tsx` from `onboarding/page.tsx`**

The content is identical to the original `onboarding/page.tsx` with these substitutions:
- `useInstanceId('onboarding')` → `useInstanceId('tutorial')`
- `buildCopyResolver(capeData, 'onboarding', instanceId)` → `buildCopyResolver(capeData, 'tutorial', instanceId)`
- `getCapeBoolean(capeData, \`settings.pages.${instanceId}.allowSkip\`, false)` — unchanged (instanceId already updated)
- `navigate('{{NEXT_AFTER_ONBOARDING}}')` → `navigate('{{NEXT_AFTER_TUTORIAL}}')`
- `'{{BUTTON_VARIANT_ONBOARDING_NEXT}}'` → `'{{BUTTON_VARIANT_TUTORIAL_NEXT}}'`
- The `advance` function reference stays, only the token changes

The full `tutorial/page.tsx` for each template (content is the same across all five):

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCapeData } from '@hooks/useCapeData';
import { useInstanceId } from '@hooks/useInstanceId';
import { useSafeNavigation } from '@hooks/useSafeNavigation';
import { getCapeText, getCapeImage, getCapeBoolean, buildCopyResolver, buildImageResolver, isVideoUrl } from '@utils/getCapeData';
import Button from '@components/_core/Button/Button';

export default function TutorialPage() {
  const router       = useRouter();
  const navigate     = useSafeNavigation();
  const { capeData } = useCapeData();
  const instanceId   = useInstanceId('tutorial');
  const t   = buildCopyResolver(capeData, 'tutorial', instanceId);
  const img = buildImageResolver(capeData, 'tutorial', instanceId);

  const bgUrl   = img('background')
              || getCapeImage(capeData, `files.${instanceId}.backgroundImage`)
              || getCapeImage(capeData, `files.${instanceId}.heroImage`)
              || getCapeImage(capeData, 'general.landing.background')
              || '/assets/hero-mobile.png';
  const logoUrl = img('logo')
              || getCapeImage(capeData, 'general.landing.logo')
              || getCapeImage(capeData, 'general.header.logo')
              || '/assets/logo-livewall-wordmark.svg';

  const DEFAULT_STEPS: Array<{ title: string; body: string }> = [
    { title: 'Welcome',             body: 'Tap the screen to start playing.' },
    { title: 'Score points',        body: 'React fast, beat the clock, rack up combos.' },
    { title: 'Top the leaderboard', body: 'Set a high score and see how you stack up.' },
  ];

  const steps = [1, 2, 3, 4, 5, 6].map((n) => {
    const dflt = DEFAULT_STEPS[n - 1];
    return {
      title: t(`step${n}Title`, dflt?.title ?? ''),
      body:  t(`step${n}Body`,  dflt?.body  ?? ''),
      image: getCapeImage(capeData, `files.${instanceId}.step${n}Image`)
          || getCapeImage(capeData, `files.tutorial.step${n}Image`),
    };
  }).filter(s => s.title.trim().length > 0);

  const headline  = t('headline', '[copy.tutorial.headline]');
  const subline   = t('subline',  '');
  const kicker    = t('kicker',   'How to play');
  const ctaFinal  = t('cta',      "Let's go");
  const ctaNext   = t('ctaNext',  'Continue');
  const allowSkip = getCapeBoolean(capeData, `settings.pages.${instanceId}.allowSkip`, false);

  const [slideIdx, setSlideIdx] = useState(0);
  const isMulti     = steps.length >= 2;
  const isLastSlide = slideIdx === steps.length - 1;
  const currentStep = steps[slideIdx];

  const showBg       = isMulti && currentStep?.image ? currentStep.image : bgUrl;
  const showHeadline = isMulti ? currentStep.title : (steps[0]?.title || headline);
  const showBody     = isMulti ? currentStep.body  : (steps[0]?.body  || subline);
  const showCta      = isMulti && !isLastSlide ? ctaNext : ctaFinal;

  const advance = () => navigate('{{NEXT_AFTER_TUTORIAL}}');
  const onCtaClick = () => {
    if (!isMulti || isLastSlide) advance();
    else setSlideIdx(i => Math.min(i + 1, steps.length - 1));
  };

  return (
    <div className="campaign-screen campaign-screen--hero">
      {isVideoUrl(showBg)
        ? <video src={showBg} className="campaign-hero-bleed" autoPlay muted loop playsInline aria-hidden key={showBg} />
        // eslint-disable-next-line @next/next/no-img-element
        : <img   src={showBg} alt="" className="campaign-hero-bleed" aria-hidden key={showBg} />
      }
      <div className="campaign-hero-shade" aria-hidden />

      <div className="campaign-shell relative z-10">
        <header className="campaign-hero-header campaign-hero-header--with-close" style={{ animation: 'fadeIn 0.4s ease both' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt="Logo" className="campaign-hero-logo" />
          {isMulti && (
            <button className="campaign-close" aria-label="Close" onClick={() => router.back()}>×</button>
          )}
        </header>

        <div
          key={slideIdx}
          className="campaign-stack campaign-hero-content"
          style={{ animation: 'fadeIn 0.32s ease both' }}
        >
          <p className="campaign-kicker">{kicker}</p>
          <h1 className="campaign-title campaign-title--compact">{showHeadline}</h1>
          {showBody && <p className="campaign-copy max-w-[28rem] text-base sm:text-lg">{showBody}</p>}
        </div>

        <div className="campaign-actions" style={{ animation: 'fadeIn 0.4s 0.18s ease both' }}>
          {isMulti && (
            <div className="campaign-pagination" role="tablist" aria-label="Tutorial progress">
              {steps.map((_, i) => (
                <button
                  key={i}
                  role="tab"
                  aria-selected={i === slideIdx}
                  aria-label={`Go to slide ${i + 1}`}
                  className={`campaign-pagination__dot${i === slideIdx ? ' is-active' : ''}`}
                  onClick={() => setSlideIdx(i)}
                />
              ))}
            </div>
          )}
          <Button variant={'{{BUTTON_VARIANT_TUTORIAL_NEXT}}' as any} className="w-full" size="lg" onClick={onCtaClick}>
            {showCta}
          </Button>
          {allowSkip && !isLastSlide && (
            <button type="button" onClick={advance} className="campaign-skip" aria-label="Skip tutorial">
              Skip →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

Write this file to all five templates:
- `base-templates/next-unity/app/(campaign)/tutorial/page.tsx`
- `base-templates/next-r3f/app/(campaign)/tutorial/page.tsx`
- `base-templates/next-phaser/app/(campaign)/tutorial/page.tsx`
- `base-templates/next-memory/app/(campaign)/tutorial/page.tsx`
- `base-templates/next-none/app/(campaign)/tutorial/page.tsx`

Note: if a template doesn't have `onboarding/page.tsx`, skip the delete step for that template.

- [ ] **Step 2: Delete the old `onboarding/` directories from all five templates**

```bash
git rm -r base-templates/next-unity/app/\(campaign\)/onboarding \
           base-templates/next-r3f/app/\(campaign\)/onboarding \
           base-templates/next-phaser/app/\(campaign\)/onboarding \
           base-templates/next-memory/app/\(campaign\)/onboarding \
           base-templates/next-none/app/\(campaign\)/onboarding 2>/dev/null; true
```

- [ ] **Step 3: Commit**

```bash
git add base-templates/next-unity/app/\(campaign\)/tutorial \
        base-templates/next-r3f/app/\(campaign\)/tutorial \
        base-templates/next-phaser/app/\(campaign\)/tutorial \
        base-templates/next-memory/app/\(campaign\)/tutorial \
        base-templates/next-none/app/\(campaign\)/tutorial
git commit -m "feat(next-templates): rename onboarding→tutorial across all five next-* templates"
```

---

## Task 7: Add stacks filter to scaffold.js

**Files:**
- Modify: `cli/scaffold.js`

- [ ] **Step 1: Find the module file-copy loop(s)**

Search for all occurrences of the loop that iterates `manifest.files`:

```bash
grep -n "manifest.files" cli/scaffold.js
```

There will be at least one occurrence inside `scaffoldNext` (around line 1878). There may be a second in a `scaffoldTanStack` function. Add the filter in every occurrence.

- [ ] **Step 2: Add the stacks filter immediately after the src/dest guard**

In each occurrence of the manifest files loop, after:
```javascript
          if (!file.src || !file.dest) {
            warn(`[${moduleId}] manifest entry missing src or dest: ${JSON.stringify(file)}`);
            continue;
          }
```

Add:
```javascript
          if (file.stacks && !file.stacks.includes(stack)) {
            continue;
          }
```

The `stack` variable is the function parameter (e.g. `stack = 'next'` in `scaffoldNext`). Confirm it is in scope at that line — if the scaffolding function uses a different variable name (e.g. `currentStack`, `templateStack`), use that name instead.

- [ ] **Step 3: Verify the change with a dry-run test**

```bash
node cli/scaffold.js --name=test-filter --cape-id=99999 --market=NL --game=unity \
  --module=leaderboard --output=/tmp/test-filter --yes 2>&1 | tail -20
```

Expected: no errors; leaderboard module files copy successfully.

- [ ] **Step 4: Commit**

```bash
git add cli/scaffold.js
git commit -m "feat(scaffold): skip module files whose stacks field excludes current stack"
```

---

## Task 8: Leaderboard module — TanStack support

**Files:**
- Modify: `modules/leaderboard/manifest.json`
- Move: `modules/leaderboard/actions/get-leaderboard/action.ts` → `modules/leaderboard/next/actions/get-leaderboard/action.ts`
- Create: `modules/leaderboard/tanstack/server/getLeaderboard.ts`
- Create: `modules/leaderboard/tanstack/routes/leaderboard.tsx`
- Create: `modules/leaderboard/tanstack/loaders/LeaderboardLoader.ts`

- [ ] **Step 1: Move the existing Next.js action file**

```bash
mkdir -p modules/leaderboard/next/actions/get-leaderboard
mv modules/leaderboard/actions/get-leaderboard/action.ts \
   modules/leaderboard/next/actions/get-leaderboard/action.ts
```

- [ ] **Step 2: Create `modules/leaderboard/tanstack/server/getLeaderboard.ts`**

```typescript
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import type { IApiResult } from '~/interfaces/api/IApiResult.ts';
import { useAppSession } from '~/server/api/Session.ts';

const LeaderboardSchema = z.object({
  type:   z.enum(['daily', 'weekly', 'total']).default('total'),
  offset: z.number().int().nonneg().default(0),
  limit:  z.number().int().positive().default(100),
});

export type LeaderboardInput = z.infer<typeof LeaderboardSchema>;

export const getLeaderboardRequest = createServerFn({ method: 'POST' })
  .inputValidator(LeaderboardSchema)
  .handler(async ({ data }): Promise<IApiResult<any>> => {
    const session     = await useAppSession();
    const token       = session.data.accessToken;
    const { type, offset, limit } = data;

    const params = new URLSearchParams({
      type,
      offset: String(offset),
      limit:  String(limit),
    });
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    const res  = await fetch(`${process.env.API_URL}/api/leaderboard/${type}?${params}`, { headers });
    const json = await res.json();
    return json;
  });
```

- [ ] **Step 3: Create `modules/leaderboard/tanstack/loaders/LeaderboardLoader.ts`**

```typescript
import { getCapeCopy } from '~/server/cape/CapeProvider.ts';

export async function loadLeaderboardData(language: string) {
  const [headline, subline, kicker, ctaDone] = await getCapeCopy(language, [
    ['leaderboard', 'headline'],
    ['leaderboard', 'subline'],
    ['leaderboard', 'kicker'],
    ['leaderboard', 'ctaDone'],
  ]);

  return {
    copy: { headline, subline, kicker, ctaDone },
  };
}
```

- [ ] **Step 4: Create `modules/leaderboard/tanstack/routes/leaderboard.tsx`**

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { PageContainer } from '~/components/containers/PageContainer.tsx';
import { StyledButton } from '~/components/buttons/StyledButton.tsx';
import { loadLeaderboardData } from '~/loaders/LeaderboardLoader.ts';
import { getLeaderboardRequest } from '~/server/api/endpoints/Leaderboard.ts';
import { useGameNavigation } from '~/hooks/useGameNavigation.ts';

type LbTab = 'daily' | 'weekly' | 'total';

interface LbRow { rank: number; name: string; score: number; isYou?: boolean }

export const Route = createFileRoute('/leaderboard')({
  component: LeaderboardPage,
  loader: async ({ context }) => await loadLeaderboardData(context.language),
});

function LeaderboardPage() {
  const { copy } = Route.useLoaderData();
  const { navigate } = useGameNavigation();
  const [tab,  setTab]  = useState<LbTab>('total');
  const [rows, setRows] = useState<LbRow[]>([]);

  useEffect(() => {
    getLeaderboardRequest({ data: { type: tab, offset: 0, limit: 10 } })
      .then((res: any) => { if (res?.data) setRows(res.data); })
      .catch(() => {});
  }, [tab]);

  return (
    <PageContainer className="campaign-screen">
      <div className="campaign-shell">
        <section className="campaign-stack" style={{ animation: 'fadeIn 0.4s ease both' }}>
          {copy.kicker && <p className="campaign-kicker">{copy.kicker}</p>}
          <h1 className="campaign-title campaign-title--compact">{copy.headline || 'Leaderboard'}</h1>
          {copy.subline && <p className="campaign-copy">{copy.subline}</p>}
        </section>

        <div className="lb-tabs" role="tablist">
          {(['daily', 'weekly', 'total'] as LbTab[]).map(t => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              className={`lb-tab${tab === t ? ' is-active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <section
          className="campaign-panel flex-1 min-h-0 p-3"
          style={{ animation: 'fadeIn 0.4s 0.1s ease both' }}
        >
          <ol className="lb-list">
            {rows.map((row, i) => (
              <li key={i} className={`lb-row${row.isYou ? ' is-you' : ''}`}>
                <span className="lb-row__rank">#{row.rank}</span>
                <span className="lb-row__name">{row.name}{row.isYou ? ' (you)' : ''}</span>
                <span className="lb-row__score">{row.score.toLocaleString()}</span>
              </li>
            ))}
            {rows.length === 0 && (
              <li className="lb-row lb-row--empty">No scores yet.</li>
            )}
          </ol>
        </section>

        <div className="campaign-actions" style={{ animation: 'fadeIn 0.4s 0.2s ease both' }}>
          <StyledButton onClick={navigate}>
            {copy.ctaDone || 'Done'}
          </StyledButton>
        </div>
      </div>
    </PageContainer>
  );
}
```

- [ ] **Step 5: Update `modules/leaderboard/manifest.json`**

```json
{
  "id": "leaderboard",
  "name": "Leaderboard",
  "description": "Ranked score table with daily/weekly/all-time tabs, personal best row, and infinite-scroll pagination.",
  "files": [
    {
      "src": "components/Leaderboard/Leaderboard.tsx",
      "dest": "components/_modules/Leaderboard/Leaderboard.tsx"
    },
    {
      "src": "components/Leaderboard/LeaderboardRow.tsx",
      "dest": "components/_modules/Leaderboard/LeaderboardRow.tsx"
    },
    {
      "src": "components/Leaderboard/LeaderboardTabs.tsx",
      "dest": "components/_modules/Leaderboard/LeaderboardTabs.tsx"
    },
    {
      "src": "next/actions/get-leaderboard/action.ts",
      "dest": "app/actions/get-leaderboard/action.ts",
      "stacks": ["next"]
    },
    {
      "src": "app/(campaign)/leaderboard/page.tsx",
      "dest": "app/(campaign)/leaderboard/page.tsx",
      "stacks": ["next"]
    },
    {
      "src": "tanstack/server/getLeaderboard.ts",
      "dest": "src/server/api/endpoints/Leaderboard.ts",
      "stacks": ["tanstack"]
    },
    {
      "src": "tanstack/loaders/LeaderboardLoader.ts",
      "dest": "src/loaders/LeaderboardLoader.ts",
      "stacks": ["tanstack"]
    },
    {
      "src": "tanstack/routes/leaderboard.tsx",
      "dest": "src/routes/leaderboard.tsx",
      "stacks": ["tanstack"]
    }
  ],
  "envVars": [],
  "packages": [],
  "implies": ["scoring"]
}
```

- [ ] **Step 6: Validate the manifest JSON**

```bash
node -e "require('./modules/leaderboard/manifest.json'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 7: Commit**

```bash
git add modules/leaderboard/
git commit -m "feat(leaderboard): add TanStack route, loader, and server fn; stack-conditional manifest"
```

---

## Task 9: Voucher module — TanStack support

**Files:**
- Modify: `modules/voucher/manifest.json`
- Create: `modules/voucher/tanstack/routes/voucher.tsx`
- Create: `modules/voucher/tanstack/loaders/VoucherLoader.ts`

- [ ] **Step 1: Create `modules/voucher/tanstack/loaders/VoucherLoader.ts`**

```typescript
import { getCapeCopy, getCapeProperty } from '~/server/cape/CapeProvider.ts';

export async function loadVoucherData(language: string) {
  const [headline, body, ctaDone] = await getCapeCopy(language, [
    ['voucher', 'headline'],
    ['voucher', 'body'],
    ['voucher', 'ctaDone'],
  ]);

  const showQrProp = await getCapeProperty({ type: 'settings', path: ['pages', 'voucher', 'showQr'] });
  const showQr = showQrProp.asBoolean() ?? true;

  return {
    copy: { headline, body, ctaDone },
    showQr,
  };
}
```

- [ ] **Step 2: Create `modules/voucher/tanstack/routes/voucher.tsx`**

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { PageContainer } from '~/components/containers/PageContainer.tsx';
import { StyledButton } from '~/components/buttons/StyledButton.tsx';
import { loadVoucherData } from '~/loaders/VoucherLoader.ts';
import { useGameNavigation } from '~/hooks/useGameNavigation.ts';
import { useUnityStore } from '~/hooks/stores/useUnityStore.ts';

export const Route = createFileRoute('/voucher')({
  component: VoucherPage,
  loader: async ({ context }) => await loadVoucherData(context.language),
});

function VoucherPage() {
  const { copy, showQr } = Route.useLoaderData();
  const { navigate } = useGameNavigation();
  const voucherCode = useUnityStore((state) => state.result?.voucherCode ?? '');

  const qrUrl = voucherCode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(voucherCode)}`
    : null;

  return (
    <PageContainer className="campaign-screen campaign-screen--hero">
      <div className="campaign-hero-shade" aria-hidden />
      <div className="campaign-shell">
        <div className="campaign-hero-content">
          <h1 className="campaign-title">{copy.headline || 'Your Reward'}</h1>
          {copy.body && <p className="campaign-copy">{copy.body}</p>}

          <div className="voucher-block">
            <span className="voucher-block__code">{voucherCode || '——'}</span>
            {showQr && qrUrl && (
              <img src={qrUrl} alt="QR code" className="voucher-block__qr" width={160} height={160} />
            )}
          </div>

          <div className="campaign-actions">
            <StyledButton onClick={navigate}>
              {copy.ctaDone || 'Done'}
            </StyledButton>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
```

- [ ] **Step 3: Update `modules/voucher/manifest.json`**

```json
{
  "id": "voucher",
  "name": "Voucher / Reward",
  "description": "Reward screen with a unique code. QR code rendered via api.qrserver.com out of the box; swap for a self-hosted lib in production.",
  "files": [
    {
      "src": "components/Voucher/Voucher.tsx",
      "dest": "components/_modules/Voucher/Voucher.tsx"
    },
    {
      "src": "components/Voucher/QRCode.tsx",
      "dest": "components/_modules/Voucher/QRCode.tsx"
    },
    {
      "src": "app/(campaign)/voucher/page.tsx",
      "dest": "app/(campaign)/voucher/page.tsx",
      "stacks": ["next"]
    },
    {
      "src": "tanstack/loaders/VoucherLoader.ts",
      "dest": "src/loaders/VoucherLoader.ts",
      "stacks": ["tanstack"]
    },
    {
      "src": "tanstack/routes/voucher.tsx",
      "dest": "src/routes/voucher.tsx",
      "stacks": ["tanstack"]
    }
  ],
  "envVars": [],
  "packages": [],
  "cspPatch": {
    "img-src": ["https://api.qrserver.com"]
  },
  "notes": [
    "Voucher code comes from useUnityStore (TanStack) or GameContext (Next.js).",
    "QR rendering uses api.qrserver.com by default.",
    "Toggle via CAPE: settings.pages.voucher.showQr (boolean)."
  ]
}
```

- [ ] **Step 4: Validate the manifest**

```bash
node -e "require('./modules/voucher/manifest.json'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add modules/voucher/
git commit -m "feat(voucher): add TanStack route + loader; stack-conditional manifest"
```

---

## Task 10: Video module — TanStack support

**Files:**
- Modify: `modules/video/manifest.json`
- Create: `modules/video/tanstack/loaders/VideoLoader.ts`
- Create: `modules/video/tanstack/routes/video.tsx`
- Create: `modules/video/tanstack/routes/intro-video.tsx`
- Create: `modules/video/tanstack/routes/loading-video.tsx`
- Create: `modules/video/tanstack/routes/ad-video.tsx`

- [ ] **Step 1: Create `modules/video/tanstack/loaders/VideoLoader.ts`**

```typescript
import { getCapeCopy, getCapeProperty } from '~/server/cape/CapeProvider.ts';

export async function loadVideoData(language: string) {
  const [headline] = await getCapeCopy(language, [['video', 'headline']]);
  const [videoAsset, minPlaybackProp, alwaysSkipProp, readyFallbackProp] = await Promise.all([
    getCapeProperty({ type: 'general', path: ['video', 'introVideo'] }),
    getCapeProperty({ type: 'settings', path: ['pages', 'video', 'minPlaybackSec'] }),
    getCapeProperty({ type: 'settings', path: ['pages', 'video', 'alwaysSkip'] }),
    getCapeProperty({ type: 'settings', path: ['pages', 'video', 'readyFallbackSec'] }),
  ]);

  return {
    copy: { headline },
    videoUrl:        videoAsset.asFile()?.url ?? null,
    minPlaybackSec:  minPlaybackProp.asNumber()  ?? 3,
    alwaysSkip:      alwaysSkipProp.asBoolean()  ?? false,
    readyFallbackSec: readyFallbackProp.asNumber() ?? 8,
  };
}
```

- [ ] **Step 2: Create `modules/video/tanstack/routes/video.tsx`** (and copy for intro-video and ad-video with different tokens)

The base video page component — used as the template for `video`, `intro-video`, and `ad-video`. Only the `createFileRoute` path and navigation token differ between them.

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { PageContainer } from '~/components/containers/PageContainer.tsx';
import { loadVideoData } from '~/loaders/VideoLoader.ts';
import { useGameNavigation } from '~/hooks/useGameNavigation.ts';

export const Route = createFileRoute('/video')({
  component: VideoPage,
  loader: async ({ context }) => await loadVideoData(context.language),
});

function VideoPage() {
  const { videoUrl, minPlaybackSec, alwaysSkip } = Route.useLoaderData();
  const { navigate } = useGameNavigation();
  const [canSkip, setCanSkip] = useState(alwaysSkip);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!videoUrl) { navigate(); return; }
    if (alwaysSkip) return;
    timerRef.current = setTimeout(() => setCanSkip(true), minPlaybackSec * 1000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <PageContainer className="campaign-screen campaign-screen--video">
      {videoUrl ? (
        <video
          src={videoUrl}
          className="campaign-video-fill"
          autoPlay
          muted={false}
          playsInline
          onEnded={navigate}
        />
      ) : (
        <div className="campaign-video-placeholder" />
      )}
      {canSkip && (
        <button type="button" className="campaign-video-skip" onClick={navigate}>
          Skip →
        </button>
      )}
    </PageContainer>
  );
}
```

- [ ] **Step 3: Create `modules/video/tanstack/routes/intro-video.tsx`**

Same as video.tsx, but with route `/intro-video`:

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { PageContainer } from '~/components/containers/PageContainer.tsx';
import { loadVideoData } from '~/loaders/VideoLoader.ts';
import { useGameNavigation } from '~/hooks/useGameNavigation.ts';

export const Route = createFileRoute('/intro-video')({
  component: IntroVideoPage,
  loader: async ({ context }) => await loadVideoData(context.language),
});

function IntroVideoPage() {
  const { videoUrl, minPlaybackSec, alwaysSkip } = Route.useLoaderData();
  const { navigate } = useGameNavigation();
  const [canSkip, setCanSkip] = useState(alwaysSkip);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!videoUrl) { navigate(); return; }
    if (alwaysSkip) return;
    timerRef.current = setTimeout(() => setCanSkip(true), minPlaybackSec * 1000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <PageContainer className="campaign-screen campaign-screen--video">
      {videoUrl ? (
        <video src={videoUrl} className="campaign-video-fill" autoPlay muted={false} playsInline onEnded={navigate} />
      ) : (
        <div className="campaign-video-placeholder" />
      )}
      {canSkip && (
        <button type="button" className="campaign-video-skip" onClick={navigate}>Skip →</button>
      )}
    </PageContainer>
  );
}
```

- [ ] **Step 4: Create `modules/video/tanstack/routes/ad-video.tsx`**

Same pattern, route `/ad-video`:

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { PageContainer } from '~/components/containers/PageContainer.tsx';
import { loadVideoData } from '~/loaders/VideoLoader.ts';
import { useGameNavigation } from '~/hooks/useGameNavigation.ts';

export const Route = createFileRoute('/ad-video')({
  component: AdVideoPage,
  loader: async ({ context }) => await loadVideoData(context.language),
});

function AdVideoPage() {
  const { videoUrl, minPlaybackSec, alwaysSkip } = Route.useLoaderData();
  const { navigate } = useGameNavigation();
  const [canSkip, setCanSkip] = useState(alwaysSkip);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!videoUrl) { navigate(); return; }
    if (alwaysSkip) return;
    timerRef.current = setTimeout(() => setCanSkip(true), minPlaybackSec * 1000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <PageContainer className="campaign-screen campaign-screen--video">
      {videoUrl ? (
        <video src={videoUrl} className="campaign-video-fill" autoPlay muted={false} playsInline onEnded={navigate} />
      ) : (
        <div className="campaign-video-placeholder" />
      )}
      {canSkip && (
        <button type="button" className="campaign-video-skip" onClick={navigate}>Skip →</button>
      )}
    </PageContainer>
  );
}
```

- [ ] **Step 5: Create `modules/video/tanstack/routes/loading-video.tsx`**

The loading-video variant loops until Unity fires game-ready, with a fallback timer:

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { PageContainer } from '~/components/containers/PageContainer.tsx';
import { loadVideoData } from '~/loaders/VideoLoader.ts';
import { useGameNavigation } from '~/hooks/useGameNavigation.ts';
import { useUnity } from '~/components/game/UnityContext.tsx';

export const Route = createFileRoute('/loading-video')({
  component: LoadingVideoPage,
  loader: async ({ context }) => await loadVideoData(context.language),
});

function LoadingVideoPage() {
  const { videoUrl, alwaysSkip, readyFallbackSec } = Route.useLoaderData();
  const { navigate } = useGameNavigation();
  const { isReady } = useUnity();
  const [canSkip, setCanSkip] = useState(alwaysSkip);
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Navigate as soon as Unity reports ready
  useEffect(() => {
    if (isReady) navigate();
  }, [isReady]);

  // Fallback: allow skip if Unity never fires game-ready
  useEffect(() => {
    if (alwaysSkip) { setCanSkip(true); return; }
    fallbackRef.current = setTimeout(() => setCanSkip(true), readyFallbackSec * 1000);
    return () => { if (fallbackRef.current) clearTimeout(fallbackRef.current); };
  }, []);

  return (
    <PageContainer className="campaign-screen campaign-screen--video">
      {videoUrl ? (
        <video src={videoUrl} className="campaign-video-fill" autoPlay muted loop playsInline />
      ) : (
        <div className="campaign-video-loader" aria-label="Loading game…">
          <span className="campaign-spinner" />
        </div>
      )}
      {canSkip && (
        <button type="button" className="campaign-video-skip" onClick={navigate}>Skip →</button>
      )}
    </PageContainer>
  );
}
```

- [ ] **Step 6: Update `modules/video/manifest.json`**

```json
{
  "id": "video",
  "name": "Video Interlude",
  "description": "Full-screen video playback page. Navigates to the next route when the video ends or when the user taps skip.",
  "files": [
    {
      "src": "components/VideoIntro/VideoIntro.tsx",
      "dest": "components/_modules/VideoIntro/VideoIntro.tsx"
    },
    {
      "src": "app/(campaign)/video/page.tsx",
      "dest": "app/(campaign)/video/page.tsx",
      "stacks": ["next"]
    },
    {
      "src": "tanstack/loaders/VideoLoader.ts",
      "dest": "src/loaders/VideoLoader.ts",
      "stacks": ["tanstack"]
    },
    {
      "src": "tanstack/routes/video.tsx",
      "dest": "src/routes/video.tsx",
      "stacks": ["tanstack"]
    },
    {
      "src": "tanstack/routes/intro-video.tsx",
      "dest": "src/routes/intro-video.tsx",
      "stacks": ["tanstack"]
    },
    {
      "src": "tanstack/routes/loading-video.tsx",
      "dest": "src/routes/loading-video.tsx",
      "stacks": ["tanstack"]
    },
    {
      "src": "tanstack/routes/ad-video.tsx",
      "dest": "src/routes/ad-video.tsx",
      "stacks": ["tanstack"]
    }
  ],
  "envVars": [],
  "packages": [],
  "notes": [
    "Video src is read from CAPE: general.video.introVideo.",
    "loading-video loops until Unity fires the game-ready signal; readyFallbackSec controls the auto-skip fallback.",
    "video / intro-video / ad-video navigate on end or skip after minPlaybackSec."
  ]
}
```

- [ ] **Step 7: Validate the manifest**

```bash
node -e "require('./modules/video/manifest.json'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 8: Commit**

```bash
git add modules/video/
git commit -m "feat(video): add TanStack routes for all video variants + loader; stack-conditional manifest"
```

---

## Task 11: Update PreviewPane.tsx

**Files:**
- Modify: `cli/wizard-ui/src/steps/PreviewPane.tsx`

- [ ] **Step 1: Update the `PageRenderer` dispatcher**

Replace the current `switch` inside `PageRenderer`:

```typescript
function PageRenderer({ config, instance, navigate, onMenu }: { config: ScaffoldConfig; instance: PageInstance; navigate: NavFn; onMenu: () => void }) {
  switch (instance.type) {
    case 'landing':       return <LandingPreview      config={config} instance={instance} navigate={navigate} onMenu={onMenu} />;
    case 'tutorial':      return <TutorialPreview      config={config} instance={instance} navigate={navigate} />;
    case 'video':
    case 'intro-video':
    case 'ad-video':      return <VideoPreview        config={config} instance={instance} navigate={navigate} />;
    case 'loading-video': return <LoadingVideoPreview config={config} instance={instance} navigate={navigate} />;
    case 'register':      return <RegisterPreview     config={config} instance={instance} navigate={navigate} />;
    case 'game':          return <GamePreview         config={config} instance={instance} navigate={navigate} />;
    case 'result':        return <ResultPreview       config={config} instance={instance} navigate={navigate} onMenu={onMenu} />;
    case 'leaderboard':   return <LeaderboardPreview  config={config} instance={instance} navigate={navigate} onMenu={onMenu} />;
    case 'voucher':       return <VoucherPreview      config={config} instance={instance} navigate={navigate} onMenu={onMenu} />;
    default:              return <PlaceholderPreview  instance={instance} />;
  }
}
```

Key changes from the current dispatcher:
- Remove `case 'launch'` (dropped)
- Remove `case 'score'` (dropped)
- Remove `case 'onboarding'` (dropped)
- Add `case 'intro-video'` and `case 'ad-video'` → reuse `VideoPreview`
- Add `case 'loading-video'` → new `LoadingVideoPreview`
- Rename `TanstackTutorialPreview` → `TutorialPreview` in the case

- [ ] **Step 2: Add `LoadingVideoPreview` component**

Add after the existing `VideoPreview` function:

```typescript
function LoadingVideoPreview({ config, instance, navigate }: { config: ScaffoldConfig; instance: PageInstance; navigate: NavFn }) {
  const s = instSettings(config, instance.id);
  const alwaysSkip     = Boolean(s.alwaysSkip);
  const fallbackSec    = (s.readyFallbackSec ?? 8) as number;
  return (
    <div className="pp pp--video">
      <div className="pp-video-stage">
        <span className="pp-video-icon" style={{ animation: 'spin 1.2s linear infinite' }}>⟳</span>
        <span className="pp-video-loading">Loading game…</span>
      </div>
      <button type="button" className="pp-video-skip" onClick={() => navigate(instance.id, 'next')}>
        {alwaysSkip ? 'Skip →' : `Skip (${fallbackSec}s fallback)`}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Rename `TanstackTutorialPreview` → `TutorialPreview`**

In the file, rename the function:
```typescript
function TutorialPreview({ config, instance, navigate }: { ... }) {
```
(was `function TanstackTutorialPreview`)

- [ ] **Step 4: Update `LandingPreview` to show optional tutorial button**

Replace the current `LandingPreview` function:

```typescript
function LandingPreview({ config, instance, navigate, onMenu }: { config: ScaffoldConfig; instance: PageInstance; navigate: NavFn; onMenu: () => void }) {
  const showTutorial    = isExitOn(config, instance.id, 'tutorial',    false);
  const showLeaderboard = isExitOn(config, instance.id, 'leaderboard', false);
  return (
    <div className="pp pp--hero">
      <HeroBleed />
      <div className="pp-shell">
        <HeaderLogo onMenu={onMenu} />
        <div className="pp-bottom">
          <HeroStack kicker="LIVE EXPERIENCE" title="Welcome" body="Are you ready to play?" />
          <div className="pp-actions">
            <CtaButton kind={exitVariant(config, instance.id, 'next', 'primary')} label="Play now" onClick={() => navigate(instance.id, 'next')} />
            {showTutorial    && <CtaButton kind={exitVariant(config, instance.id, 'tutorial',    'secondary')} label="Tutorial"    onClick={() => navigate(instance.id, 'tutorial')} />}
            {showLeaderboard && <CtaButton kind={exitVariant(config, instance.id, 'leaderboard', 'secondary')} label="Leaderboard" onClick={() => navigate(instance.id, 'leaderboard')} />}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Delete the three now-unused renderer functions**

Remove these functions entirely from the file:
- `LaunchPreview` (was `case 'launch'`)
- `ScorePreview` (was `case 'score'`)
- `OnboardingPreview` (was `case 'onboarding'`)

- [ ] **Step 6: Verify the wizard builds**

```bash
cd cli/wizard-ui && npm run build 2>&1 | tail -10
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add cli/wizard-ui/src/steps/PreviewPane.tsx
git commit -m "feat(PreviewPane): unify renderers — drop launch/score/onboarding, add loading-video, tutorial exit on landing"
```

---

## Self-review checklist (implementor: run before declaring done)

- [ ] `grep -r "launch\|/score\|onboarding\|TANSTACK_PAGE_IDS\|NEXT_PAGE_IDS" cli/wizard-ui/src/ base-templates/tanstack-unity/src/` returns no hits
- [ ] `node -e "require('./modules/leaderboard/manifest.json'); require('./modules/voucher/manifest.json'); require('./modules/video/manifest.json'); console.log('OK')"` → `OK`
- [ ] `cd cli/wizard-ui && npm run build` → no errors
- [ ] `cd base-templates/tanstack-unity && npx tsc --noEmit` → no errors
