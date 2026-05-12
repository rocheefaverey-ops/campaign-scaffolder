/**
 * cli/cape-format-builder.js
 *
 * Builds a dynamic Cape interfaceSetup + publishProfiles from scaffold
 * selections. Only includes tabs and fields for the pages/elements that
 * were actually chosen — giving each project its own minimal Cape format.
 *
 * Contract: every asset, colour, font, copy string and video the scaffolded
 * frontend reads MUST be fillable from this format. If you add a new CAPE
 * `getCapeText`/`getCapeImage` call in base-templates or modules, mirror it
 * here so clients can populate it.
 *
 * Usage:
 *   import { buildTanStackCapeFormat, buildNextCapeFormat } from './cape-format-builder.js';
 *   const format = buildNextCapeFormat({ pages, pageElementSelections, modules });
 */

// ── Livewall baseline defaults ────────────────────────────────────────────────

const LW_LIME     = '#D1FF00';
const LW_INK      = '#1A1A1A';
const LW_SURFACE  = '#EEF1E9';
const LW_ERROR    = '#E82727';
const LW_FONT     = "'Stabil Grotesk', 'Inter', 'Segoe UI', Arial, sans-serif";

// ── Field builders ────────────────────────────────────────────────────────────

function inp(type, model, label, key, extra = {}) {
  return { type, model, label, key, itemType: 'input', ...extra };
}

function textML(model, label, key, defaultValue = '') {
  return inp('textMultiLanguage', model, label, key, { defaultValue: { value: defaultValue } });
}

function text(model, label, key, defaultValue) {
  return inp('text', model, label, key, defaultValue !== undefined ? { defaultValue } : {});
}

function number(model, label, key, defaultValue, extra = {}) {
  return inp('number', model, label, key, { defaultValue, ...extra });
}

function color(model, label, key, defaultValue) {
  return inp('color', model, label, key, { picker: 'picker', defaultValue });
}

function asset(model, label, key, { fileType = 'image', maxFileSize = '15000' } = {}) {
  return inp('files', model, label, key, { canUpload: true, fileType, maxFileSize });
}

function assetVideo(model, label, key) {
  return asset(model, label, key, { fileType: 'video', maxFileSize: '200000' });
}

// Logos accept any file type so animated GIFs can be used alongside SVG/PNG.
function assetLogo(model, label, key) {
  return asset(model, label, key, { fileType: '*', maxFileSize: '15000' });
}

// Desktop background accepts images and videos (e.g. looping bg video).
function assetMediaBg(model, label, key) {
  return asset(model, label, key, { fileType: '*', maxFileSize: '200000' });
}

function bool(model, label, key, defaultValue) {
  return inp('switch', model, label, key, { defaultValue });
}

function select(model, label, key, options, defaultValue) {
  return inp('select', model, label, key, { options, defaultValue });
}

function langSelector(model, label, key, defaultValue) {
  return inp('languageSelector', model, label, key, { defaultValue });
}

// ── Structure builders ────────────────────────────────────────────────────────

function block(key, title, items) {
  return { title, opened: true, type: 'general', key, itemType: 'block', items };
}

function publishBlock() {
  return { title: 'Publish', opened: true, type: 'publish', key: 'publish-block', itemType: 'block', model: 'publish.results', items: [] };
}

function tab(key, title, path, blocks, multiLanguage = false) {
  return { key, title, path, type: 'page', multiLanguage, tour: false, blocks };
}

function capePage(path, title, key, tabs, opts = {}) {
  const p = { path, title, key, showLanguageSelector: opts.showLanguageSelector ?? false, tabs };
  if (opts.condition) p.condition = opts.condition;
  return p;
}

// ── Shared pages (always included) ────────────────────────────────────────────

/**
 * Settings page — the Livewall branding contract.
 * Every field here flows to CSS custom properties / metadata at runtime via
 * the DesignTokenInjector baked into the base template. Clients can reskin
 * the whole campaign by filling this tab in.
 */
