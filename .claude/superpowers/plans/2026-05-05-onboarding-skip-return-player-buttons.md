# Onboarding Skip & Return Player Buttons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Skip onboarding for returning players and show "Play again" + leaderboard buttons on the landing page after a game has been played.

**Architecture:** Add a `hasPlayed` boolean to `GameState` (persisted in localStorage), set it when `handleGameEnd` fires, then use both `hasPlayed` and the existing `onboardingCompleted` flag in the landing page to conditionally change CTA behaviour and render a second leaderboard button. A scaffold-time string token `{{RETURN_PLAYER_BUTTONS}}` gates the return-player button feature so campaigns that don't need it are unaffected.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, localStorage via `utils/storage.ts`

---

## File Map

| File | Change |
|---|---|
| `base-templates/next/types/game.ts` | Add `hasPlayed: boolean` to `GameState`; add `setHasPlayed` to `GameActions` |
| `base-templates/next/contexts/GameContext.tsx` | Add `hasPlayed` to defaultState, rehydration, persistence effect, and setters |
| `base-templates/next/app/(campaign)/gameplay/page.tsx` | Call `setHasPlayed(true)` inside `handleGameEnd` |
| `base-templates/next/app/(campaign)/landing/page.tsx` | Import `useGameContext`, add scaffold token, conditional CTA label, return-player leaderboard button, onboarding-skip navigation |

---

## Task 1: Add `hasPlayed` to GameState types

**Files:**
- Modify: `base-templates/next/types/game.ts`

- [ ] **Step 1: Add `hasPlayed` to `GameState` and `setHasPlayed` to `GameActions`**

  Replace the `// Flow` block in `GameState` and add the setter to `GameActions`:

  ```ts
  // In GameState — add hasPlayed after onboardingCompleted
    onboardingCompleted: boolean;
    hasPlayed: boolean;
    campaignStatus: CampaignStatus | null;
  ```

  ```ts
  // In GameActions — add after setOnboardingCompleted
    setOnboardingCompleted: (v: boolean) => void;
    setHasPlayed: (v: boolean) => void;
    setCampaignStatus: (status: CampaignStatus) => void;
  ```

  Full file after change:

  ```ts
  export type Platform = 'ios' | 'android' | 'desktop';

  export type CampaignStatus = 'upcoming' | 'active' | 'past';

  export interface GameState {
    // Auth
    token: string | null;
    userId: string | null;

    // User
    userName: string;
    alreadyRegistered: boolean;

    // Session
    sessionId: string | null;

    // Score
    score: number;
    highscore: number;
    rank: number | null;

    // Flow
    loading: boolean;
    gameIsReady: boolean;
    onboardingCompleted: boolean;
    hasPlayed: boolean;
    campaignStatus: CampaignStatus | null;

    // Device
    platform: Platform;
    isMuted: boolean;
  }

  export interface GameActions {
    setToken: (token: string) => void;
    setUserId: (id: string) => void;
    setUserName: (name: string) => void;
    setAlreadyRegistered: (v: boolean) => void;
    setSessionId: (id: string) => void;
    setScore: (score: number) => void;
    setHighscore: (score: number) => void;
    setRank: (rank: number) => void;
    setLoading: (v: boolean) => void;
    setGameIsReady: (v: boolean) => void;
    setOnboardingCompleted: (v: boolean) => void;
    setHasPlayed: (v: boolean) => void;
    setCampaignStatus: (status: CampaignStatus) => void;
    setIsMuted: (v: boolean) => void;
    reset: () => void;
  }

  export type GameContextValue = GameState & GameActions;
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  cd base-templates/next && npm run ts-compile
  ```

  Expected: errors about `hasPlayed` missing in `GameContext.tsx` — that's correct, we fix it next.

- [ ] **Step 3: Commit**

  ```bash
  git add base-templates/next/types/game.ts
  git commit -m "feat(types): add hasPlayed to GameState and GameActions"
  ```

