/**
 * cli/page-builder.js
 *
 * Block-driven page generator for the Livewall Campaign Scaffolder.
 *
 * Generates Next.js `app/(campaign)/{page}/page.tsx` files from a render-order
 * block list. CTA wiring, menu items, step count, timer, skip, QR, consent,
 * etc. all come from blocks — there is no element-level catalogue.
 */

const BLOCK_REQUIRED_BY_TYPE = {
  loading: ['background'],
  landing: ['background', 'title-block'],
  tutorial: ['background', 'title-block', 'nav-controls'],
  onboarding: ['background', 'title-block', 'nav-controls'],
  video: ['video-player'],
  game: ['background'],
  result: ['background', 'title-block', 'cta-group'],
  leaderboard: ['background', 'rank-list'],
  register: ['background', 'card-wrapper', 'field-set', 'opt-in-list'],
  voucher: ['background', 'title-block'],
  end: ['background', 'title-block', 'cta-group'],
  menu: ['background', 'menu-item-list'],
};

const DEFAULT_BLOCK_ROUTES = {
  landing: '/landing',
  tutorial: '/tutorial',
  onboarding: '/tutorial',
  loading: '/loading',
  video: '/video',
  'intro-video': '/intro-video',
  'loading-video': '/loading-video',
  'ad-video': '/ad-video',
  register: '/register',
  game: '/gameplay',
  gameplay: '/gameplay',
  result: '/result',
  leaderboard: '/leaderboard',
  voucher: '/voucher',
  end: '/end',
  menu: '/menu',
};

function componentNameOf(blockName) {
  return blockName.split('-').map((s) => s[0].toUpperCase() + s.slice(1)).join('');
}

function normaliseBlockType(pageType) {
  if (['video', 'intro-video', 'loading-video', 'ad-video'].includes(pageType)) return 'video';
  if (pageType === 'tutorial') return 'onboarding';
  if (pageType === 'gameplay') return 'game';
  return pageType;
}

function pageComponentName(pageId, pageType) {
  const base = pageId || pageType || 'Campaign';
  return `${base.split(/[-_]/).map((part) => part[0]?.toUpperCase() + part.slice(1)).join('')}Page`;
}

function nextRouteForPage(pageId, pages = [], routeMap = {}) {
  const index = pages.indexOf(pageId);
  const nextPage = index >= 0 ? pages[index + 1] : null;
  return routeForExit(nextPage ?? 'landing', routeMap);
}

function routeForExit(exit, routeMap = {}) {
  if (!exit) return '/';
  const key = String(exit);
  if (key.startsWith('/')) return key;
  const hyphenKey = key.replace(/_/g, '-');
  const underscoreKey = key.replace(/-/g, '_');
  return routeMap[key] ?? routeMap[hyphenKey] ?? routeMap[underscoreKey] ?? DEFAULT_BLOCK_ROUTES[key] ?? DEFAULT_BLOCK_ROUTES[hyphenKey] ?? `/${hyphenKey}`;
}

function jsString(value) {
  return JSON.stringify(value);
}

function settingsOf(block) {
  return block?.settings ?? {};
}

function defaultFlowRuleMode(type) {
  switch (type) {
    case 'tutorial':
    case 'onboarding':
      return 'once-per-browser';
    case 'register':
      return 'skip-if-registered';
    default:
      return 'always';
  }
}

function flowRuleModeFor(pageId, pageType, flowRules = {}) {
  const rule = flowRules?.[pageId];
  return typeof rule?.mode === 'string' ? rule.mode : defaultFlowRuleMode(pageType);
}

function flowRuleSkipRouteFor(pageId, fallbackExit, ctx = {}) {
  const skipTo = ctx.flowRules?.[pageId]?.skipTo;
  if (skipTo) return routeForExit(skipTo, ctx.routeMap);
  const pages = ctx.pages ?? [];
  const index = pages.indexOf(pageId);
  const next = index >= 0 ? pages[index + 1] : null;
  return routeForExit(next || fallbackExit, ctx.routeMap);
}

function ctaFallbackFor(pageId, index = 0) {
  if (pageId === 'landing') return 'Play now';
  if (pageId === 'register') return 'Register';
  if (pageId === 'leaderboard') return index === 1 ? 'Home' : 'Play again';
  if (pageId === 'result') return 'Continue';
  return 'Continue';
}

function titleFallbackFor(pageId, options = {}) {
  const projectName = options.projectName || 'Livewall';
  if (pageId === 'landing') return `Welcome to ${projectName}`;
  if (pageId === 'loading') return projectName;
  if (pageId === 'result') return 'Your score';
  if (pageId === 'register') return 'Register';
  if (pageId === 'tutorial' || pageId === 'onboarding') return 'How to play';
  if (pageId === 'leaderboard') return 'Leaderboard';
  if (pageId === 'voucher') return 'Your voucher';
  if (pageId === 'end') return 'Thank you';
  return String(pageId || 'Campaign').charAt(0).toUpperCase() + String(pageId || 'Campaign').slice(1);
}

/**
 * Move the block named `target` so it renders immediately after the block named
 * `anchor`. Used when a block exposes a "position relative to another" setting
 * (e.g. step-indicator's below/above relative to nav-controls). No-op if either
 * block is missing or `target` already follows `anchor`.
 */