function settingsPage() {
  return capePage('settings', 'Settings', 'settings-page', [
    tab('settings-general-tab', 'General', 'general', [
      block('settings-languages-block', 'Languages', [
        langSelector('settings.languages', 'Languages', 'settings-languages', { NL: 'NL - Dutch', EN: 'EN - English' }),
      ]),

      // ── Branding: every token the DesignTokenInjector reads ────────────────
      block('settings-branding-block', 'Branding', [
        asset('settings.branding.favicon',          'Favicon',                 'settings-branding-favicon'),
        color('settings.branding.themeColor',       'Theme Color (browser UI)','settings-branding-themecolor',  LW_LIME),
        color('settings.branding.primaryColor',     'Primary (CTAs, accents)', 'settings-branding-primarycolor', LW_LIME),
        color('settings.branding.secondaryColor',   'Secondary (ink / text)',  'settings-branding-secondarycolor', LW_INK),
        color('settings.branding.tertiaryColor',    'Tertiary (surface)',      'settings-branding-tertiarycolor', LW_SURFACE),
        color('settings.branding.accentColor',      'Accent (highlights)',     'settings-branding-accentcolor',  LW_LIME),
        color('settings.branding.errorColor',       'Error / status red',      'settings-branding-errorcolor',   LW_ERROR),
        text( 'settings.branding.fontFamily',       'Default font family',     'settings-branding-fontfamily',   LW_FONT),
        text( 'settings.branding.displayFontFamily','Display font family',     'settings-branding-displayfont',  LW_FONT),
        asset('settings.branding.fontBrand',        'Brand font file (optional)','settings-branding-fontbrand', { fileType: '*', maxFileSize: '15000' }),
        asset('settings.branding.fontLight',        'Light font file (optional)','settings-branding-fontlight', { fileType: '*', maxFileSize: '15000' }),
      ]),

      // ── Site meta (title / description / legal links) ──────────────────────
      block('settings-meta-block', 'Site meta', [
        textML('general.meta.siteTitle',       'Site title',       'settings-meta-title',       'Livewall Campaign'),
        textML('general.meta.siteDescription', 'Site description', 'settings-meta-description', ''),
      ]),

      block('settings-legal-block', 'Legal links', [
        text('general.legal.termsUrl',   'Terms & conditions URL', 'settings-legal-terms',   'https://livewallgroup.com/terms'),
        text('general.legal.privacyUrl', 'Privacy policy URL',     'settings-legal-privacy', 'https://livewallgroup.com/privacy'),
      ]),

      // ── Global header behaviour (per-page overrides live on each page tab) ─
      block('settings-header-block', 'Global header', [
        bool('header.enabled',        'Show header globally',   'settings-header-enabled',   false),
        select('header.variant',      'Header variant',         'settings-header-variant',
          { default: 'Default (surface)', transparent: 'Transparent' }, 'default'),
        bool('header.showLogo',       'Show logo',              'settings-header-showlogo',  true),
        bool('header.showMenuButton', 'Show menu button',       'settings-header-showmenu',  true),
      ]),

      // ── Desktop wrapper (QR → mobile preview) ──────────────────────────────
      block('settings-desktop-block', 'Desktop wrapper', [
        bool('desktop.useDesktopWrapper', 'Use desktop QR wrapper', 'settings-desktop-enabled', true),
      ]),

      // ── Menu visibility (toggles items in the hamburger menu) ─────────────
      block('settings-menu-block', 'Menu visibility', [
        bool('settings.menu.showHome',        'Show Home',           'settings-menu-home',    true),
        bool('settings.menu.showResume',      'Show Resume game',    'settings-menu-resume',  false),
        bool('settings.menu.showHowToPlay',   'Show How to play',    'settings-menu-how',     true),
        bool('settings.menu.showLeaderboard', 'Show Leaderboard',    'settings-menu-leader',  false),
        bool('settings.menu.showVoucher',     'Show My voucher',     'settings-menu-voucher', false),
        bool('settings.menu.showTerms',       'Show Terms',          'settings-menu-terms',   true),
        bool('settings.menu.showPrivacy',     'Show Privacy',        'settings-menu-privacy', true),
        bool('settings.menu.showFaq',         'Show FAQ',            'settings-menu-faq',     false),
        bool('settings.menu.showLeave',       'Show Leave campaign', 'settings-menu-leave',   true),
      ]),

      block('settings-game-block', 'Game boot', [
        text('settings.game.sceneKey', 'Unity scene key', 'settings-game-scenekey', 'Racing'),
      ]),

      // ── Integrations ───────────────────────────────────────────────────────
      block('settings-integrations-block', 'Integrations', [
        text('settings.capeKey',    'Cape Key', 'settings-capekey',    'scaffolder-test'),
        text('settings.tagmanager', 'GTM ID',   'settings-tagmanager'),
      ]),
    ]),
  ]);
}

function publishPage() {
  return capePage('publish', 'Publish', 'publish-page', [
    tab('publish-general-tab', 'General', 'general', [publishBlock()]),
  ], { condition: "editor.type!='concept'" });
}

// ── TanStack page tabs ────────────────────────────────────────────────────────

function tsLaunchTab(els) {
  const items = [];
  if (els.includes('title'))       items.push(textML('copy.launch.title',       'Title',       'ts-launch-title',       'Welcome!'));
  if (els.includes('description')) items.push(textML('copy.launch.description', 'Description', 'ts-launch-description', 'Get ready to play.'));
  if (els.includes('cta-play'))    items.push(textML('copy.launch.buttonStart', 'Play Button', 'ts-launch-btnstart',    'Play now'));
  if (items.length === 0) return null;
  return tab('ts-launch-tab', 'Launch', 'launch', [block('ts-launch-copy-block', 'Copy', items)], true);
}

function tsTutorialTab(els, stepCount) {
  if (!els.includes('steps')) return null;
  const items = [];
  for (let i = 1; i <= stepCount; i++) {
    items.push(
      textML(`copy.tutorial.step${i}.title`,       `Step ${i} Title`,       `ts-tutorial-step${i}-title`, `Step ${i}`),
      textML(`copy.tutorial.step${i}.description`, `Step ${i} Description`, `ts-tutorial-step${i}-desc`,  `Instructions for step ${i}.`),
    );
  }
  items.push(
    textML('copy.tutorial.buttonNext',  'Next Button',  'ts-tutorial-btnnext',  'Next'),
    textML('copy.tutorial.buttonReady', 'Start Button', 'ts-tutorial-btnready', 'Start'),
  );
  return tab('ts-tutorial-tab', 'Tutorial', 'tutorial', [block('ts-tutorial-copy-block', 'Copy', items)], true);
}