---

## Task 2: Wire `hasPlayed` into GameContext

**Files:**
- Modify: `base-templates/next/contexts/GameContext.tsx`

- [ ] **Step 1: Add `hasPlayed` to `defaultState`**

  In the `defaultState` object, add after `onboardingCompleted`:

  ```ts
  const defaultState: GameState = {
    token: null,
    userId: null,
    userName: '',
    alreadyRegistered: false,
    sessionId: null,
    score: 0,
    highscore: 0,
    rank: null,
    loading: false,
    gameIsReady: false,
    onboardingCompleted: false,
    hasPlayed: false,
    campaignStatus: null,
    platform: 'desktop',
    isMuted: false,
  };
  ```

- [ ] **Step 2: Rehydrate `hasPlayed` from localStorage**

  In the `useState` initialiser inside `GameProvider`, add after `onboardingCompleted`:

  ```ts
  return {
    ...defaultState,
    platform,
    token: stored?.token ?? null,
    userId: stored?.userId ?? null,
    userName: stored?.userName ?? '',
    alreadyRegistered: stored?.alreadyRegistered ?? false,
    onboardingCompleted: stored?.onboardingCompleted ?? false,
    hasPlayed: stored?.hasPlayed ?? false,
    highscore: stored?.highscore ?? 0,
    isMuted: stored?.isMuted ?? false,
  };
  ```

- [ ] **Step 3: Persist `hasPlayed` to localStorage**

  In the `useEffect` that calls `setStorage`, add `hasPlayed`:

  ```ts
  useEffect(() => {
    setStorage(STORAGE_KEY, {
      token: state.token,
      userId: state.userId,
      userName: state.userName,
      alreadyRegistered: state.alreadyRegistered,
      onboardingCompleted: state.onboardingCompleted,
      hasPlayed: state.hasPlayed,
      highscore: state.highscore,
      isMuted: state.isMuted,
    });
  }, [
    state.token,
    state.userId,
    state.userName,
    state.alreadyRegistered,
    state.onboardingCompleted,
    state.hasPlayed,
    state.highscore,
    state.isMuted,
  ]);
  ```

- [ ] **Step 4: Add `setHasPlayed` to setters**

  In the `setters` useMemo, add after `setOnboardingCompleted`:

  ```ts
  const setters = useMemo(
    () => ({
      setToken: (v: string | null) => set('token', v),
      setUserId: (v: string | null) => set('userId', v),
      setUserName: (v: string) => set('userName', v),
      setAlreadyRegistered: (v: boolean) => set('alreadyRegistered', v),
      setSessionId: (v: string | null) => set('sessionId', v),
      setScore: (v: number) => set('score', v),
      setHighscore: (v: number) => set('highscore', v),
      setRank: (v: number | null) => set('rank', v),
      setLoading: (v: boolean) => set('loading', v),
      setGameIsReady: (v: boolean) => set('gameIsReady', v),
      setOnboardingCompleted: (v: boolean) => set('onboardingCompleted', v),
      setHasPlayed: (v: boolean) => set('hasPlayed', v),
      setCampaignStatus: (v: CampaignStatus) => set('campaignStatus', v),
      setIsMuted: (v: boolean) => set('isMuted', v),
      reset,
    }),
    [set, reset],
  );
  ```

- [ ] **Step 5: Verify TypeScript compiles**

  ```bash
  cd base-templates/next && npm run ts-compile
  ```

  Expected: no errors.

- [ ] **Step 6: Commit**

  ```bash
  git add base-templates/next/contexts/GameContext.tsx
  git commit -m "feat(context): wire hasPlayed into GameContext with localStorage persistence"
  ```

---

## Task 3: Set `hasPlayed` when the game ends

**Files:**
- Modify: `base-templates/next/app/(campaign)/gameplay/page.tsx`