function reorderAfter(blocks, target, anchor) {
  const targetIdx = blocks.findIndex((b) => b.name === target);
  const anchorIdx = blocks.findIndex((b) => b.name === anchor);
  if (targetIdx < 0 || anchorIdx < 0) return blocks;
  if (targetIdx === anchorIdx + 1) return blocks;
  const without = blocks.filter((_, i) => i !== targetIdx);
  const insertAt = without.findIndex((b) => b.name === anchor) + 1;
  return [...without.slice(0, insertAt), blocks[targetIdx], ...without.slice(insertAt)];
}

/**
 * Mirror of reorderAfter — moves `target` to render immediately *before* `anchor`
 * instead. Used for hero-treatment positioning (e.g. score-illustration above
 * the title on a result page).
 */
function reorderBefore(blocks, target, anchor) {
  const targetIdx = blocks.findIndex((b) => b.name === target);
  const anchorIdx = blocks.findIndex((b) => b.name === anchor);
  if (targetIdx < 0 || anchorIdx < 0) return blocks;
  if (targetIdx === anchorIdx - 1) return blocks;
  const without = blocks.filter((_, i) => i !== targetIdx);
  const insertAt = without.findIndex((b) => b.name === anchor);
  return [...without.slice(0, insertAt), blocks[targetIdx], ...without.slice(insertAt)];
}

function blockArea(block) {
  if (['cta-group', 'nav-controls', 'reveal-cta', 'skip-control'].includes(block.name)) return 'actions';
  if (block.name === 'header-chrome') return 'header';
  return 'content';
}

function pageLayoutOf(pageId, pageType, hasCard) {
  if (['video', 'intro-video', 'loading-video', 'ad-video'].includes(pageId) || pageType === 'video') {
    return { pageClass: 'campaign-block-page--video', shellClass: 'campaign-block-shell--center' };
  }
  if (pageId === 'loading') {
    return { pageClass: 'campaign-screen--hero campaign-block-page--hero', shellClass: 'campaign-block-shell--center' };
  }
  if (hasCard || pageId === 'register') {
    return { pageClass: 'campaign-block-page--card', shellClass: 'campaign-block-shell--card' };
  }
  if (pageId === 'leaderboard' || pageType === 'leaderboard') {
    return { pageClass: 'campaign-screen--hero campaign-block-page--hero campaign-block-page--leaderboard', shellClass: 'campaign-block-shell--hero' };
  }
  return { pageClass: 'campaign-screen--hero campaign-block-page--hero', shellClass: 'campaign-block-shell--hero' };
}

function slotUsesRouter(slot) {
  return ['menu', 'back', 'close', 'help'].includes(slot);
}

function blockUsesRouter(block) {
  const s = settingsOf(block);
  switch (block.name) {
    case 'header-chrome':
      return slotUsesRouter(s.leftSlot) || slotUsesRouter(s.rightSlot);
    case 'cta-group':
    case 'nav-controls':
    case 'skip-control':
    case 'reveal-cta':
      return true;
    case 'video-player':
      return (s.onEnd ?? 'auto-advance') === 'auto-advance';
    default:
      return false;
  }
}

/**
 * Generate a block-driven page component.
 *
 * @param {string} pageId instance id (e.g. "landing", "intro-video")
 * @param {string} pageType type (e.g. "landing", "video")
 * @param {Array<{ name: string, settings: object }>} blocks render-order block list
 * @param {object} options routeMap and other generator options
 * @returns {string}
 */