function tsScoreTab(els) {
  const items = [];
  if (els.includes('title'))          items.push(textML('copy.score.title',          'Title',             'ts-score-title',       'Your score'));
  if (els.includes('description'))    items.push(textML('copy.score.description',    'Description',       'ts-score-description', 'Well played!'));
  if (els.includes('cta-register'))   items.push(textML('copy.score.buttonRegister', 'Register Button',   'ts-score-btnreg',      'Register to win'));
  if (els.includes('cta-play-again')) items.push(textML('copy.score.buttonPlayAgain','Play Again Button', 'ts-score-btnagain',    'Play again'));
  if (items.length === 0) return null;
  return tab('ts-score-tab', 'Score', 'score', [block('ts-score-copy-block', 'Copy', items)], true);
}

function tsRegisterTab(els) {
  const items = [];
  if (els.includes('reg-title'))       items.push(textML('copy.registration.title',       'Title',       'ts-reg-title',       'Register'));
  if (els.includes('reg-description')) items.push(textML('copy.registration.description', 'Description', 'ts-reg-description', 'Enter your details to win.'));
  items.push(
    textML('copy.registration.buttonSignUp',  'Submit Button', 'ts-reg-btnsignup',    'Submit'),
    textML('copy.registration.genericError',  'Generic Error', 'ts-reg-genericerror', 'Something went wrong. Please try again.'),
  );
  if (els.includes('field-name')) {
    items.push(
      textML('copy.registration.nameTitle',       'Name Label',       'ts-reg-nametitle',   'Name'),
      textML('copy.registration.namePlaceholder', 'Name Placeholder', 'ts-reg-nameph',      'Enter your name'),
      textML('copy.registration.nameError',       'Name Error',       'ts-reg-nameerror',   'Please enter your name'),
    );
  }
  if (els.includes('field-email')) {
    items.push(
      textML('copy.registration.emailTitle',       'Email Label',       'ts-reg-emailtitle',  'Email'),
      textML('copy.registration.emailPlaceholder', 'Email Placeholder', 'ts-reg-emailph',     'Enter your email'),
      textML('copy.registration.emailError',       'Email Error',       'ts-reg-emailerror',  'Please enter a valid email'),
    );
  }
  if (els.includes('field-country')) {
    items.push(
      textML('copy.registration.countryTitle', 'Country Label', 'ts-reg-countrytitle', 'Country'),
      textML('copy.registration.countryError', 'Country Error', 'ts-reg-countryerror', 'Please select a country'),
    );
  }
  if (els.includes('field-optin-1')) {
    items.push(
      textML('copy.registration.optinTextOne',  'Opt-in 1 Text',  'ts-reg-optin1text',  'I agree to the <a href="/terms">terms and conditions</a>.'),
      textML('copy.registration.optinErrorOne', 'Opt-in 1 Error', 'ts-reg-optin1error', 'This field is required.'),
    );
  }
  if (els.includes('field-optin-2')) {
    items.push(textML('copy.registration.optinTextTwo', 'Opt-in 2 Text', 'ts-reg-optin2text', 'Yes, I would like to receive news and offers.'));
  }

  const blocks = [block('ts-reg-copy-block', 'Copy', items)];
  if (els.includes('field-optin-1')) {
    blocks.push(block('ts-reg-files-block', 'Files', [
      asset('files.pdfs.terms', 'Terms & Conditions PDF', 'ts-reg-terms'),
    ]));
  }
  return tab('ts-register-tab', 'Register', 'register', blocks, true);
}

function tsDesktopTab() {
  return tab('ts-desktop-tab', 'Desktop & Loading', 'desktop', [
    block('ts-desktop-assets-block', 'Desktop assets', [
      assetLogo(   'desktop.logo',                   'Desktop Logo',            'ts-desktop-logo'),
      assetMediaBg('desktop.backgroundIllustration', 'Background illustration', 'ts-desktop-bg'),
    ]),
    block('ts-desktop-copy-block', 'Desktop', [
      textML('desktop.description', 'Description', 'ts-desktop-description', 'This experience is optimised for mobile. Scan the QR code with your phone.'),
      textML('desktop.qrText',      'QR Text',     'ts-desktop-qrtext',      'Scan to play on mobile'),
    ]),
    block('ts-loading-assets-block', 'Loading assets', [
      assetVideo('files.video.loadingVideo', 'Loading / intro video', 'ts-loading-video'),
    ]),
    block('ts-loading-copy-block', 'Loading', [
      textML('loading.title',        'Title',         'ts-loading-title', 'Loading…'),
      textML('loading.description1', 'Description 1', 'ts-loading-desc1', 'Preparing the game…'),
      textML('loading.description2', 'Description 2', 'ts-loading-desc2', 'Almost there…'),
      textML('loading.description3', 'Description 3', 'ts-loading-desc3', 'Ready to play!'),
    ]),
  ], true);
}

// ── Next.js page tabs ─────────────────────────────────────────────────────────

/**
 * Header & global brand assets — logo and menu button assets live here, not on
 * individual page tabs, so clients only set them once.
 */
function nextHeaderTab() {
  return tab('next-header-tab', 'Header & brand assets', 'header', [
    block('next-header-assets-block', 'Header assets', [
      assetLogo('general.header.logo',      'Logo',            'next-header-logo'),
      asset(    'general.header.menuBtnBg', 'Menu button BG',  'next-header-menubtnbg'),
      asset(    'general.header.menuIcon',  'Menu icon',       'next-header-menuicon'),
    ]),
  ], false);
}

/**
 * Desktop wrapper, loading overlay, and the background video used across
 * loading / intro states.
 */