- [ ] **Step 1: Destructure `setHasPlayed` from `useGameContext` and call it in `handleGameEnd`**

  Current line 14:
  ```ts
  const { setScore, setGameIsReady } = useGameContext();
  ```

  Replace with:
  ```ts
  const { setScore, setGameIsReady, setHasPlayed } = useGameContext();
  ```

  Current `handleGameEnd` (lines 24-27):
  ```ts
  const handleGameEnd = (nextScore: number) => {
    setScore(nextScore);
    navigate('{{NEXT_AFTER_GAME}}');
  };
  ```

  Replace with:
  ```ts
  const handleGameEnd = (nextScore: number) => {
    setScore(nextScore);
    setHasPlayed(true);
    navigate('{{NEXT_AFTER_GAME}}');
  };
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  cd base-templates/next && npm run ts-compile
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add base-templates/next/app/\(campaign\)/gameplay/page.tsx
  git commit -m "feat(gameplay): set hasPlayed on game end"
  ```

---

## Task 4: Update the landing page

**Files:**
- Modify: `base-templates/next/app/(campaign)/landing/page.tsx`

- [ ] **Step 1: Replace the entire file with the updated version**

  The changes are:
  - Import `useGameContext` from `@hooks/useGameContext`
  - Read `onboardingCompleted` and `hasPlayed` from context
  - Add `ctaReturning` and `leaderboardCta` CAPE reads (with safe fallbacks)
  - Add scaffold-time token `{{RETURN_PLAYER_BUTTONS}}`
  - Extract `handlePlay` — navigates to `/gameplay` when `onboardingCompleted`, else `{{NEXT_AFTER_LANDING}}`
  - CTA label: shows `ctaReturning` when `showReturnPlayerButtons && hasPlayed`, else `cta`
  - Return-player leaderboard button: renders when `showReturnPlayerButtons && hasPlayed`; reuses the existing `{{LANDING_LEADERBOARD_ROUTE}}` token

  Full file:

  ```tsx
  'use client';

  import { useCapeData } from '@hooks/useCapeData';
  import { useInstanceId } from '@hooks/useInstanceId';
  import { useSafeNavigation } from '@hooks/useSafeNavigation';
  import { getCapeImage, getCapeBoolean, buildCopyResolver, buildImageResolver } from '@utils/getCapeData';
  import { useGameContext } from '@hooks/useGameContext';
  import Button from '@components/_core/Button/Button';

  export default function LandingPage() {
    const navigate     = useSafeNavigation();
    const { capeData } = useCapeData();
    const instanceId   = useInstanceId('landing');
    const { onboardingCompleted, hasPlayed } = useGameContext();

    const t   = buildCopyResolver(capeData, 'landing', instanceId);
    const img = buildImageResolver(capeData, 'landing', instanceId);

    // Static leaderboard button — campaign-manager controlled via CAPE
    const showLeaderboard  = getCapeBoolean(capeData, `settings.pages.${instanceId}.showLeaderboardButton`, false);
    const leaderboardLabel = t('ctaLeaderboard', 'Leaderboard');

    const bgUrl    = img('background')
                  || '/assets/hero-mobile.png';
    const logoUrl  = img('logo')
                  || getCapeImage(capeData, 'general.header.logo')
                  || '/assets/logo-livewall-wordmark.svg';
    const menuIcon = getCapeImage(capeData, 'general.header.menuIcon');
    const headline = t('headline', '[copy.landing.headline]');
    const subline  = t('subline',  '');
    const kicker   = t('kicker',   'Live experience');
    const cta      = t('cta',      '[copy.landing.cta]');

    // Return-player copy — falls back to primary CTA label if not set in CAPE
    const ctaReturning         = t('ctaReturning', cta);
    const leaderboardReturnCta = t('leaderboardCta', 'Leaderboard');

    // Scaffold-time feature gate — toggled in the web wizard
    const showReturnPlayerButtons = '{{RETURN_PLAYER_BUTTONS}}' === 'true';

    // Skip onboarding for returning players
    const handlePlay = () =>
      navigate(onboardingCompleted ? '/gameplay' : '{{NEXT_AFTER_LANDING}}');

    return (
      <div className="campaign-screen campaign-screen--hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={bgUrl} alt="" className="campaign-hero-bleed" aria-hidden />

        <div className="campaign-hero-shade" aria-hidden />

        <div className="campaign-shell">
          <header className="campaign-hero-header campaign-hero-header--with-close" style={{ animation: 'fadeIn 0.4s ease both' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="Logo" className="campaign-hero-logo" />
            <button
              type="button"
              className="campaign-menu-btn"
              aria-label="Menu"
              onClick={() => navigate('/menu')}
            >
              {menuIcon
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={menuIcon} alt="" width={18} height={18} />
                : <HamburgerIcon />
              }
            </button>
          </header>

          <div className="campaign-stack campaign-hero-content" style={{ animation: 'fadeIn 0.5s 0.14s ease both' }}>
            <p className="campaign-kicker">{kicker}</p>
            <h1 className="campaign-title">{headline}</h1>
            {subline && <p className="campaign-copy max-w-[28rem] text-base sm:text-lg">{subline}</p>}
          </div>

          <div className="campaign-actions" style={{ animation: 'fadeIn 0.5s 0.28s ease both' }}>
            <Button className="w-full" size="lg" onClick={handlePlay}>
              {showReturnPlayerButtons && hasPlayed ? ctaReturning : cta}
            </Button>
            {showLeaderboard && (
              <Button variant="secondary" className="w-full" size="lg" onClick={() => navigate('{{LANDING_LEADERBOARD_ROUTE}}')}>
                {leaderboardLabel}
              </Button>
            )}
            {showReturnPlayerButtons && hasPlayed && (
              <Button variant="secondary" className="w-full" size="lg" onClick={() => navigate('{{LANDING_LEADERBOARD_ROUTE}}')}>
                {leaderboardReturnCta}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  function HamburgerIcon() {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <line x1="4" y1="7"  x2="20" y2="7"  />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="17" x2="20" y2="17" />
      </svg>
    );
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  cd base-templates/next && npm run ts-compile
  ```

  Expected: no errors.