export function buildBlockDrivenPage(pageId, pageType, blocks, options = {}) {
  const type = normaliseBlockType(pageType || pageId);
  const selectedPages = options.pages ?? [];
  const flowRules = options.flowRules ?? {};
  const hasTutorialPage = selectedPages.includes('tutorial') || Object.keys(options.routeMap ?? {}).includes('tutorial');
  const isTutorialPage = pageId === 'tutorial' || type === 'onboarding';
  const tutorialRuleMode = flowRuleModeFor('tutorial', 'onboarding', flowRules);
  const ctaBlock = blocks.find((b) => b.name === 'cta-group');
  const ctaButtons = settingsOf(ctaBlock).buttons;
  const hasTutorialCta = Array.isArray(ctaButtons)
    && ctaButtons.some((button) => {
      const exit = button?.exit ?? 'game';
      const route = routeForExit(exit, options.routeMap ?? {});
      return exit === 'tutorial' || route === routeForExit('tutorial', options.routeMap ?? {});
    });
  const needsOnboardingGate = tutorialRuleMode === 'once-per-browser' && hasTutorialPage && (isTutorialPage || (pageId === 'landing' && hasTutorialCta));
  const onboardingKey = `lw_onboarding_done_${options.capeId || 'campaign'}`;
  const isRegisterPage = pageId === 'register' || type === 'register';
  const registerRuleMode = flowRuleModeFor(pageId, type, flowRules);
  const needsRegisterGate = isRegisterPage && registerRuleMode === 'skip-if-registered';
  const registeredKey = `lw_registered_${options.capeId || 'campaign'}`;
  const required = BLOCK_REQUIRED_BY_TYPE[pageType] ?? BLOCK_REQUIRED_BY_TYPE[type] ?? [];
  for (const req of required) {
    if (!blocks.find((b) => b.name === req)) {
      throw new Error(`buildBlockDrivenPage(${pageId}): required block missing: ${req}`);
    }
  }

  const uniqueBlockNames = [...new Set(blocks.map((b) => b.name))];
  const importLines = uniqueBlockNames
    .map((name) => `import { ${componentNameOf(name)} } from '@/components/_blocks/${name}/${componentNameOf(name)}';`)
    .join('\n');

  const background = blocks.find((b) => b.name === 'background');
  const card = blocks.find((b) => b.name === 'card-wrapper');
  const innerBlocks = blocks.filter((b) => b.name !== 'background' && b.name !== 'card-wrapper');
  // brand-chip with slot=header rides inside the header-chrome block instead of
  // rendering as a sibling. Requires header-chrome to actually be present; if it
  // isn't, the brand-chip falls back to its standalone (content) placement.
  const brandChipBlock = innerBlocks.find((b) => b.name === 'brand-chip');
  const headerChromeBlock = innerBlocks.find((b) => b.name === 'header-chrome');
  const brandSlot = settingsOf(brandChipBlock).slot;
  const brandInHeader = brandChipBlock && headerChromeBlock && brandSlot === 'header'
    ? brandChipBlock
    : null;
  const renderableBlocks = brandInHeader
    ? innerBlocks.filter((b) => b.name !== 'brand-chip')
    : innerBlocks;
  // step-indicator with position=below swaps with nav-controls so the dots/count
  // render after the buttons. Requires nav-controls to be present; otherwise the
  // setting is a no-op and the indicator stays in its declared position.
  const stepIndicatorBlock = renderableBlocks.find((b) => b.name === 'step-indicator');
  const navControlsBlock = renderableBlocks.find((b) => b.name === 'nav-controls');
  const stepBelow = stepIndicatorBlock && navControlsBlock
    && settingsOf(stepIndicatorBlock).position === 'below';
  let orderedBlocks = stepBelow
    ? reorderAfter(renderableBlocks, 'step-indicator', 'nav-controls')
    : renderableBlocks;
  // score-illustration with position=above-title hoists itself to render
  // immediately before the title-block (hero-style result page). No-op if
  // title-block is absent.
  const scoreIllusBlock = orderedBlocks.find((b) => b.name === 'score-illustration');
  const titleBlock = orderedBlocks.find((b) => b.name === 'title-block');
  if (scoreIllusBlock && titleBlock && settingsOf(scoreIllusBlock).position === 'above-title') {
    orderedBlocks = reorderBefore(orderedBlocks, 'score-illustration', 'title-block');
  }
  // Step-indicator + nav-controls (count > 1) becomes a multi-step flow: NavControls
  // advances the step until the last one, then routes to nextExit.
  const stepFlow = stepIndicatorBlock && navControlsBlock
    && Number(settingsOf(stepIndicatorBlock).count ?? 3) > 1
    ? {
        count: Number(settingsOf(stepIndicatorBlock).count ?? 3),
        nextExit: settingsOf(navControlsBlock).nextExit ?? 'game',
        showPrev: Boolean(settingsOf(navControlsBlock).showPrev),
      }
    : null;
  // Video pages render the video-player full-bleed inside Background's
  // mediaSlot (outside the constrained content shell) so it covers the
  // phone-frame interior.
  const isVideoPage = type === 'video' || ['video', 'intro-video', 'loading-video', 'ad-video'].includes(pageId);
  const videoPlayerBlock = innerBlocks.find((b) => b.name === 'video-player');
  const fullBleedVideoBlock = isVideoPage ? videoPlayerBlock : null;
  const tracksRegistrationStatus = type === 'result' && selectedPages.includes('register');
  const statsTableBlock = innerBlocks.find((b) => b.name === 'stats-table');
  const usesGameScore = type === 'result' && innerBlocks.some((b) => b.name === 'score-readout' || b.name === 'stats-table');
  const loadingIndicatorBlock = innerBlocks.find((b) => b.name === 'loading-indicator');
  const isAutoLoadingPage = pageId === 'loading';
  const autoAdvanceMs = Number(settingsOf(loadingIndicatorBlock).minDisplayMs ?? options.pageSettings?.loading?.minDisplayMs ?? 800);
  const autoAdvanceRoute = nextRouteForPage(pageId, selectedPages, options.routeMap ?? {});
  // wait-for-engine video page (loading-video): boots Unity and advances to the
  // game route the instant the engine is ready — purely content-driven, NO hard
  // timer. On boot success it sets sessionStorage 'unity-started-from-video' so
  // the gameplay page skips a re-boot and starts immediately. On boot FAILURE it
  // surfaces a manual "Continue" button instead of stranding the user (no
  // arbitrary timeout). The looping clip plays throughout.
  const waitForEngineVideoBlock = innerBlocks.find((b) => b.name === 'video-player' && settingsOf(b).onEnd === 'wait-for-engine');
  const isWaitForEngineVideoPage = Boolean(waitForEngineVideoBlock);
  const waitForEngineSettings = settingsOf(waitForEngineVideoBlock);
  // Video interludes (intro/loading/ad video) are LINEAR — they play into the
  // next page in the flow sequence, exactly like the hand-written video module
  // routes ({{NEXT_AFTER_*}}). So auto-advance / skip / reveal / wait-for-engine
  // all target the next page by ORDER, not the block's `exit` hint. This makes
  // intro-video → landing and loading-video → game fall out of the page order.
  const videoSequenceRoute = isVideoPage ? nextRouteForPage(pageId, selectedPages, options.routeMap ?? {}) : null;
  const waitForEngineRoute = videoSequenceRoute ?? routeForExit(waitForEngineSettings.exit ?? 'game', options.routeMap ?? {});

  const ctx = { pageId, pageType: type, routeMap: options.routeMap ?? {}, pages: selectedPages, flowRules, brandInHeader, stepFlow, projectName: options.projectName, needsOnboardingGate, needsRegisterGate, usesGameScore, videoSequenceRoute };
  const visibleOrderedBlocks = fullBleedVideoBlock
    ? orderedBlocks.filter((b) => b !== fullBleedVideoBlock)
    : orderedBlocks;
  const headerChildren = visibleOrderedBlocks.filter((block) => blockArea(block) === 'header').map((block) => renderBlock(block, ctx));
  const contentChildren = visibleOrderedBlocks.filter((block) => blockArea(block) === 'content').map((block) => renderBlock(block, ctx));
  const actionChildren = visibleOrderedBlocks.filter((block) => blockArea(block) === 'actions').map((block) => renderBlock(block, ctx));
  const mediaSlotRender = fullBleedVideoBlock
    ? renderBlock(fullBleedVideoBlock, { ...ctx, fullBleedVideo: true }).trimStart()
    : null;
  const usesRouter = innerBlocks.some(blockUsesRouter) || isAutoLoadingPage || isWaitForEngineVideoPage || Boolean(stepFlow);
  const reactHooks = [...new Set([
    isAutoLoadingPage ? 'useEffect' : null,
    isWaitForEngineVideoPage ? 'useContext' : null,
    isWaitForEngineVideoPage ? 'useEffect' : null,
    isWaitForEngineVideoPage ? 'useRef' : null,
    isWaitForEngineVideoPage ? 'useState' : null,
    isTutorialPage && needsOnboardingGate ? 'useEffect' : null,
    needsRegisterGate ? 'useEffect' : null,
    tracksRegistrationStatus ? 'useEffect' : null,
    tracksRegistrationStatus ? 'useState' : null,
    stepFlow ? 'useState' : null,
  ].filter(Boolean))];
  const tutorialFallbackExit = isTutorialPage
    ? settingsOf(navControlsBlock).nextExit ?? 'game'
    : 'game';
  const tutorialSkipRoute = flowRuleSkipRouteFor('tutorial', tutorialFallbackExit, ctx);
  const registerCtaBlock = innerBlocks.find((b) => b.name === 'cta-group');
  const registerExit = settingsOf(registerCtaBlock).buttons?.[0]?.exit ?? 'voucher';
  const registerSkipRoute = flowRuleSkipRouteFor(pageId, registerExit, ctx);

  // Manual "Continue" affordance for a wait-for-engine page whose boot failed —
  // the only escape (there is no timer). Rendered as an overlay over the clip.
  const waitForEngineOverlay = isWaitForEngineVideoPage
    ? [
      '      {canContinue && (',
      '        <div className="campaign-actions campaign-block-actions">',
      '          <button type="button" className="campaign-video-skip" onClick={() => goToGame(false)}>{cape.skipLabel ?? cape.ctaLabel ?? \'Continue\'}</button>',
      '        </div>',
      '      )}',
    ]
    : [];
  const body = [
    ...headerChildren,
    contentChildren.length ? [
      '      <div className="campaign-stack campaign-hero-content campaign-block-content">',
      ...contentChildren.map((line) => `  ${line}`),
      '      </div>',
    ] : [],
    actionChildren.length ? [
      '      <div className="campaign-actions campaign-block-actions">',
      ...actionChildren.map((line) => `  ${line}`),
      '      </div>',
    ] : [],
    ...waitForEngineOverlay,
  ].flat();
  const content = card
    ? [
      ...headerChildren,
      `      <CardWrapper styleMode="${settingsOf(card).style ?? 'card'}" cardWidth="${settingsOf(card).cardWidth ?? 'with-margin'}">`,
      ...(contentChildren.length ? [
        '        <div className="campaign-stack campaign-hero-content campaign-block-content">',
        ...contentChildren.map((line) => `    ${line}`),
        '        </div>',
      ] : []),
      ...(actionChildren.length ? [
        '        <div className="campaign-actions campaign-block-actions">',
        ...actionChildren.map((line) => `    ${line}`),
        '        </div>',
      ] : []),
      '      </CardWrapper>',
    ]
    : body;

  const layout = pageLayoutOf(pageId, type, Boolean(card));
  const mediaSlotProp = mediaSlotRender ? ` mediaSlot={${mediaSlotRender}}` : '';
  const shadeProp = fullBleedVideoBlock ? ' shade={false}' : '';
  const sourceProp = fullBleedVideoBlock ? '' : ' source={cape.background}';
  const wrapStart = background
    ? `    <Background${sourceProp} className="${layout.pageClass}" shellClassName="${layout.shellClass}"${shadeProp}${mediaSlotProp}>`
    : `    <main className="campaign-block-page ${layout.pageClass} ${layout.shellClass}">`;
  const wrapEnd = background ? '    </Background>' : '    </main>';

  return [
    "'use client';",
    '',
    '// Generated by campaign-scaffolder - do not edit by hand',
    usesRouter ? "import { useRouter } from 'next/navigation';" : null,
    reactHooks.length ? `import { ${reactHooks.join(', ')} } from 'react';` : null,
    "import { useCape } from '@/lib/cape';",
    usesGameScore ? "import { useGameContext } from '@hooks/useGameContext';" : null,
    isWaitForEngineVideoPage ? "import { UnityContext } from '@components/_modules/unity/UnityGame';" : null,
    isWaitForEngineVideoPage ? "import { useCapeData } from '@hooks/useCapeData';" : null,
    isWaitForEngineVideoPage ? "import { buildUnityTranslations } from '@lib/game-bridge/cape-translations';" : null,
    isWaitForEngineVideoPage ? "import { getCapeText } from '@utils/getCapeData';" : null,
    importLines,
    needsOnboardingGate ? `const ONBOARDING_KEY = ${jsString(onboardingKey)};` : null,
    needsOnboardingGate ? "const isOnboardingDone = () =>\n  typeof window !== 'undefined' && window.localStorage.getItem(ONBOARDING_KEY) === '1';" : null,
    isTutorialPage && needsOnboardingGate ? "const markOnboardingDone = () => {\n  try { window.localStorage.setItem(ONBOARDING_KEY, '1'); } catch {}\n};" : null,
    needsRegisterGate || tracksRegistrationStatus ? `const REGISTERED_KEY = ${jsString(registeredKey)};` : null,
    needsRegisterGate || tracksRegistrationStatus ? "const isRegistered = () =>\n  typeof window !== 'undefined' && window.localStorage.getItem(REGISTERED_KEY) === '1';" : null,
    needsRegisterGate ? "const markRegistered = () => {\n  try { window.localStorage.setItem(REGISTERED_KEY, '1'); } catch {}\n};" : null,
    '',
    `export default function ${pageComponentName(pageId, pageType)}() {`,
    `  const cape = useCape(${jsString(pageId)});`,
    usesRouter ? '  const router = useRouter();' : null,
    usesGameScore ? '  const { score, highscore, rank, gameResult } = useGameContext();' : null,
    tracksRegistrationStatus ? '  const [hasRegistered, setHasRegistered] = useState(false);' : null,
    tracksRegistrationStatus ? '  useEffect(() => {\n    setHasRegistered(isRegistered());\n  }, []);' : null,
    stepFlow ? '  const [stepIndex, setStepIndex] = useState(0);' : null,
    isTutorialPage && needsOnboardingGate ? `  useEffect(() => {\n    if (isOnboardingDone()) router.replace(${jsString(tutorialSkipRoute)});\n  }, [router]);` : null,
    isTutorialPage && needsOnboardingGate ? `  const finishTutorial = () => {\n    markOnboardingDone();\n    router.push(${jsString(tutorialSkipRoute)});\n  };` : null,
    needsRegisterGate ? `  useEffect(() => {\n    if (isRegistered()) router.replace(${jsString(registerSkipRoute)});\n  }, [router]);` : null,
    needsRegisterGate ? `  const finishRegister = () => {\n    markRegistered();\n    router.push(${jsString(registerSkipRoute)});\n  };` : null,
    isAutoLoadingPage ? `  useEffect(() => {\n    const timeout = window.setTimeout(() => router.replace(${jsString(autoAdvanceRoute)}), ${autoAdvanceMs});\n    return () => window.clearTimeout(timeout);\n  }, [router]);` : null,
    isWaitForEngineVideoPage ? '  const unity = useContext(UnityContext);' : null,
    isWaitForEngineVideoPage ? '  const { capeData } = useCapeData();' : null,
    isWaitForEngineVideoPage ? '  const booted = useRef(false);' : null,
    isWaitForEngineVideoPage ? '  const navigated = useRef(false);' : null,
    isWaitForEngineVideoPage ? '  const [canContinue, setCanContinue] = useState(false);' : null,
    isWaitForEngineVideoPage ? [
      '  // Advance to the game exactly once. `preloaded` = the scene finished',
      '  // preloading (fullBoot resolved), so gameplay can start instantly via the',
      "  // 'unity-started-from-video' flag; otherwise gameplay re-boots itself.",
      '  const goToGame = (preloaded: boolean) => {',
      '    if (navigated.current) return;',
      '    navigated.current = true;',
      "    if (preloaded) { try { sessionStorage.setItem('unity-started-from-video', 'true'); } catch {} }",
      `    router.replace(${jsString(waitForEngineRoute)});`,
      '  };',
    ].join('\n') : null,
    isWaitForEngineVideoPage ? [
      '  useEffect(() => {',
      '    // Content-driven boot: advance the instant the scene is preloaded. No',
      '    // timer. On a hard boot error, surface a manual Continue button.',
      '    if (!unity || booted.current) return;',
      '    booted.current = true;',
      "    const targetScene = getCapeText(capeData, 'settings.game.sceneKey', '');",
      "    const translations = buildUnityTranslations(capeData, process.env.NEXT_PUBLIC_CAPE_LANGUAGE ?? 'EN');",
      '    unity.setData({ translations });',
      '    if (targetScene) unity.setTargetScene(targetScene);',
      '    void unity.fullBoot()',
      '      .then(() => goToGame(true))',
      '      .catch((error) => {',
      "        console.warn('Unity did not finish booting from loading-video:', error);",
      '        setCanContinue(true);',
      '      });',
      '  }, [unity, capeData, router]);',
    ].join('\n') : null,
    isWaitForEngineVideoPage ? [
      '  useEffect(() => {',
      '    // Content-driven safety net (NOT a timer): once the Unity build is fully',
      '    // downloaded (loadProgress 100), advance even if the scene-ready signal',
      '    // never fires — gameplay finishes the scene boot itself. This guarantees',
      '    // the flow never deadlocks while staying purely load-driven.',
      '    if (unity && unity.loadProgress >= 100) goToGame(false);',
      '  }, [unity, unity?.loadProgress]);',
    ].join('\n') : null,
    '  return (',
    wrapStart,
    ...content,
    wrapEnd,
    '  );',
    '}',
  ].filter(Boolean).join('\n');
}