function nextDesktopTab() {
  const blocks = [
    block('next-desktop-assets-block', 'Desktop assets', [
      assetLogo(   'desktop.logo',                   'Desktop logo',            'next-desktop-logo'),
      assetMediaBg('desktop.backgroundIllustration', 'Background illustration', 'next-desktop-bg'),
    ]),
    block('next-desktop-copy-block', 'Desktop copy', [
      textML('desktop.description', 'Description', 'next-desktop-description', 'This experience is optimised for mobile. Scan the QR code with your phone.'),
      textML('desktop.qrText',      'QR Text',     'next-desktop-qrtext',      'Scan to play on mobile'),
    ]),
    block('next-loading-assets-block', 'Loading assets', [
      assetVideo('files.video.loadingVideo', 'Loading / intro video', 'next-loading-video'),
    ]),
    block('next-loading-copy-block', 'Loading copy', [
      textML('loading.title',        'Loading title',    'next-loading-title', 'Loading…'),
      textML('loading.description1', 'Loading line 1',   'next-loading-desc1', 'Preparing the game…'),
      textML('loading.description2', 'Loading line 2',   'next-loading-desc2', 'Almost there…'),
      textML('loading.description3', 'Loading line 3',   'next-loading-desc3', 'Ready to play!'),
    ]),
  ];

  return tab('next-desktop-tab', 'Desktop & Loading', 'desktop', blocks, true);
}

/**
 * Landing — every asset and copy string the frontend reads:
 *   general.landing.background, general.landing.logo
 *   copy.landing.{kicker, headline, subline, cta, ctaSecondary}
 *   files.landing.{heroImage, heroVideo, backgroundImage}
 */
/**
 * Tab-key / path / title helpers used by every per-instance tab.
 * Singleton instances (id === type) keep the legacy "Landing" / "landing"
 * shape for backwards-compatible CAPE migrations. Duplicates get a
 * "Type · id" tab title and per-instance keys.
 */
function instanceTitle(typeLabel, type, instanceId) {
  return instanceId === type ? typeLabel : `${typeLabel} · ${instanceId}`;
}
function tabKey(prefix, type, instanceId) {
  return instanceId === type ? `${prefix}-tab` : `${prefix}-${instanceId}-tab`;
}
function blockKey(prefix, type, instanceId, suffix) {
  return instanceId === type ? `${prefix}-${suffix}-block` : `${prefix}-${instanceId}-${suffix}-block`;
}
function fieldKey(prefix, type, instanceId, suffix) {
  return instanceId === type ? `${prefix}-${suffix}` : `${prefix}-${instanceId}-${suffix}`;
}
function capeModelId(instanceId) {
  return String(instanceId).replace(/-([a-z0-9])/g, (_, chr) => chr.toUpperCase());
}

function nextLandingTab(instanceId, els, flowEnabledExits = {}) {
  const TYPE = 'landing';
  const c = (f) => `copy.${instanceId}.${f}`;
  const g = (f) => `general.${instanceId}.${f}`;
  const fp = (f) => `files.${instanceId}.${f}`;
  const k = (s) => fieldKey('next-landing', TYPE, instanceId, s);

  const items = [
    asset(    g('background'), 'Background', k('bg')),
    assetLogo(g('logo'),       'Logo',       k('logo')),
  ];
  items.push(textML(c('kicker'),   'Kicker (small label above headline)', k('kicker'),   'Live experience'));
  items.push(textML(c('headline'), 'Headline',                            k('headline'), 'Welcome'));
  items.push(textML(c('subline'),  'Subline',                             k('subline'),  'Are you ready to play?'));
  items.push(textML(c('cta'), 'Play button', k('cta'), 'Play'));
  items.push(textML(c('ctaReturning'), 'Returning player button', k('cta-returning'), 'Play again'));
  items.push(textML(c('leaderboardCta'), 'Returning leaderboard button', k('leaderboard-cta'), 'Leaderboard'));

  // Secondary "Leaderboard" button copy — only when the wizard's
  // {instanceId}.leaderboard exit toggle is on.
  const showLeaderboard = flowEnabledExits[`${instanceId}.leaderboard`] ?? false;
  items.push(textML(c('ctaLeaderboard'), 'Leaderboard button', k('cta2'), 'Leaderboard'));

  const blocks = [block(blockKey('next-landing', TYPE, instanceId, 'copy'), 'Copy', items.filter(i => i.type === 'textMultiLanguage'))];
  const assets = items.filter(i => i.type === 'assetSelector');

  blocks.push(block(blockKey('next-landing', TYPE, instanceId, 'files'), 'Hero media (optional)', [
    assetMediaBg(fp('heroImage'),       'Hero image (video or image)', k('heroimage')),
    assetVideo(fp('heroVideo'),         'Hero video', k('herovideo')),
    assetMediaBg(fp('backgroundImage'), 'Background (video or image)', k('bgimage')),
  ]));
  if (assets.length) blocks.push(block(blockKey('next-landing', TYPE, instanceId, 'assets'), 'Assets', assets));
  blocks.push(block(blockKey('next-landing', TYPE, instanceId, 'settings'), 'Settings', [
    bool(`settings.pages.${instanceId}.showLeaderboardButton`, 'Show leaderboard button', k('showleaderboard'), showLeaderboard),
  ]));

  return tab(tabKey('next-landing', TYPE, instanceId), instanceTitle('Landing', TYPE, instanceId), instanceId, blocks, true);
}

/**
 * Onboarding — steps are multi-step, each has title + body.
 */
