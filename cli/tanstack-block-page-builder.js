// Block-driven page+loader emitter for the TanStack stack.
// Parallel to cli/page-builder.js but emits @tanstack/react-router routes.
import { listBlocks } from './block-resolver.js';
import { parseCapeBindings } from './cape-bindings-parser.js';

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
  game: '/game',
  gameplay: '/game',
  result: '/result',
  leaderboard: '/leaderboard',
  voucher: '/voucher',
  end: '/end',
  menu: '/menu',
};

function componentNameOf(blockName) {
  return blockName.split('-').map((s) => s[0].toUpperCase() + s.slice(1)).join('');
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function camelize(s) {
  return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function pageComponentName(pageId, pageType) {
  const base = pageId || pageType || 'Campaign';
  return `${base.split(/[-_]/).map((part) => part[0]?.toUpperCase() + part.slice(1)).join('')}Page`;
}

function loaderBaseName(pageId) {
  return capitalize(camelize(pageId));
}

function loaderName(pageId) {
  return `load${loaderBaseName(pageId)}Data`;
}

function capeRuntimeKey(binding) {
  const leaf = String(binding.path ?? '').split('.').filter(Boolean).pop();
  if (leaf) return leaf;
  if (binding.key === 'source') return 'background';
  if (binding.key === 'src') return 'video';
  if (binding.key === 'labels') return 'cta';
  if (binding.key === 'image') return 'logo';
  return binding.key;
}

function normaliseBlockType(pageType) {
  if (['video', 'intro-video', 'loading-video', 'ad-video'].includes(pageType)) return 'video';
  if (pageType === 'tutorial') return 'onboarding';
  if (pageType === 'gameplay') return 'game';
  return pageType;
}

function routeForExit(exit, routeMap = {}) {
  if (!exit) return '/';
  const key = String(exit);
  if (key.startsWith('/')) return key;
  const hyphenKey = key.replace(/_/g, '-');
  const underscoreKey = key.replace(/-/g, '_');
  return routeMap[key] ?? routeMap[hyphenKey] ?? routeMap[underscoreKey] ?? DEFAULT_BLOCK_ROUTES[key] ?? DEFAULT_BLOCK_ROUTES[hyphenKey] ?? `/${hyphenKey}`;
}

function routeForMenuTarget(target, ctx = {}) {
  const pages = new Set(ctx.pages ?? []);
  const routeMap = ctx.routeMap ?? {};
  if (!target) return '#';
  if (String(target).startsWith('/') || String(target).startsWith('#')) return target;
  const pageId = String(target).replace(/_/g, '-');
  if (!pages.size || pages.has(pageId)) return routeForExit(pageId, routeMap);
  return '#';
}

function routeForPlayableExit(exit, ctx = {}) {
  const pageId = ctx.pageId;
  const pages = ctx.pages ?? [];
  const routeMap = ctx.routeMap ?? {};
  const normalizedExit = String(exit ?? 'game').replace(/_/g, '-');
  const shouldUseLoadingVideo = pageId !== 'loading-video'
    && pages.includes('loading-video')
    && (normalizedExit === 'game' || normalizedExit === 'gameplay');
  if (shouldUseLoadingVideo) return routeForExit('loading-video', routeMap);
  // Gate on whether the target page was generated. A block default may point at
  // an optional page this campaign didn't select (e.g. result → register) —
  // without gating that CTA 404s. Fall back to the next page in sequence.
  const isPlayable = normalizedExit === 'game' || normalizedExit === 'gameplay';
  // Only gate when a real flow is known. With no page list (unit calls) assume valid.
  if (pages.length && !isPlayable && !pages.includes(normalizedExit)) {
    return nextRouteForPage(pageId, pages, routeMap);
  }
  return routeForExit(normalizedExit, routeMap);
}

function menuTargetsFor(settings = {}, ctx = {}) {
  const fallback = {
    home: 'landing',
    resume: 'game',
    howToPlay: 'tutorial',
    leaderboard: 'leaderboard',
    voucher: 'voucher',
    terms: '#',
    privacy: '#',
    faq: '#',
    leave: '#',
  };
  const merged = { ...fallback, ...(settings.targets ?? {}) };
  return Object.fromEntries(
    Object.entries(merged).map(([key, target]) => [key, routeForMenuTarget(target, ctx)]),
  );
}

function nextRouteForPage(pageId, pages = [], routeMap = {}) {
  const index = pages.indexOf(pageId);
  const nextPage = index >= 0 ? pages[index + 1] : null;
  return routeForExit(nextPage ?? 'landing', routeMap);
}

function jsString(value) {
  return JSON.stringify(value);
}

function settingsOf(block) {
  return block?.settings ?? {};
}

function tutorialStepCount(blocks = []) {
  const stepIndicator = blocks.find((b) => b.name === 'step-indicator');
  const rawCount = Number(settingsOf(stepIndicator).count ?? 3);
  if (!Number.isFinite(rawCount)) return 3;
  return Math.min(6, Math.max(1, Math.floor(rawCount)));
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

function titleFallbackFor(pageId, options = {}) {
  const projectName = options.projectName || 'Livewall';
  if (pageId === 'landing') return `Welcome to ${projectName}`;
  if (pageId === 'loading') return projectName;
  if (pageId === 'result') return 'Your score';
  if (pageId === 'register') return 'Register';
  if (pageId === 'tutorial') return 'How to play';
  if (pageId === 'leaderboard') return 'Leaderboard';
  if (pageId === 'voucher') return 'Your voucher';
  if (pageId === 'end') return 'Thank you';
  return pageId.charAt(0).toUpperCase() + pageId.slice(1);
}

function ctaFallbackFor(pageId, index = 0) {
  if (pageId === 'landing') return 'Play now';
  if (pageId === 'register') return 'Register';
  if (pageId === 'leaderboard') return index === 1 ? 'Home' : 'Play again';
  if (pageId === 'result') return 'Continue';
  return 'Continue';
}

function blockArea(block) {
  if (['cta-group', 'nav-controls', 'reveal-cta', 'skip-control'].includes(block.name)) return 'actions';
  if (block.name === 'header-chrome') return 'header';
  return 'content';
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

function reorderAfter(blocks, target, anchor) {
  const targetIdx = blocks.findIndex((b) => b.name === target);
  const anchorIdx = blocks.findIndex((b) => b.name === anchor);
  if (targetIdx < 0 || anchorIdx < 0 || targetIdx === anchorIdx + 1) return blocks;
  const without = blocks.filter((_, i) => i !== targetIdx);
  const insertAt = without.findIndex((b) => b.name === anchor) + 1;
  return [...without.slice(0, insertAt), blocks[targetIdx], ...without.slice(insertAt)];
}

function reorderBefore(blocks, target, anchor) {
  const targetIdx = blocks.findIndex((b) => b.name === target);
  const anchorIdx = blocks.findIndex((b) => b.name === anchor);
  if (targetIdx < 0 || anchorIdx < 0 || targetIdx === anchorIdx - 1) return blocks;
  const without = blocks.filter((_, i) => i !== targetIdx);
  const insertAt = without.findIndex((b) => b.name === anchor);
  return [...without.slice(0, insertAt), blocks[targetIdx], ...without.slice(insertAt)];
}

export function buildTsBlockDrivenPage(pageId, pageType, blocks, options = {}) {
  const type = normaliseBlockType(pageType || pageId);
  const route = routeForExit(pageId, options.routeMap ?? {});
  const uniqueBlockNames = [...new Set(blocks.map((b) => b.name))];
  const importLines = uniqueBlockNames
    .map((name) => `import { ${componentNameOf(name)} } from '~/components/_blocks/${name}/${componentNameOf(name)}';`)
    .join('\n');

  const background = blocks.find((b) => b.name === 'background');
  const card = blocks.find((b) => b.name === 'card-wrapper');
  const innerBlocks = blocks.filter((b) => b.name !== 'background' && b.name !== 'card-wrapper');
  const brandChipBlock = innerBlocks.find((b) => b.name === 'brand-chip');
  const headerChromeBlock = innerBlocks.find((b) => b.name === 'header-chrome');
  const brandSlot = settingsOf(brandChipBlock).slot;
  const brandInHeader = brandChipBlock && headerChromeBlock && brandSlot === 'header'
    ? brandChipBlock
    : null;
  const renderableBlocks = brandInHeader
    ? innerBlocks.filter((b) => b.name !== 'brand-chip')
    : innerBlocks;
  const stepIndicatorBlock = renderableBlocks.find((b) => b.name === 'step-indicator');
  const navControlsBlock = renderableBlocks.find((b) => b.name === 'nav-controls');
  let orderedBlocks = stepIndicatorBlock && navControlsBlock && settingsOf(stepIndicatorBlock).position === 'below'
    ? reorderAfter(renderableBlocks, 'step-indicator', 'nav-controls')
    : renderableBlocks;
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
  // mediaSlot (outside the 480px content shell) so it fills the phone-frame
  // interior. Detected here so renderBlock can emit the bleed variant and
  // the block is excluded from the regular content stack.
  const isVideoPage = type === 'video' || ['video', 'intro-video', 'loading-video', 'ad-video'].includes(pageId);
  const videoPlayerBlock = innerBlocks.find((b) => b.name === 'video-player');
  const fullBleedVideoBlock = isVideoPage ? videoPlayerBlock : null;
  // Video interludes are LINEAR — they play into the next page in the flow
  // sequence (matching the module routes' {{NEXT_AFTER_*}}). auto-advance / skip
  // / reveal target the next page by ORDER, not the block's `exit` hint.
  const videoSequenceRoute = isVideoPage ? nextRouteForPage(pageId, options.pages ?? [], options.routeMap ?? {}) : null;

  const ctx = { pageId, pageType: type, routeMap: options.routeMap ?? {}, pages: options.pages ?? [], brandInHeader, projectName: options.projectName, stepFlow, videoSequenceRoute, introVideo: pageId === 'intro-video' };
  const visibleOrderedBlocks = fullBleedVideoBlock
    ? orderedBlocks.filter((b) => b !== fullBleedVideoBlock)
    : orderedBlocks;
  const headerChildren = visibleOrderedBlocks.filter((block) => blockArea(block) === 'header').map((block) => renderBlock(block, ctx));
  const contentChildren = visibleOrderedBlocks.filter((block) => blockArea(block) === 'content').map((block) => renderBlock(block, ctx));
  const actionChildren = visibleOrderedBlocks.filter((block) => blockArea(block) === 'actions').map((block) => renderBlock(block, ctx));
  const mediaSlotRender = fullBleedVideoBlock
    ? renderBlock(fullBleedVideoBlock, { ...ctx, fullBleedVideo: true }).trimStart()
    : null;
  const loadingIndicatorBlock = innerBlocks.find((b) => b.name === 'loading-indicator');
  const isAutoLoadingPage = pageId === 'loading';
  const autoAdvanceMs = Number(settingsOf(loadingIndicatorBlock).minDisplayMs ?? options.pageSettings?.loading?.minDisplayMs ?? 800);
  const autoAdvanceRoute = nextRouteForPage(pageId, options.pages ?? [], options.routeMap ?? {});
  const waitForEngineVideoBlock = innerBlocks.find((b) => b.name === 'video-player' && settingsOf(b).onEnd === 'wait-for-engine');
  const isWaitForEngineVideoPage = Boolean(waitForEngineVideoBlock);
  // Entry loading video: TanStack downloads all Unity assets at page start
  // (index.tsx preloads), so the intro waits for that download — advance to
  // landing when loadProgress hits 100. Content-driven, no timer; the clip loops.
  const isIntroVideoPage = pageId === 'intro-video' && Boolean(innerBlocks.find((b) => b.name === 'video-player'));
  const introVideoRoute = videoSequenceRoute ?? routeForExit('landing', options.routeMap ?? {});
  const usesUnityResult = type === 'result' && innerBlocks.some((b) => b.name === 'score-readout' || b.name === 'stats-table');
  const usesRegistrationState = (pageId === 'register' || type === 'result') && (options.pages ?? []).includes('register');
  const tracksRegistrationStatus = type === 'result' && (options.pages ?? []).includes('register');
  const registerCtaBlock = innerBlocks.find((b) => b.name === 'cta-group');
  const registerNextRoute = pageId === 'register'
    ? routeForExit(settingsOf(registerCtaBlock).buttons?.[0]?.exit ?? 'result', options.routeMap ?? {})
    : null;
  const waitForEngineSettings = settingsOf(waitForEngineVideoBlock);
  const waitForEngineRoute = videoSequenceRoute ?? routeForExit(settingsOf(waitForEngineVideoBlock).exit ?? 'game', options.routeMap ?? {});
  const usesRouter = innerBlocks.some(blockUsesRouter) || isAutoLoadingPage || isWaitForEngineVideoPage || isIntroVideoPage || Boolean(stepFlow);
  const reactImports = [...new Set([
    (isAutoLoadingPage || isWaitForEngineVideoPage || isIntroVideoPage || usesRegistrationState) && 'useEffect',
    isWaitForEngineVideoPage && 'useState',
    (isWaitForEngineVideoPage || isIntroVideoPage) && 'useRef',
    tracksRegistrationStatus && 'useState',
    stepFlow && 'useState',
  ].filter(Boolean))];
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
    // Manual "Continue" affordance for a wait-for-engine page whose boot failed —
    // the only escape (there is no timer). Rendered as an overlay over the clip.
    ...(isWaitForEngineVideoPage ? [
      '      {canContinue && (',
      '        <div className="campaign-actions campaign-block-actions">',
      '          <button type="button" className="campaign-video-skip" onClick={() => goToGame()}>{cape.skipLabel ?? cape.ctaLabel ?? \'Continue\'}</button>',
      '        </div>',
      '      )}',
    ] : []),
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
  const backgroundSourceExpr = stepFlow
    ? `(currentStep.image ? { kind: 'image' as const, url: currentStep.image } : cape.background)`
    : 'cape.background';
  const mediaSlotProp = mediaSlotRender ? ` mediaSlot={${mediaSlotRender}}` : '';
  // Full-bleed video pages (loading-video / intro-video) shouldn't dim the
  // video with the default gradient overlay — turn off the shade so the
  // Livewall loading loop reads clearly inside the phone-frame.
  const shadeProp = fullBleedVideoBlock ? ' shade={false}' : '';
  // When a full-bleed VideoPlayer IS the visual, omit the Background source
  // so it defaults to solid black — otherwise Background renders its own
  // background video underneath, competing with the mediaSlot video.
  const sourceProp = fullBleedVideoBlock ? '' : ` source={${backgroundSourceExpr}}`;
  const wrapStart = background
    ? `    <Background${sourceProp} className="${layout.pageClass}" shellClassName="${layout.shellClass}"${shadeProp}${mediaSlotProp}>`
    : `    <main className="campaign-block-page ${layout.pageClass} ${layout.shellClass}">`;
  const wrapEnd = background ? '    </Background>' : '    </main>';

  return [
    '// Generated by campaign-scaffolder - do not edit by hand',
    `import { createFileRoute${isWaitForEngineVideoPage ? ', useLoaderData' : ''}${usesRouter ? ', useRouter' : ''} } from '@tanstack/react-router';`,
    reactImports.length ? `import { ${reactImports.join(', ')} } from 'react';` : null,
    `import { ${loaderName(pageId)} } from '~/loaders/${loaderBaseName(pageId)}Loader.ts';`,
    importLines,
    (isWaitForEngineVideoPage || isIntroVideoPage) ? "import { useUnity } from '~/components/game/UnityContext.tsx';" : null,
    usesUnityResult ? "import { useUnityStore } from '~/hooks/stores/useUnityStore.ts';" : null,
    '',
    usesRegistrationState ? `const REGISTERED_KEY = ${jsString(`lw_registered_${options.capeId ?? options.projectName ?? 'campaign'}`)};` : null,
    usesRegistrationState ? "const isRegistered = () => typeof window !== 'undefined' && window.localStorage.getItem(REGISTERED_KEY) === '1';" : null,
    pageId === 'register' && usesRegistrationState ? "const markRegistered = () => { try { window.localStorage.setItem(REGISTERED_KEY, '1'); } catch { /* private mode */ } };" : null,
    usesRegistrationState ? '' : null,
    `export const Route = createFileRoute(${jsString(route)})({`,
    `  component: ${pageComponentName(pageId, pageType)},`,
    `  loader: async ({ context }) => await ${loaderName(pageId)}(context.language),`,
    '});',
    '',
    `function ${pageComponentName(pageId, pageType)}() {`,
    isWaitForEngineVideoPage ? "  const { copy: sharedCopy, sceneKey } = useLoaderData({ from: '__root__' });" : null,
    '  const data = Route.useLoaderData();',
    '  const cape = data.cape as Record<string, any>;',
    usesRouter ? '  const router = useRouter();' : null,
    usesUnityResult ? '  const result = useUnityStore((state) => state.result);' : null,
    usesUnityResult ? '  const currentScore = result.score ?? cape.score ?? 0;' : null,
    usesUnityResult ? '  const currentHighScore = result.highScore ?? cape.highScore ?? cape.score ?? 0;' : null,
    tracksRegistrationStatus ? '  const [hasRegistered, setHasRegistered] = useState(false);' : null,
    stepFlow ? '  const [stepIndex, setStepIndex] = useState(0);' : null,
    stepFlow ? '  const rawSteps = ((data as Record<string, any>).steps as Array<{ title?: string | null; description?: string | null; image?: string | null }>) ?? [];' : null,
    stepFlow ? '  const filledSteps = rawSteps.filter((s) => (s?.title || s?.description || s?.image));' : null,
    stepFlow ? '  const visibleSteps = filledSteps.length ? filledSteps : rawSteps;' : null,
    stepFlow ? '  const totalSteps = Math.max(1, visibleSteps.length);' : null,
    stepFlow ? '  const safeStepIndex = Math.min(stepIndex, totalSteps - 1);' : null,
    stepFlow ? '  const currentStep = visibleSteps[safeStepIndex] ?? {};' : null,
    stepFlow ? '  const isLastStep = safeStepIndex >= totalSteps - 1;' : null,
    isWaitForEngineVideoPage ? '  const { setData, setTargetScene, fullBoot, loadProgress } = useUnity();' : null,
    isWaitForEngineVideoPage ? '  const booted = useRef(false);' : null,
    isWaitForEngineVideoPage ? '  const navigated = useRef(false);' : null,
    isWaitForEngineVideoPage ? '  const [canContinue, setCanContinue] = useState(false);' : null,
    isWaitForEngineVideoPage ? [
      '  // Advance to the game exactly once, AFTER the scene finished preloading',
      "  // (fullBoot resolved). Set the 'unity-started-from-video' flag so the game",
      '  // route skips its own boot/loader — loading-video is the single loader.',
      '  const goToGame = () => {',
      '    if (navigated.current) return;',
      '    navigated.current = true;',
      "    try { sessionStorage.setItem('unity-started-from-video', 'true'); } catch {}",
      `    void router.navigate({ to: ${jsString(waitForEngineRoute)} as never, replace: true });`,
      '  };',
    ].join('\n') : null,
    isAutoLoadingPage ? [
      '  useEffect(() => {',
      `    const timeout = window.setTimeout(() => void router.navigate({ to: ${jsString(autoAdvanceRoute)} as never, replace: true }), ${autoAdvanceMs});`,
      '    return () => window.clearTimeout(timeout);',
      '  }, [router]);',
    ].join('\n') : null,
    usesRegistrationState ? [
      '  useEffect(() => {',
      '    const registered = isRegistered();',
      tracksRegistrationStatus ? '    setHasRegistered(registered);' : null,
      pageId === 'register'
        ? `    if (registered) void router.navigate({ to: ${jsString(registerNextRoute)} as never, replace: true });`
        : null,
      '  }, [router]);',
    ].filter(Boolean).join('\n') : null,
    isWaitForEngineVideoPage ? [
      '  useEffect(() => {',
      '    // loading-video is the SINGLE loading screen: fully boot Unity here so',
      '    // the game route can start instantly without a second loader. No timer —',
      '    // on a hard boot error, surface a manual Continue button (the only escape).',
      '    if (booted.current) return;',
      '    booted.current = true;',
      '    setData({ translations: sharedCopy.game });',
      '    setTargetScene(sceneKey);',
      '    void fullBoot()',
      '      .then(() => goToGame())',
      '      .catch((error) => {',
      "        console.warn('Unity did not finish booting from loading-video:', error);",
      '        setCanContinue(true);',
      '      });',
      '  }, [fullBoot, router, sceneKey, setData, setTargetScene, sharedCopy.game]);',
    ].join('\n') : null,
    isWaitForEngineVideoPage ? [
      '  useEffect(() => {',
      '    // Readiness fallback (NOT a timer): some Unity builds load fully but never',
      '    // fire the scene-ready event fullBoot awaits. Once the build is 100%',
      '    // downloaded, advance anyway (goToGame sets the preload flag, so the game',
      '    // route still skips its own boot — never a second loader).',
      '    if (loadProgress >= 100) goToGame();',
      '  }, [loadProgress]);',
    ].join('\n') : null,
    isIntroVideoPage ? '  const { loadProgress } = useUnity();' : null,
    isIntroVideoPage ? '  const navigated = useRef(false);' : null,
    isIntroVideoPage ? [
      '  useEffect(() => {',
      '    // Entry loading video: TanStack preloads all Unity assets at page start,',
      '    // so wait — as long as it takes, NO timer — for that download to finish',
      '    // (loadProgress 100), then play into landing. The clip loops meanwhile.',
      '    if (navigated.current || loadProgress < 100) return;',
      '    navigated.current = true;',
      `    void router.navigate({ to: ${jsString(introVideoRoute)} as never, replace: true });`,
      '  }, [loadProgress, router]);',
    ].join('\n') : null,
    '  return (',
    wrapStart,
    ...content,
    wrapEnd,
    '  );',
    '}',
    '',
  ].filter(Boolean).join('\n');
}

export function buildTsBlockDrivenLoader(pageId, _pageType, _blocks) {
  const pageType = normaliseBlockType(_pageType || pageId);
  const library = new Map(listBlocks().map(({ manifest }) => [manifest.name, manifest]));
  const seen = new Set();
  const bindings = [];
  for (const block of _blocks ?? []) {
    const manifest = library.get(block.name);
    if (!manifest) continue;
    for (const binding of parseCapeBindings(manifest.capeBindings, { pageType, pageId })) {
      if (seen.has(binding.path)) continue;
      seen.add(binding.path);
      bindings.push({ key: capeRuntimeKey(binding), path: binding.path, type: binding.type });
    }
  }

  // Onboarding-style pages drive a multi-step tutorial flow.
  // Pull per-step copy + imagery so the page can swap title/body/art per step,
  // mirroring the legacy hand-written tutorial.tsx.
  if (pageType === 'onboarding') {
    const STEP_COUNT = tutorialStepCount(_blocks);
    for (let n = 1; n <= STEP_COUNT; n += 1) {
      const titleBinding  = { key: `step${n}Title`, path: `tutorial.step${n}Title`, type: 'i18n-string' };
      const bodyBinding   = { key: `step${n}Body`,  path: `tutorial.step${n}Body`,  type: 'i18n-string' };
      const imageBinding  = { key: `step${n}Image`, path: `tutorial.step${n}Image`, type: 'image' };
      if (!seen.has(titleBinding.path)) { seen.add(titleBinding.path);  bindings.push(titleBinding); }
      if (!seen.has(bodyBinding.path))  { seen.add(bodyBinding.path);   bindings.push(bodyBinding); }
      if (!seen.has(imageBinding.path)) { seen.add(imageBinding.path);  bindings.push(imageBinding); }
    }
    // CAPE field names from cape-format-builder.js:
    //   copy.tutorial.cta      → "Let's go" — final-step button (lastLabel)
    //   copy.tutorial.ctaNext  → "Continue" — intermediate-step button (nextLabel)
    //   copy.tutorial.kicker   → page kicker text
    const ctaBindings = [
      { key: 'nextLabel', path: 'tutorial.ctaNext', type: 'i18n-string' },
      { key: 'lastLabel', path: 'tutorial.cta',     type: 'i18n-string' },
      { key: 'kicker',    path: 'tutorial.kicker',  type: 'i18n-string' },
    ];
    for (const b of ctaBindings) {
      if (!seen.has(b.path)) { seen.add(b.path); bindings.push(b); }
    }

    return [
      `import { loadPageCape } from '~/lib/cape.ts';`,
      '',
      `export async function ${loaderName(pageId)}(language: string) {`,
      `  const cape = await loadPageCape(${jsString(pageId)}, language, ${jsString(bindings)});`,
      `  const steps = Array.from({ length: ${STEP_COUNT} }, (_, i) => {`,
      `    const n = i + 1;`,
      `    const imageRaw = (cape as Record<string, any>)[\`step\${n}Image\`];`,
      `    const image = (imageRaw && typeof imageRaw === 'object' && 'url' in imageRaw ? imageRaw.url : imageRaw) || null;`,
      `    const title = (cape as Record<string, any>)[\`step\${n}Title\`] ?? null;`,
      `    const description = (cape as Record<string, any>)[\`step\${n}Body\`] ?? null;`,
      `    return { title, description, image };`,
      `  });`,
      '  return { cape, steps };',
      '}',
      '',
    ].join('\n');
  }

  if (pageType === 'leaderboard') {
    return [
      `import { loadPageCape } from '~/lib/cape.ts';`,
      `import { getLeaderboardRequest } from '~/server/api/endpoints/Leaderboard.ts';`,
      '',
      `export async function ${loaderName(pageId)}(language: string) {`,
      `  const cape = await loadPageCape(${jsString(pageId)}, language, ${jsString(bindings)});`,
      `  const leaderboard = await getLeaderboardRequest({ data: { type: 'total', offset: 0, limit: 10 } });`,
      `  const entries = leaderboard.data?.entries ?? [];`,
      `  const personalBest = leaderboard.data?.personalBest;`,
      `  cape.rankings = entries.map((entry: any) => ({`,
      `    rank: entry.rank,`,
      `    name: entry.name,`,
      `    score: entry.score,`,
      `    you: Boolean(entry.you ?? entry.isYou ?? entry.isCurrentPlayer),`,
      `  }));`,
      `  cape.personalRank = personalBest?.rank;`,
      `  cape.personalBest = personalBest?.score;`,
      '  return { cape };',
      '}',
      '',
    ].join('\n');
  }

  if (pageType === 'result') {
    return [
      `import { loadPageCape } from '~/lib/cape.ts';`,
      `import { leaderboardFixture } from '~/server/api/fixtures/LeaderboardFixture.ts';`,
      '',
      `export async function ${loaderName(pageId)}(language: string) {`,
      `  const cape = await loadPageCape(${jsString(pageId)}, language, ${jsString(bindings)});`,
      `  const fixture = leaderboardFixture as { entries?: Array<{ score?: number }>; personalBest?: { rank?: number; score?: number } | null };`,
      `  const bestScore = fixture.entries?.reduce((best, entry) => Math.max(best, Number(entry.score ?? 0)), 0) ?? 0;`,
      `  cape.score = fixture.personalBest?.score ?? cape.score ?? 0;`,
      `  cape.highScore = bestScore || cape.highScore || cape.score;`,
      `  cape.rank = fixture.personalBest?.rank ?? cape.rank;`,
      '  return { cape };',
      '}',
      '',
    ].join('\n');
  }

  return [
    `import { loadPageCape } from '~/lib/cape.ts';`,
    '',
    `export async function ${loaderName(pageId)}(language: string) {`,
    `  const cape = await loadPageCape(${jsString(pageId)}, language, ${jsString(bindings)});`,
    '  return { cape };',
    '}',
    '',
  ].join('\n');
}

function renderBlock(block, ctx) {
  const s = settingsOf(block);
  switch (block.name) {
    case 'header-chrome': {
      const brand = ctx.brandInHeader ? settingsOf(ctx.brandInHeader) : null;
      const leftSlot = resolvedSlot(s.leftSlot, ctx);
      const rightSlot = resolvedSlot(s.rightSlot, ctx);
      const centerProp = brand
        ? ` center={<BrandChip image={cape.brandChip?.image ?? cape.logo} size="${brand.size ?? 'md'}" position="${brand.position ?? 'center'}" />}`
        : '';
      return `      <HeaderChrome leftSlot="${leftSlot}" rightSlot="${rightSlot}" onLeftClick={() => ${slotAction(leftSlot, ctx, s.leftSlotTarget)}} onRightClick={() => ${slotAction(rightSlot, ctx, s.rightSlotTarget)}}${centerProp} />`;
    }
    case 'brand-chip':
      return `      <BrandChip image={cape.brandChip?.image ?? cape.logo} size="${s.size ?? 'md'}" position="${s.position ?? 'center'}" />`;
    case 'title-block': {
      const fallbackTitle = jsString(titleFallbackFor(ctx.pageId, ctx));
      const titleExpr = ctx.stepFlow
        ? `currentStep.title || cape.title || ${jsString(titleFallbackFor(ctx.pageId, ctx))}`
        : ctx.pageId === 'leaderboard'
          ? `(cape.title && cape.title !== 'Title' ? cape.title : ${fallbackTitle})`
          : `cape.title || ${fallbackTitle}`;
      const kickerExpr = ctx.stepFlow ? ' kicker={String(cape.kicker ?? "")}' : (s.showKicker ? ' kicker={String(cape.kicker ?? "")}' : '');
      const subtitleExpr = ctx.stepFlow
        ? ' subtitle={String(currentStep.description || cape.subtitle || "")}'
        : (s.showSubtitle ? ' subtitle={String(cape.subtitle ?? "")}' : '');
      return `      <TitleBlock${kickerExpr} title={String(${titleExpr})}${subtitleExpr} />`;
    }
    case 'body-copy':
      return ctx.stepFlow
        ? '      <BodyCopy text={String(currentStep.description ?? cape.body ?? cape.subline ?? "")} />'
        : '      <BodyCopy text={String(cape.body ?? cape.subline ?? "")} />';
    case 'cta-group':
      return `      <CtaGroup buttons={${renderCtaButtons(s, ctx)}} />`;
    case 'footer-link-list':
      return '      <FooterLinkList links={cape.footerLinks ?? []} />';
    case 'centered-art':
      return ctx.stepFlow
        ? `      <CenteredArt image={currentStep.image ?? cape.art?.url ?? cape.art} size="${s.size ?? 'md'}" />`
        : `      <CenteredArt image={cape.art?.url ?? cape.art} size="${s.size ?? 'md'}" />`;
    case 'tagline':
      return "      <Tagline text={String(cape.tagline ?? 'Loading game...')} />";
    case 'loading-indicator':
      return `      <LoadingIndicator kind="${s.kind ?? 'ring'}" label={String(cape.loadingLabel ?? 'Loading')} />`;
    case 'prize-illustration':
      return '      <PrizeIllustration image={cape.prizeImage?.url ?? cape.prizeImage} />';
    case 'code-box':
      return "      <CodeBox code={cape.code ?? ''} label={String(cape.codeLabel ?? 'Code')} copiedLabel={String(cape.codeCopiedConfirmation ?? 'Copied')} />";
    case 'qr-display':
      return "      <QrDisplay value={cape.qrValue ?? cape.code ?? ''} instructions={cape.qrInstructions ?? ''} />";
    case 'channel-tabs':
      return `      <ChannelTabs tabs={${jsString(s.tabs ?? ['webshop', 'in-store'])}} defaultTab="${s.defaultTab ?? 'webshop'}" />`;
    case 'score-readout':
      return ctx.pageType === 'result'
        ? `      <ScoreReadout score={currentScore} label={String(cape.scoreLabel ?? 'Score')} highScore={currentHighScore} showHighScore={${Boolean(s.showHighScore)}} />`
        : `      <ScoreReadout score={cape.score ?? 0} label={String(cape.scoreLabel ?? 'Score')} highScore={cape.highScore ?? 0} showHighScore={${Boolean(s.showHighScore)}} />`;
    case 'score-illustration':
      return '      <ScoreIllustration image={cape.scoreImage?.url ?? cape.scoreImage} />';
    case 'stats-table': {
      // Build rows from the block config, resolving each `value` key against the
      // Unity result store: score/highScore are the computed currents; other
      // keys (rank, distance, tokens, time, …) come from the result object,
      // falling back to a CAPE value. Labels are CAPE-overridable via `<value>Label`.
      const rowsLiteral = (Array.isArray(s.rows) ? s.rows : [])
        .map((r) => {
          const key = String(r.value ?? '');
          const valueExpr = key === 'score' ? 'currentScore'
            : (key === 'highScore' || key === 'highscore') ? 'currentHighScore'
            : `result?.[${jsString(key)}] ?? cape[${jsString(key)}] ?? '—'`;
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
      if (ctx.stepFlow) {
        // count comes from the actual visible-steps count so trailing empty steps don't add ghost dots
        return `      <StepIndicator count={totalSteps} current={safeStepIndex} style="${s.style ?? 'dots'}" />`;
      }
      return `      <StepIndicator count={${Number(s.count ?? 3)}} style="${s.style ?? 'dots'}" />`;
    }
    case 'nav-controls': {
      if (ctx.stepFlow) {
        const lastRoute = jsString(routeForPlayableExit(ctx.stepFlow.nextExit, ctx));
        const showPrev = ctx.stepFlow.showPrev ? 'safeStepIndex > 0' : 'false';
        return `      <NavControls showPrev={${showPrev}} nextLabel={String(isLastStep ? (cape.lastLabel ?? 'Start') : (cape.nextLabel ?? 'Continue'))} onPrev={() => setStepIndex((i) => Math.max(0, i - 1))} onNext={() => isLastStep ? router.navigate({ to: ${lastRoute} as never }) : setStepIndex((i) => i + 1)} />`;
      }
      return `      <NavControls showPrev={${Boolean(s.showPrev)}} nextLabel={String(cape.nextLabel ?? 'Continue')} onNext={() => router.navigate({ to: ${jsString(routeForPlayableExit(s.nextExit ?? 'game', ctx))} as never })} />`;
    }
    case 'field-set':
      return `      <FieldSet fields={${jsString(s.fields ?? ['firstName', 'lastName', 'email'])}} />`;
    case 'opt-in-list':
      return `      <OptInList optIns={${jsString(s.optIns ?? ['terms'])}} required={${s.required !== false}} />`;
    case 'video-player': {
      // All video interludes fall back to the SAME bundled Livewall clip when
      // CAPE has no campaign-specific video — so the intro video and the
      // pre-game loading video are the same clip by default, and no video page
      // ever shows a blank frame.
      const fallbackSrc = "'/assets/livewall-loading.mp4'";
      const bleedProp = ctx.fullBleedVideo ? ' fullBleed={true}' : '';
      const videoTarget = ctx.videoSequenceRoute ?? routeForPlayableExit(s.exit ?? 'game', ctx);
      // Entry loading video: loop the clip and let the loadProgress effect drive
      // the advance (wait for the start-of-page asset download). No onEnded.
      if (ctx.introVideo) {
        return `      <VideoPlayer src={cape.video?.url ?? cape.video ?? ${fallbackSrc}} muted={${s.muted !== false}} loop={true}${bleedProp} />`;
      }
      return (s.onEnd ?? 'auto-advance') === 'auto-advance'
        ? `      <VideoPlayer src={cape.video?.url ?? cape.video ?? ${fallbackSrc}} muted={${s.muted !== false}} loop={${Boolean(s.loop)}}${bleedProp} onEnded={() => router.navigate({ to: ${jsString(videoTarget)} as never })} />`
        : `      <VideoPlayer src={cape.video?.url ?? cape.video ?? ${fallbackSrc}} muted={${s.muted !== false}} loop={${Boolean(s.loop)}}${bleedProp} />`;
    }
    case 'skip-control':
      return `      <SkipControl label={String(cape.skipLabel ?? 'Skip')} availableAfterMs={${Number(s.availableAfterMs ?? 0)}} onSkip={() => router.navigate({ to: ${jsString(ctx.videoSequenceRoute ?? routeForPlayableExit(s.exit ?? 'game', ctx))} as never })} />`;
    case 'reveal-cta':
      return `      <RevealCta label={String(cape.ctaLabel ?? 'Continue')} variant="${s.variant ?? 'primary'}" onClick={() => router.navigate({ to: ${jsString(ctx.videoSequenceRoute ?? routeForPlayableExit(s.exit ?? 'game', ctx))} as never })} />`;
    case 'fallback-indicator':
      return "      <FallbackIndicator label={String(cape.fallbackLabel ?? 'Loading')} />";
    case 'audio-toggle':
      return '      <AudioToggle />';
    case 'pause-toggle':
      return '      <PauseToggle />';
    case 'pause-overlay':
      return '      <PauseOverlay title={cape.pauseTitle ?? ""} />';
    case 'timer':
      return `      <Timer mode="${s.mode ?? 'countdown'}" durationSec={${Number(s.durationSec ?? 60)}} />`;
    case 'sponsor-footer-strip':
      return '      <SponsorFooterStrip text={cape.sponsorText ?? ""} logo={cape.sponsorLogo?.url ?? cape.sponsorLogo} />';
    case 'menu-item-list': {
      const targets = ` targets={${JSON.stringify(menuTargetsFor(s, ctx))}}`;
      return `      <MenuItemList items={cape.items ?? undefined}${targets} />`;
    }
    case 'pre-gate-modal':
      return `      <PreGateModal kind="${s.kind ?? 'age-18'}" title={String(cape.preGateTitle ?? '')} confirmLabel={String(cape.preGateConfirm ?? 'Continue')} persistAcrossSession={${s.persistAcrossSession !== false}} />`;
    default:
      return `      <${componentNameOf(block.name)} />`;
  }
}

function helpRouteFor(ctx = {}) {
  const routeMap = ctx.routeMap ?? {};
  const pages = ctx.pages ?? [];
  if (routeMap.tutorial || pages.includes('tutorial')) return routeForExit('tutorial', routeMap);
  return null;
}

function resolvedSlot(slot, ctx = {}) {
  if (slot !== 'help') return slot ?? 'none';
  const helpRoute = helpRouteFor(ctx);
  const currentRoute = routeForExit(ctx.pageId, ctx.routeMap ?? {});
  return helpRoute && helpRoute !== currentRoute ? 'help' : 'none';
}

const SLOT_DEFAULT_ROUTES = { menu: '/menu', close: '/' };

function slotAction(slot, ctx = {}, customTarget) {
  if (slot === 'back') return 'router.history.back()';
  if (!['menu', 'help', 'close'].includes(slot)) return 'undefined';
  let route;
  if (customTarget) {
    route = routeForExit(customTarget, ctx.routeMap);
  } else if (slot === 'help') {
    route = helpRouteFor(ctx);
    if (!route) return 'undefined';
  } else {
    route = SLOT_DEFAULT_ROUTES[slot];
  }
  return `router.navigate({ to: ${jsString(route)} as never })`;
}

function renderCtaButtons(settings, ctx = {}) {
  const routeMap = ctx.routeMap ?? {};
  const list = Array.isArray(settings.buttons) && settings.buttons.length
    ? settings.buttons
    : [{ variant: 'primary', exit: 'game' }];
  const cap = Math.min(4, settings.count ? Number(settings.count) : list.length);
  const entries = list.slice(0, Math.max(1, cap)).map((b, i) => {
    const route = routeForPlayableExit(b.exit ?? 'game', ctx);
    const click = ctx.pageId === 'register'
      ? `() => { markRegistered(); router.navigate({ to: '${route}' as never }); }`
      : `() => router.navigate({ to: '${route}' as never })`;
    return `{ label: cape.cta?.[${i}]?.label || cape.cta?.[${i}] || cape.ctaLabel || ${jsString(ctaFallbackFor(ctx.pageId ?? '', i))}, variant: '${b.variant ?? 'primary'}', onClick: ${click} }`;
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
    const route = exit === 'game' || exit === 'gameplay'
      ? routeForPlayableExit(exit, ctx)
      : routeForExit(exit, routeMap);
    out.push(`{ label: ${labelExpr}, variant: '${variant}', onClick: () => router.navigate({ to: '${route}' as never }) }`);
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