export function buildBlockDrivenLanding(blocks, options = {}) {
  return buildBlockDrivenPage('landing', 'landing', blocks, options);
}

export function buildBlockDrivenLoading(blocks, options = {}) {
  return buildBlockDrivenPage(options.pageId ?? 'loading', 'loading', blocks, options);
}

export function buildBlockDrivenOnboarding(blocks, options = {}) {
  return buildBlockDrivenPage(options.pageId ?? 'tutorial', 'tutorial', blocks, options);
}

export function buildBlockDrivenVideo(blocks, options = {}) {
  return buildBlockDrivenPage(options.pageId ?? 'video', 'video', blocks, options);
}

export function buildBlockDrivenGame(blocks, options = {}) {
  return buildBlockDrivenPage(options.pageId ?? 'game', 'game', blocks, options);
}

export function buildBlockDrivenResult(blocks, options = {}) {
  return buildBlockDrivenPage(options.pageId ?? 'result', 'result', blocks, options);
}

export function buildBlockDrivenLeaderboard(blocks, options = {}) {
  return buildBlockDrivenPage(options.pageId ?? 'leaderboard', 'leaderboard', blocks, options);
}

export function buildBlockDrivenRegister(blocks, options = {}) {
  return buildBlockDrivenPage(options.pageId ?? 'register', 'register', blocks, options);
}