function nextOnboardingTab(instanceId, els, stepCount) {
  const TYPE = 'onboarding';
  const c = (f) => `copy.${instanceId}.${f}`;
  const g = (f) => `general.${instanceId}.${f}`;
  const fp = (f) => `files.${instanceId}.${f}`;
  const k = (s) => fieldKey('next-onboarding', TYPE, instanceId, s);

  const assetItems = [
    assetMediaBg(g('background'), 'Background (video or image)', k('bg')),
    assetLogo(   g('logo'),       'Logo',                        k('logo')),
    assetMediaBg(g('heroImage'),  'Hero image (video or image)', k('hero')),
  ];

  const copyItems = [
    textML(c('kicker'),   'Kicker',   k('kicker'),   'How to play'),
    textML(c('headline'), 'Headline', k('headline'), 'How to play'),
    textML(c('subline'),  'Subline',  k('subline'),  ''),
  ];
  copyItems.push(textML(c('cta'), "Let's go button", k('cta'), "Let's go"));
  copyItems.push(textML(c('ctaNext'), 'Continue button', k('ctanext'), 'Continue'));
  for (let i = 1; i <= stepCount; i++) {
    copyItems.push(
      textML(c(`step${i}Title`), `Step ${i} title`, k(`step${i}-title`), `Step ${i}`),
      textML(c(`step${i}Body`),  `Step ${i} body`,  k(`step${i}-body`),  `Instructions for step ${i}.`),
    );
  }

  const stepAssets = [];
  for (let i = 1; i <= stepCount; i++) {
    stepAssets.push(assetMediaBg(fp(`step${i}Image`), `Step ${i} image (video or image)`, k(`step${i}-image`)));
  }
  const blocks = [];
  blocks.push(             block(blockKey('next-onboarding', TYPE, instanceId, 'copy'),         'Copy',        copyItems));
  if (assetItems.length) blocks.push(block(blockKey('next-onboarding', TYPE, instanceId, 'assets'),       'Assets',      assetItems));
  if (stepAssets.length) blocks.push(block(blockKey('next-onboarding', TYPE, instanceId, 'step-assets'),  'Step images', stepAssets));
  blocks.push(block(blockKey('next-onboarding', TYPE, instanceId, 'settings'), 'Settings', [
    bool(`settings.pages.${instanceId}.allowSkip`, 'Allow skip', k('allowskip'), false),
  ]));

  return tab(tabKey('next-onboarding', TYPE, instanceId), instanceTitle('Onboarding', TYPE, instanceId), instanceId, blocks, true);
}

/**
 * Result — win/lose screen. Covers all four CTAs the result page may render.
 */
function nextResultTab(instanceId, els, flowEnabledExits = {}, modules = []) {
  const TYPE = 'result';
  const c = (f) => `copy.${instanceId}.${f}`;
  const g = (f) => `general.${instanceId}.${f}`;
  const fp = (f) => `files.${instanceId}.${f}`;
  const k = (s) => fieldKey('next-result', TYPE, instanceId, s);

  const showPlayAgain   = flowEnabledExits[`${instanceId}.playAgain`]   ?? true;
  const showLeaderboard = flowEnabledExits[`${instanceId}.leaderboard`] ?? false;
  const showRegisterCta = modules.includes('registration');

  const copyItems = [
    textML(c('kicker'),      'Kicker',          k('kicker'),      'Result'),
    textML(c('headline'),    'Headline',        k('headline'),    'Game over'),
    textML(c('subline'),     'Subline',         k('subline'),     ''),
    textML(c('scoreLabel'),  'Score label',     k('scorelabel'),  'Your score'),
    textML(c('rankLabel'),   'Rank label',      k('ranklabel'),   'Your rank'),
    textML(c('ctaContinue'), 'Continue button', k('ctacontinue'), 'Continue'),
  ];
  if (showPlayAgain)   copyItems.push(textML(c('ctaPlayAgain'),   'Play again button',  k('ctaplayagain'),   'Play again'));
  copyItems.push(textML(c('ctaLeaderboard'), 'Leaderboard button', k('ctaleaderboard'), 'Leaderboard'));
  if (showRegisterCta) copyItems.push(textML(c('ctaRegister'),    'Register button',    k('ctaregister'),    'Register for the prize'));

  const assetItems = [
    assetMediaBg(fp('winImage'),  'Win image (video or image)',  k('winimage')),
    assetMediaBg(fp('loseImage'), 'Lose image (video or image)', k('loseimage')),
    assetMediaBg(g('background'), 'Background (video or image)', k('bg')),
    assetLogo(   g('logo'),       'Logo',                        k('logo')),
  ];

  return tab(tabKey('next-result', TYPE, instanceId), instanceTitle('Result', TYPE, instanceId), instanceId, [
    block(blockKey('next-result', TYPE, instanceId, 'assets'), 'Assets', assetItems),
    block(blockKey('next-result', TYPE, instanceId, 'copy'),   'Copy',   copyItems),
    block(blockKey('next-result', TYPE, instanceId, 'settings'), 'Settings', [
      number(`settings.pages.${instanceId}.autoNavSec`, 'Auto-navigate after', k('autonavsec'), 0, { min: 0, max: 120 }),
      bool(`settings.pages.${instanceId}.showPlayAgainButton`, 'Show play again button', k('showplayagain'), showPlayAgain),
      bool(`settings.pages.${instanceId}.showLeaderboardButton`, 'Show leaderboard button', k('showleaderboard'), showLeaderboard),
    ]),
  ], true);
}