- [ ] **Step 3: Manual smoke test**

  Run the dev server in `base-templates/next` (or a freshly scaffolded project):

  ```bash
  npm run dev
  ```

  Verify:
  1. Fresh state (clear localStorage `campaign-state`) → Play button navigates to onboarding.
  2. After completing onboarding → Play button navigates directly to `/gameplay`.
  3. After completing a game (`handleGameEnd` fires) → return to landing: "Play again" label shows if `{{RETURN_PLAYER_BUTTONS}}` is `'true'`; leaderboard button appears.
  4. `{{RETURN_PLAYER_BUTTONS}}` = `'false'` → always shows single "Play" CTA regardless of `hasPlayed`.

- [ ] **Step 4: Commit**

  ```bash
  git add base-templates/next/app/\(campaign\)/landing/page.tsx
  git commit -m "feat(landing): skip onboarding for returning players; add return-player buttons"
  ```

---

## Self-Review

**Spec coverage:**
- ✓ Onboarding skip on repeat play — Task 4 `handlePlay`
- ✓ `hasPlayed` state — Tasks 1–3
- ✓ "Play again" label — Task 4 `ctaReturning`
- ✓ Return leaderboard button — Task 4 conditional button
- ✓ Scaffold-time `{{RETURN_PLAYER_BUTTONS}}` gate — Task 4

**Placeholder scan:** No TBDs. All code blocks are complete. ✓

**Type consistency:**
- `hasPlayed: boolean` defined in Task 1, used identically in Tasks 2, 3, 4 ✓
- `setHasPlayed: (v: boolean) => void` defined in Task 1, implemented in Task 2, called in Task 3 ✓
- `ctaReturning` and `leaderboardReturnCta` defined and used only in Task 4 ✓