export function buildBlockDrivenVoucher(blocks, options = {}) {
  return buildBlockDrivenPage(options.pageId ?? 'voucher', 'voucher', blocks, options);
}

export function buildBlockDrivenEnd(blocks, options = {}) {
  return buildBlockDrivenPage(options.pageId ?? 'end', 'end', blocks, options);
}

export function buildBlockDrivenMenu(blocks, options = {}) {
  return buildBlockDrivenPage(options.pageId ?? 'menu', 'menu', blocks, options);
}

function renderBlock(block, ctx) {
  const s = settingsOf(block);
  switch (block.name) {
    case 'header-chrome': {
      const brand = ctx.brandInHeader ? settingsOf(ctx.brandInHeader) : null;
      const centerProp = brand
        ? ` center={<BrandChip image={cape.brandChip?.image ?? cape.logo} size="${brand.size ?? 'md'}" position="${brand.position ?? 'center'}" />}`
        : '';
      return `      <HeaderChrome leftSlot="${s.leftSlot ?? 'none'}" rightSlot="${s.rightSlot ?? 'none'}" onLeftClick={() => ${slotAction(s.leftSlot, s.leftSlotTarget, ctx.routeMap)}} onRightClick={() => ${slotAction(s.rightSlot, s.rightSlotTarget, ctx.routeMap)}}${centerProp} />`;
    }
    case 'brand-chip':
      return `      <BrandChip image={cape.brandChip?.image ?? cape.logo} size="${s.size ?? 'md'}" position="${s.position ?? 'center'}" />`;
    case 'title-block': {
      const fallbackTitle = jsString(titleFallbackFor(ctx.pageId, ctx));
      const titleExpr = ctx.pageId === 'leaderboard'
        ? `(cape.title && cape.title !== 'Title' ? cape.title : ${fallbackTitle})`
        : `cape.title || ${fallbackTitle}`;
      const subtitleExpr = s.showSubtitle
        ? ` subtitle={String(cape.subtitle || cape.description || cape.subline || "")}`
        : '';
      const kickerProp = s.showKicker ? ` kicker={String(cape.kicker ?? '')}` : '';
      return `      <TitleBlock${kickerProp} title={String(${titleExpr})}${subtitleExpr} />`;
    }
    case 'body-copy':
      return '      <BodyCopy text={String(cape.body ?? cape.subline ?? "")} />';
    case 'cta-group':
      return `      <CtaGroup buttons={${renderCtaButtons(s, ctx)}} />`;
    case 'footer-link-list':
      return '      <FooterLinkList links={cape.footerLinks ?? []} />';
    case 'centered-art':
      return `      <CenteredArt image={cape.art?.url ?? cape.art} size="${s.size ?? 'md'}" />`;
    case 'tagline':
      return '      <Tagline text={String(cape.tagline ?? "")} />';
    case 'loading-indicator':
      return `      <LoadingIndicator kind="${s.kind ?? 'ring'}" label={String(cape.loadingLabel ?? 'Loading')} />`;
    case 'prize-illustration':
      return '      <PrizeIllustration image={cape.prizeImage?.url ?? cape.prizeImage} />';
    case 'code-box':
      return "      <CodeBox code={cape.code ?? ''} label={String(cape.codeLabel ?? 'Code')} copiedLabel={String(cape.codeCopiedConfirmation ?? 'Copied')} />";
    case 'qr-display':
      return "      <QrDisplay value={cape.qrValue ?? cape.code ?? ''} instructions={cape.qrInstructions} />";
    case 'channel-tabs':
      return `      <ChannelTabs tabs={${jsString(s.tabs ?? ['webshop', 'in-store'])}} defaultTab="${s.defaultTab ?? 'webshop'}" />`;
    case 'score-readout':
      return ctx.usesGameScore
        ? `      <ScoreReadout score={score ?? cape.score ?? 0} label={String(cape.scoreLabel ?? 'Score')} highScore={highscore || cape.highScore} showHighScore={${Boolean(s.showHighScore)}} />`
        : `      <ScoreReadout score={cape.score ?? 0} label={String(cape.scoreLabel ?? 'Score')} highScore={cape.highScore} showHighScore={${Boolean(s.showHighScore)}} />`;
    case 'score-illustration':
      return '      <ScoreIllustration image={cape.scoreImage?.url ?? cape.scoreImage} />';
    case 'stats-table': {
      // Build rows from the block config. Each row's `value` is a key resolved
      // at runtime against the game result: score/highScore/rank come from
      // GameContext; game-specific keys (distance, tokens, time, …) come from the
      // stored gameResult, falling back to a CAPE-provided value. Labels are
      // CAPE-overridable via `<value>Label`.
      const rowsLiteral = (Array.isArray(s.rows) ? s.rows : [])
        .map((r) => {
          const key = String(r.value ?? '');
          const valueExpr = key === 'score' ? 'score ?? 0'
            : (key === 'highScore' || key === 'highscore') ? 'highscore ?? 0'
            : key === 'rank' ? "rank ?? '—'"
            : `gameResult?.[${jsString(key)}] ?? cape[${jsString(key)}] ?? '—'`;
          const labelExpr = `String(cape[${jsString(`${key}Label`)}] ?? ${jsString(String(r.label ?? key))})`;
          return `{ label: ${labelExpr}, value: ${valueExpr} }`;
        })
        .join(', ');
      return `      <StatsTable rows={[${rowsLiteral}]} count={${Number(s.count ?? 3)}} />`;
    }
    case 'status-chip':
      return `      <StatusChip label={String(cape.statusLabel ?? '')} kind="${s.kind ?? 'registered'}" />`;
    case 'compliance-badge':
      return `      <ComplianceBadge label={String(cape.complianceLabel ?? '')} kind="${s.kind ?? '18+'}" />`;
    case 'rank-list':
      return `      <RankList rows={(cape.rankings ?? []).slice(0, ${Number(s.rows ?? 10)})} emptyLabel={String(cape.emptyState ?? 'No scores yet.')} />`;
    case 'leaderboard-tabs':
      return `      <LeaderboardTabs tabs={${jsString(s.tabs ?? ['all', 'daily', 'weekly'])}} defaultTab="${s.defaultTab ?? 'all'}" />`;
    case 'personal-best-row':
      return "      <PersonalBestRow label={String(cape.youLabel ?? 'You')} rank={cape.personalRank} score={cape.personalBest} />";
    case 'top-n-highlight':
      return `      <TopNHighlight label={String(cape.topNLabel ?? '')} count={${Number(s.count ?? 3)}} />`;
    case 'step-indicator': {
      const current = ctx.stepFlow ? ' current={stepIndex}' : '';
      return `      <StepIndicator count={${Number(s.count ?? 3)}}${current} style="${s.style ?? 'dots'}" />`;
    }
    case 'nav-controls': {
      if (ctx.stepFlow) {
        const lastIndex = ctx.stepFlow.count - 1;
        const lastRoute = jsString(routeForExit(ctx.stepFlow.nextExit, ctx.routeMap));
        const isLast = `stepIndex >= ${lastIndex}`;
        const showPrev = ctx.stepFlow.showPrev ? 'stepIndex > 0' : 'false';
        const finish = ctx.needsOnboardingGate && (ctx.pageId === 'tutorial' || ctx.pageType === 'onboarding')
          ? 'finishTutorial()'
          : `router.push(${lastRoute})`;
        return `      <NavControls showPrev={${showPrev}} nextLabel={String(${isLast} ? (cape.lastLabel ?? 'Start') : (cape.nextLabel ?? 'Continue'))} onPrev={() => setStepIndex((i) => Math.max(0, i - 1))} onNext={() => ${isLast} ? ${finish} : setStepIndex((i) => i + 1)} />`;
      }
      const route = jsString(routeForExit(s.nextExit ?? 'game', ctx.routeMap));
      const finish = ctx.needsOnboardingGate && (ctx.pageId === 'tutorial' || ctx.pageType === 'onboarding')
        ? 'finishTutorial()'
        : `router.push(${route})`;
      return `      <NavControls showPrev={${Boolean(s.showPrev)}} nextLabel={String(cape.nextLabel ?? 'Continue')} onNext={() => ${finish}} />`;
    }
    case 'field-set':
      return `      <FieldSet fields={${jsString(s.fields ?? ['firstName', 'lastName', 'email'])}} />`;
    case 'opt-in-list':
      return `      <OptInList optIns={${jsString(s.optIns ?? ['terms'])}} required={${s.required !== false}} />`;
    case 'video-player': {
      // All video interludes fall back to the SAME bundled Livewall clip when
      // CAPE has no campaign-specific video — so the intro video and the
      // pre-game loading video are the same clip by default (matching the
      // intended flow), and no video page ever shows a blank frame.
      const fallbackSrc = " ?? '/assets/livewall-loading.mp4'";
      const bleedProp = ctx.fullBleedVideo ? ' fullBleed={true}' : '';
      const videoTarget = ctx.videoSequenceRoute ?? routeForExit(s.exit ?? 'game', ctx.routeMap);
      return (s.onEnd ?? 'auto-advance') === 'auto-advance'
        ? `      <VideoPlayer src={cape.video?.url ?? cape.video${fallbackSrc}} muted={${s.muted !== false}} loop={${Boolean(s.loop)}}${bleedProp} onEnded={() => router.push(${jsString(videoTarget)})} />`
        : `      <VideoPlayer src={cape.video?.url ?? cape.video${fallbackSrc}} muted={${s.muted !== false}} loop={${Boolean(s.loop)}}${bleedProp} />`;
    }
    case 'skip-control':
      return `      <SkipControl label={String(cape.skipLabel ?? 'Skip')} availableAfterMs={${Number(s.availableAfterMs ?? 0)}} onSkip={() => router.push(${jsString(ctx.videoSequenceRoute ?? routeForExit(s.exit ?? 'game', ctx.routeMap))})} />`;
    case 'reveal-cta':
      return `      <RevealCta label={String(cape.ctaLabel ?? 'Continue')} variant="${s.variant ?? 'primary'}" onClick={() => router.push(${jsString(ctx.videoSequenceRoute ?? routeForExit(s.exit ?? 'game', ctx.routeMap))})} />`;
    case 'fallback-indicator':
      return "      <FallbackIndicator label={String(cape.fallbackLabel ?? 'Loading')} />";
    case 'audio-toggle':
      return '      <AudioToggle />';
    case 'pause-toggle':
      return '      <PauseToggle />';
    case 'pause-overlay':
      return '      <PauseOverlay title={cape.pauseTitle} />';
    case 'timer':
      return `      <Timer mode="${s.mode ?? 'countdown'}" durationSec={${Number(s.durationSec ?? 60)}} />`;
    case 'sponsor-footer-strip':
      return '      <SponsorFooterStrip text={cape.sponsorText} logo={cape.sponsorLogo?.url ?? cape.sponsorLogo} />';
    case 'menu-item-list': {
      const targets = s.targets && Object.keys(s.targets).length
        ? ` targets={${JSON.stringify(s.targets)}}`
        : '';
      return `      <MenuItemList items={cape.items ?? undefined}${targets} />`;
    }
    case 'pre-gate-modal':
      return `      <PreGateModal kind="${s.kind ?? 'age-18'}" title={String(cape.preGateTitle ?? '')} confirmLabel={String(cape.preGateConfirm ?? 'Continue')} persistAcrossSession={${s.persistAcrossSession !== false}} />`;
    default:
      return `      <${componentNameOf(block.name)} />`;
  }
}