/**
 * Menu — only the labels for items the wizard left enabled. If the user
 * disables every item, the tab is dropped entirely (caller's job to skip).
 */
function nextMenuTab(menuItemsEnabled = {}) {
  // Mirror of MENU_ITEMS in cli/wizard-ui/src/shared/config.ts and
  // base-templates/next/app/(campaign)/menu/page.tsx — keep all three in sync.
  const ALL_ITEMS = [
    { id: 'home',        label: 'Home',           defaultEnabled: true,  fallback: 'Home'           },
    { id: 'resume',      label: 'Resume game',    defaultEnabled: true,  fallback: 'Resume game'    },
    { id: 'howToPlay',   label: 'How to play',    defaultEnabled: true,  fallback: 'How to play'    },
    { id: 'leaderboard', label: 'Leaderboard',    defaultEnabled: false, fallback: 'Leaderboard'    },
    { id: 'voucher',     label: 'My voucher',     defaultEnabled: false, fallback: 'My voucher'     },
    { id: 'terms',       label: 'Terms',          defaultEnabled: true,  fallback: 'Terms'          },
    { id: 'privacy',     label: 'Privacy',        defaultEnabled: false, fallback: 'Privacy'        },
    { id: 'faq',         label: 'FAQ',            defaultEnabled: false, fallback: 'FAQ'            },
    { id: 'leave',       label: 'Leave campaign', defaultEnabled: false, fallback: 'Leave campaign' },
  ];

  const items = [textML('copy.menu.headline', 'Menu headline', 'next-menu-headline', 'Menu')];
  for (const item of ALL_ITEMS) {
    const enabled = menuItemsEnabled[item.id] ?? item.defaultEnabled;
    if (!enabled) continue;
    items.push(textML(`copy.menu.${item.id}`, item.label, `next-menu-${item.id.toLowerCase()}`, item.fallback));
  }

  // If no items at all (user explicitly turned everything off) just keep the
  // headline alone; the tab is still useful for that one field.
  return tab('next-menu-tab', 'Menu', 'menu', [
    block('next-menu-copy-block', 'Menu copy', items),
  ], true);
}

const VIDEO_PAGE_TITLES = {
  video: 'Video',
  'intro-video': 'Intro video',
  'loading-video': 'Loading video',
  'ad-video': 'Ad video',
};

/** Full-screen interstitial video pages. */
function nextVideoTab(instanceId) {
  const TYPE = 'video';
  const modelId = capeModelId(instanceId);
  const c = (f) => `copy.${modelId}.${f}`;
  const g = (f) => `general.${modelId}.${f}`;
  const k = (s) => fieldKey('next-video', TYPE, instanceId, s);
  const isLoadingVideo = instanceId === 'loading-video';
  const settingsItems = isLoadingVideo
    ? [
      text(`settings.pages.${modelId}.skipBehavior`, 'Skip behavior', k('skipbehavior'), 'Skip appears only when the game is fully loaded'),
    ]
    : [
      number(`settings.pages.${modelId}.skipAfterSeconds`, 'Show skip after seconds', k('skipafterseconds'), 3, { min: 0, max: 30 }),
    ];

  return tab(tabKey('next-video', TYPE, instanceId), VIDEO_PAGE_TITLES[instanceId] ?? instanceTitle('Video', TYPE, instanceId), instanceId, [
    block(blockKey('next-video', TYPE, instanceId, 'assets'), 'Video file', [
      assetVideo(g('introVideo'), 'Intro video', k('introvideo')),
      assetLogo( g('logo'),       'Logo',        k('logo')),
      assetVideo(`files.${modelId}.loadingVideo`, 'Loading video fallback', k('loadingvideo')),
    ]),
    block(blockKey('next-video', TYPE, instanceId, 'copy'), 'Copy', [
      textML(c('headline'), 'Headline', k('headline'), 'Watch this'),
      textML(c('subline'),  'Subline',  k('subline'),  ''),
      textML(c('cta'),      'CTA',      k('cta'),      'Continue'),
      textML(c('loadingText'), 'Loading label', k('loadingtext'), 'Loading...'),
    ]),
    block(blockKey('next-video', TYPE, instanceId, 'settings'), 'Settings', settingsItems),
  ], true);
}

// ── Module tabs ───────────────────────────────────────────────────────────────

function nextLeaderboardTab(instanceId = 'leaderboard') {
  const TYPE = 'leaderboard';
  const c = (f) => `copy.${instanceId}.${f}`;
  const k = (s) => fieldKey('next-leaderboard', TYPE, instanceId, s);
  return tab(tabKey('next-leaderboard', TYPE, instanceId), instanceTitle('Leaderboard', TYPE, instanceId), instanceId, [
    block(blockKey('next-leaderboard', TYPE, instanceId, 'copy'), 'Copy', [
      textML(c('kicker'),     'Kicker',            k('kicker'),     'Ranking'),
      textML(c('headline'),   'Headline',          k('headline'),   'Leaderboard'),
      textML(c('subline'),    'Subline',           k('subline'),    ''),
      textML(c('tabTotal'),   'Tab — All time',    k('tabtotal'),   'All Time'),
      textML(c('tabDaily'),   'Tab — Daily',       k('tabdaily'),   'Daily'),
      textML(c('tabWeekly'),  'Tab — Weekly',      k('tabweekly'),  'Weekly'),
      textML(c('tabMonthly'), 'Tab — Monthly',     k('tabmonthly'), 'Monthly'),
      textML(c('rankLabel'),  'Rank column label', k('ranklabel'),  '#'),
      textML(c('nameLabel'),  'Name column label', k('namelabel'),  'Name'),
      textML(c('scoreLabel'), 'Score column label',k('scorelabel'), 'Score'),
      textML(c('youLabel'),   '"You" label',       k('youlabel'),   'You'),
      textML(c('emptyState'), 'Empty state',       k('empty'),      'No scores yet.'),
      textML(c('ctaDone'),    'Done button',       k('ctadone'),    'Done'),
    ]),
  ], true);
}

function nextRegistrationTab(instanceId = 'register') {
  const TYPE = 'register';
  const c = (f) => `copy.${instanceId}.${f}`;
  const k = (s) => fieldKey('next-reg', TYPE, instanceId, s);
  return tab(tabKey('next-registration', TYPE, instanceId), instanceTitle('Registration', TYPE, instanceId), instanceId, [
    block(blockKey('next-reg', TYPE, instanceId, 'copy'), 'Copy', [
      textML(c('headline'),        'Headline',          k('headline'),     'Register'),
      textML(c('subline'),         'Subline',           k('subline'),      'Enter your details to enter.'),
      textML(c('cta'),             'Submit button',     k('cta'),          'Submit'),
      textML(c('labelFirstName'),  'First name label',  k('label-first'),  'First name'),
      textML(c('labelInfix'),      'Infix label',       k('label-infix'),  'Infix'),
      textML(c('labelLastName'),   'Last name label',   k('label-last'),   'Last name'),
      textML(c('labelEmail'),      'Email label',       k('label-email'),  'Email'),
      textML(c('optIn1'),          'Terms opt-in',      k('optin1'),       'I agree to the <a href="/terms">terms and conditions</a>.'),
      textML(c('optIn2'),          'Newsletter opt-in', k('optin2'),       'Yes, I would like to receive news and offers.'),
      textML(c('successHeadline'), 'Success headline',  k('successh'),     'Thanks for registering!'),
      textML(c('successBody'),     'Success body',      k('successb'),     "We'll get in touch if you win."),
    ]),
    // PDFs are global (one terms / one privacy per campaign), kept at the
    // legacy `files.pdfs.*` namespace regardless of instance.
    block(blockKey('next-reg', TYPE, instanceId, 'files'), 'Files', [
      asset('files.pdfs.terms',   'Terms & conditions PDF', k('terms-pdf')),
      asset('files.pdfs.privacy', 'Privacy policy PDF',     k('privacy-pdf')),
    ]),
  ], true);
}

function nextVoucherTab(instanceId = 'voucher') {
  const TYPE = 'voucher';
  const c = (f) => `copy.${instanceId}.${f}`;
  const fp = (f) => `files.${instanceId}.${f}`;
  const k = (s) => fieldKey('next-voucher', TYPE, instanceId, s);
  return tab(tabKey('next-voucher', TYPE, instanceId), instanceTitle('Voucher', TYPE, instanceId), instanceId, [
    block(blockKey('next-voucher', TYPE, instanceId, 'assets'), 'Voucher assets', [
      asset(fp('voucherImage'), 'Voucher image',       k('image')),
      asset(fp('qrFrame'),      'QR frame (optional)', k('qrframe')),
    ]),
    block(blockKey('next-voucher', TYPE, instanceId, 'copy'), 'Copy', [
      textML(c('kicker'),      'Kicker',       k('kicker'),      'Reward'),
      textML(c('headline'),    'Headline',     k('headline'),    'Your voucher'),
      textML(c('subline'),     'Subline',      k('subline'),     'Scan the QR code at the register.'),
      textML(c('codeLabel'),   'Code label',   k('codelabel'),   'Code'),
      textML(c('expiryLabel'), 'Expiry label', k('expirylabel'), 'Valid until'),
      text(  c('expiryDate'),  'Expiry date',  k('expirydate'),  ''),
      textML(c('cta'),         'Done button',  k('cta'),         'Done'),
      textML(c('ctaShare'),    'Share button', k('ctashare'),    'Share'),
    ]),
  ], true);
}

// ── Known page types ──────────────────────────────────────────────────────────
//
// Every page type the format builder knows how to render a CAPE tab for. The
// `game` type is included even though it produces no tab (engine-driven UI),
// because the wizard legitimately puts it in the flow and we don't want it to
// trigger the "unknown type" warning. Keep this in sync with the switch in
// buildNextCapeFormat below AND with ALL_PAGES in cli/wizard-ui/src/shared/config.ts.

const VIDEO_PAGE_IDS = new Set(['video', 'intro-video', 'loading-video', 'ad-video']);

export const KNOWN_PAGE_TYPES = new Set([
  'video', 'intro-video', 'loading-video', 'ad-video',
  'landing', 'onboarding', 'result',
  'leaderboard', 'register', 'voucher', 'game',
]);

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Build a complete Cape format (interfaceSetup + publishProfiles) for a
 * Next.js project.
 *
 * Tabs always included: Settings (branding, meta, legal, header, desktop,
 * integrations), Header & brand assets, Desktop & loading, Menu.
 *
 * Tabs included when the page or module is selected: Landing, Onboarding,
 * Result, Video, Leaderboard, Registration, Voucher.
 *
 * @param {{ pages: string[], pageElementSelections: object, modules: string[] }} opts
 * @returns {{ publishProfiles: object, interfaceSetup: object }}
 */