const SLOT_DEFAULT_ROUTES = { menu: '/menu', close: '/', help: '/tutorial' };

function slotAction(slot, customTarget, routeMap) {
  if (slot === 'back') return 'router.back()';
  if (!['menu', 'help', 'close'].includes(slot)) return 'undefined';
  const route = customTarget
    ? routeForExit(customTarget, routeMap)
    : SLOT_DEFAULT_ROUTES[slot];
  return `router.push(${jsString(route)})`;
}

function renderCtaButtons(settings, ctx = {}) {
  // The button list is the source of truth (count is derived from its length).
  // Legacy `count`, if present, only caps the list. Clamp to the manifest's 1–4.
  const list = Array.isArray(settings.buttons) && settings.buttons.length
    ? settings.buttons
    : [{ variant: 'primary', exit: 'game' }];
  const cap = Math.min(4, settings.count ? Number(settings.count) : list.length);
  const entries = list.slice(0, Math.max(1, cap)).map((b, i) => {
    const exit = b.exit ?? 'game';
    const route = routeForExit(exit, ctx.routeMap);
    const isTutorialTarget = exit === 'tutorial' || route === routeForExit('tutorial', ctx.routeMap);
    const tutorialSkipRoute = flowRuleSkipRouteFor('tutorial', 'game', ctx);
    const onClick = ctx.needsRegisterGate && ctx.pageId === 'register' && i === 0
      ? 'finishRegister()'
      : ctx.needsOnboardingGate && ctx.pageId === 'landing' && isTutorialTarget
      ? `router.push(isOnboardingDone() ? ${jsString(tutorialSkipRoute)} : ${jsString(route)})`
      : `router.push(${jsString(route)})`;
    return `{ label: cape.cta?.[${i}]?.label || cape.ctaLabel || ${jsString(ctaFallbackFor(ctx.pageId ?? '', i))}, variant: '${b.variant ?? 'primary'}', onClick: () => ${onClick} }`;
  });

  if (ctx.pageType === 'result' && (ctx.pages ?? []).includes('register')) {
    const registeredButtons = Array.isArray(settings.registeredButtons) ? settings.registeredButtons : null;
    return `hasRegistered ? ${renderRegisteredResultButtons(registeredButtons, list, ctx)} : [${entries.join(', ')}]`;
  }

  return `[${entries.join(', ')}]`;
}