export function buildNextCapeFormat({
  pages                 = [],
  instances             = null,
  pageTypes             = {},
  pageElementSelections = {},
  modules               = [],
  flowEnabledExits      = {},
  menuItemsEnabled      = {},
  iframe                = false,
}) {
  // Normalise to a list of instances so the rest of this function only
  // deals with one shape. New callers pass `instances` directly. Legacy
  // callers pass `pages: string[]` (treated as both id and type).
  const flow = Array.isArray(instances) && instances.length > 0
    ? instances
    : pages.map((p) => (typeof p === 'object' ? p : { id: p, type: pageTypes[p] ?? p }));

  const pageTabs = [];

  // Header — always one tab per campaign (logo, favicons, etc).
  pageTabs.push(nextHeaderTab());

  // Desktop — skip when iframe-embedded; the DesktopWrapper isn't rendered
  // and its CAPE fields would be dead weight in the editor.
  if (!iframe) pageTabs.push(nextDesktopTab());

  // Per-instance tabs. For each flow node, dispatch to the right tab
  // function with the INSTANCE id. Singletons (id === type) keep the legacy
  // shape so existing campaigns migrate cleanly; duplicates get their own
  // CAPE tab labelled "Type · id" with copy keys at copy.{instanceId}.*
  for (const inst of flow) {
    const type = VIDEO_PAGE_IDS.has(inst.id) ? 'video' : inst.id;
    const els = pageElementSelections[type] ?? [];
    switch (type) {
      case 'video':
        pageTabs.push(nextVideoTab(inst.id));
        break;
      case 'landing':
        pageTabs.push(nextLandingTab(inst.id, els, flowEnabledExits));
        break;
      case 'onboarding': {
        const stepCount = pageElementSelections[`${type}__stepCount`] ?? 3;
        pageTabs.push(nextOnboardingTab(inst.id, els, stepCount));
        break;
      }
      case 'result':
        pageTabs.push(nextResultTab(inst.id, els, flowEnabledExits, modules));
        break;
      case 'leaderboard':
        if (modules.includes('leaderboard'))  pageTabs.push(nextLeaderboardTab(inst.id));
        break;
      case 'register':
        if (modules.includes('registration')) pageTabs.push(nextRegistrationTab(inst.id));
        break;
      case 'voucher':
        if (modules.includes('voucher'))      pageTabs.push(nextVoucherTab(inst.id));
        break;
      case 'game':
        // game UI is engine-driven — intentionally no CAPE tab
        break;
      default:
        // An unknown type means the wizard sent something the builder can't
        // handle, OR a new page type was added to the wizard without wiring
        // it through here. Either way: surface it loudly so it doesn't
        // silently produce a CAPE format with missing tabs.
        console.warn(
          `[cape-format-builder] Unknown page type "${type}" (instance "${inst.id}") — no CAPE tab will be created for it. ` +
          `Add a case for it in buildNextCapeFormat or update KNOWN_PAGE_TYPES.`
        );
    }
  }

  // Menu tab — global (one per campaign). Skip entirely when every item is
  // off so CAPE editors aren't shown a tab full of dead headings.
  const anyMenuItem = Object.values(menuItemsEnabled).some(Boolean)
    || (Object.keys(menuItemsEnabled).length === 0); // empty defaults to true (legacy)
  if (anyMenuItem) pageTabs.push(nextMenuTab(menuItemsEnabled));

  const capePages = [settingsPage()];
  capePages.push(capePage('pages', 'Pages', 'next-pages-page', pageTabs, { showLanguageSelector: true }));
  capePages.push(publishPage());

  return {
    publishProfiles: {
      export: {
        title: 'Publish campaign',
        tasks: [{ customerFunction: 'publishGame', async: true }],
      },
    },
    interfaceSetup: { pages: capePages },
  };
}

/**
 * Build a complete Cape format (interfaceSetup + publishProfiles) for a
 * TanStack project. The Settings page is shared with Next, so Livewall
 * branding + fonts + legal flow identically across stacks.
 *
 * @param {{ pages: string[], tsPageElementSelections: object }} opts
 * @returns {{ publishProfiles: object, interfaceSetup: object }}
 */
export function buildTanStackCapeFormat({ pages, tsPageElementSelections = {} }) {
  const pageTabs = [];

  if (pages.includes('launch')) {
    const t = tsLaunchTab(tsPageElementSelections['launch'] ?? []);
    if (t) pageTabs.push(t);
  }
  if (pages.includes('tutorial')) {
    const stepCount = tsPageElementSelections['tutorial__stepCount'] ?? 3;
    const t = tsTutorialTab(tsPageElementSelections['tutorial'] ?? [], stepCount);
    if (t) pageTabs.push(t);
  }
  if (pages.includes('score')) {
    const t = tsScoreTab(tsPageElementSelections['score'] ?? []);
    if (t) pageTabs.push(t);
  }
  if (pages.includes('register')) {
    const t = tsRegisterTab(tsPageElementSelections['register'] ?? []);
    if (t) pageTabs.push(t);
  }
  pageTabs.push(tsDesktopTab());

  const capePages = [settingsPage()];
  if (pageTabs.length > 0) {
    capePages.push(capePage('pages', 'Pages', 'ts-pages-page', pageTabs, { showLanguageSelector: true }));
  }
  capePages.push(publishPage());

  return {
    publishProfiles: {
      export: {
        title: 'Publish game',
        tasks: [{ customerFunction: 'publishGame', async: true }],
      },
    },
    interfaceSetup: { pages: capePages },
  };
}