function renderRegisteredResultButtons(configuredButtons, fallbackButtons, ctx = {}) {
  const pages = ctx.pages ?? [];
  const routeMap = ctx.routeMap ?? {};
  const out = [];
  const seen = new Set();
  const add = (exit, labelExpr, variant = 'secondary') => {
    if (!exit || seen.has(exit)) return;
    seen.add(exit);
    const route = routeForExit(exit, routeMap);
    out.push(`{ label: ${labelExpr}, variant: '${variant}', onClick: () => router.push(${jsString(route)}) }`);
  };

  const configured = Array.isArray(configuredButtons) ? configuredButtons : null;
  const source = configured ?? fallbackButtons;
  for (const [index, button] of (source ?? []).entries()) {
    const exit = String(button?.exit ?? '');
    if (!exit || exit === 'register') continue;
    const fallbackLabel = exit === 'game' || exit === 'gameplay'
      ? 'Play again'
      : exit === 'leaderboard'
        ? 'Leaderboard'
        : exit === 'landing'
          ? 'Home'
          : ctaFallbackFor(ctx.pageId ?? '', out.length);
    const labelExpr = `cape.registeredCta?.[${index}]?.label || cape.registeredCta?.[${index}] || ${jsString(fallbackLabel)}`;
    add(exit, labelExpr, button?.variant ?? 'secondary');
  }

  if (!configured) {
    if (pages.includes('landing')) add('landing', jsString('Home'), 'secondary');
    if (pages.includes('leaderboard')) add('leaderboard', jsString('Leaderboard'), 'tertiary');
    if (pages.includes('game')) add('game', jsString('Play again'), 'primary');
  }

  return `[${out.join(', ')}]`;
}
