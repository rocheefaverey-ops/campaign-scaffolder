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

const LW_LIME     = '#CDFF00';
const LW_INK      = '#0E0E0E';
const LW_SURFACE  = '#FAFAFA';
const LW_ERROR    = '#E82727';
const LW_FONT     = "'Inter', 'Segoe UI', Arial, sans-serif";

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

function color(model, label, key, defaultValue) {
  return inp('color', model, label, key, { picker: 'picker', defaultValue });
}

function asset(model, label, key) {
  return inp('assetSelector', model, label, key);
}

function bool(model, label, key, defaultValue) {
  return inp('boolean', model, label, key, { defaultValue });
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
        asset('settings.branding.fontBrand',        'Brand font file (optional)','settings-branding-fontbrand'),
        asset('settings.branding.fontLight',        'Light font file (optional)','settings-branding-fontlight'),
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
        bool('header.enabled',        'Show header globally',   'settings-header-enabled',   true),
        select('header.variant',      'Header variant',         'settings-header-variant',
          { default: 'Default (surface)', transparent: 'Transparent' }, 'default'),
        bool('header.showLogo',       'Show logo',              'settings-header-showlogo',  true),
        bool('header.showMenuButton', 'Show menu button',       'settings-header-showmenu',  true),
      ]),

      // ── Desktop wrapper (QR → mobile preview) ──────────────────────────────
      block('settings-desktop-block', 'Desktop wrapper', [
        bool('desktop.useDesktopWrapper', 'Use desktop QR wrapper', 'settings-desktop-enabled', true),
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
      asset('desktop.logo',                   'Desktop Logo',            'ts-desktop-logo'),
      asset('desktop.backgroundIllustration', 'Background illustration', 'ts-desktop-bg'),
    ]),
    block('ts-desktop-copy-block', 'Desktop', [
      textML('desktop.description', 'Description', 'ts-desktop-description', 'This experience is optimised for mobile. Scan the QR code with your phone.'),
      textML('desktop.qrText',      'QR Text',     'ts-desktop-qrtext',      'Scan to play on mobile'),
    ]),
    block('ts-loading-assets-block', 'Loading assets', [
      asset('files.video.loadingVideo', 'Loading / intro video', 'ts-loading-video'),
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
      asset('general.header.logo',      'Logo',            'next-header-logo'),
      asset('general.header.menuBtnBg', 'Menu button BG',  'next-header-menubtnbg'),
      asset('general.header.menuIcon',  'Menu icon',       'next-header-menuicon'),
    ]),
  ], false);
}

/**
 * Desktop wrapper, loading overlay, and the background video used across
 * loading / intro states.
 */
function nextDesktopTab() {
  return tab('next-desktop-tab', 'Desktop & Loading', 'desktop', [
    block('next-desktop-assets-block', 'Desktop assets', [
      asset('desktop.logo',                   'Desktop logo',            'next-desktop-logo'),
      asset('desktop.backgroundIllustration', 'Background illustration', 'next-desktop-bg'),
    ]),
    block('next-desktop-copy-block', 'Desktop copy', [
      textML('desktop.description', 'Description', 'next-desktop-description', 'This experience is optimised for mobile. Scan the QR code with your phone.'),
      textML('desktop.qrText',      'QR Text',     'next-desktop-qrtext',      'Scan to play on mobile'),
    ]),
    block('next-loading-assets-block', 'Loading assets', [
      asset('files.video.loadingVideo', 'Loading / intro video', 'next-loading-video'),
    ]),
    block('next-loading-copy-block', 'Loading copy', [
      textML('loading.title',        'Loading title',    'next-loading-title', 'Loading…'),
      textML('loading.description1', 'Loading line 1',   'next-loading-desc1', ''),
      textML('loading.description2', 'Loading line 2',   'next-loading-desc2', ''),
      textML('loading.description3', 'Loading line 3',   'next-loading-desc3', ''),
    ]),
  ], true);
}

/**
 * Landing — every asset and copy string the frontend reads:
 *   general.landing.background, general.landing.logo
 *   copy.landing.{kicker, headline, subline, cta, ctaSecondary}
 *   files.landing.{heroImage, heroVideo, backgroundImage}
 */
function nextLandingTab(els) {
  const items = [];
  if (els.includes('hero-bg'))       items.push(asset('general.landing.background', 'Background', 'next-landing-bg'));
  if (els.includes('logo'))          items.push(asset('general.landing.logo',       'Logo',       'next-landing-logo'));
  items.push(textML('copy.landing.kicker',   'Kicker (small label above headline)', 'next-landing-kicker',   'Live experience'));
  items.push(textML('copy.landing.headline', 'Headline',                            'next-landing-headline', 'Welcome'));
  items.push(textML('copy.landing.subline',  'Subline',                             'next-landing-subline',  'Are you ready to play?'));
  if (els.includes('cta-primary'))   items.push(textML('copy.landing.cta',          'Play button',          'next-landing-cta',    'Play now'));
  if (els.includes('cta-secondary')) items.push(textML('copy.landing.ctaSecondary', 'Secondary button',     'next-landing-cta2',   'How to play'));

  const blocks = [block('next-landing-copy-block', 'Copy', items.filter(i => i.type === 'textMultiLanguage'))];
  const assets = items.filter(i => i.type === 'assetSelector');
  if (assets.length) blocks.unshift(block('next-landing-assets-block', 'Assets', assets));

  blocks.push(block('next-landing-files-block', 'Hero media (optional)', [
    asset('files.landing.heroImage',       'Hero image',  'next-landing-heroimage'),
    asset('files.landing.heroVideo',       'Hero video',  'next-landing-herovideo'),
    asset('files.landing.backgroundImage', 'Background',  'next-landing-bgimage'),
  ]));

  return tab('next-landing-tab', 'Landing', 'landing', blocks, true);
}

/**
 * Onboarding — steps are multi-step, each has title + body.
 */
function nextOnboardingTab(els, stepCount) {
  const items = [];
  if (els.includes('hero-bg'))    items.push(asset('general.onboarding.background', 'Background', 'next-onboarding-bg'));
  if (els.includes('hero-image')) items.push(asset('general.onboarding.heroImage',  'Hero image', 'next-onboarding-hero'));

  const copyItems = [
    textML('copy.onboarding.kicker',   'Kicker',   'next-onboarding-kicker',   'How to play'),
    textML('copy.onboarding.headline', 'Headline', 'next-onboarding-headline', 'How to play'),
    textML('copy.onboarding.subline',  'Subline',  'next-onboarding-subline',  ''),
  ];
  if (els.includes('step-list')) {
    for (let i = 1; i <= stepCount; i++) {
      copyItems.push(
        textML(`copy.onboarding.step${i}Title`, `Step ${i} title`, `next-onboarding-step${i}-title`, `Step ${i}`),
        textML(`copy.onboarding.step${i}Body`,  `Step ${i} body`,  `next-onboarding-step${i}-body`,  `Instructions for step ${i}.`),
      );
    }
  }
  copyItems.push(textML('copy.onboarding.cta', "Let's go button", 'next-onboarding-cta', "Let's go"));

  const blocks = [];
  const stepAssets = [];
  if (els.includes('step-list')) {
    for (let i = 1; i <= stepCount; i++) {
      stepAssets.push(asset(`files.onboarding.step${i}Image`, `Step ${i} image`, `next-onboarding-step${i}-image`));
    }
  }
  if (items.length)      blocks.push(block('next-onboarding-assets-block', 'Assets', items));
  blocks.push(block('next-onboarding-copy-block', 'Copy', copyItems));
  if (stepAssets.length) blocks.push(block('next-onboarding-step-assets-block', 'Step images', stepAssets));

  return tab('next-onboarding-tab', 'Onboarding', 'onboarding', blocks, true);
}

/**
 * Result — win/lose screen. Covers all four CTAs the result page may render.
 */
function nextResultTab(els) {
  const copyItems = [
    textML('copy.result.kicker',         'Kicker',              'next-result-kicker',         'Result'),
    textML('copy.result.headline',       'Headline',            'next-result-headline',       'Game over'),
    textML('copy.result.subline',        'Subline',             'next-result-subline',        ''),
    textML('copy.result.scoreLabel',     'Score label',         'next-result-scorelabel',     'Your score'),
    textML('copy.result.rankLabel',      'Rank label',          'next-result-ranklabel',      'Your rank'),
    textML('copy.result.ctaContinue',    'Continue button',     'next-result-ctacontinue',    'Continue'),
    textML('copy.result.ctaPlayAgain',   'Play again button',   'next-result-ctaplayagain',   'Play again'),
    textML('copy.result.ctaLeaderboard', 'Leaderboard button',  'next-result-ctaleaderboard', 'View leaderboard'),
    textML('copy.result.ctaRegister',    'Register button',     'next-result-ctaregister',    'Register for the prize'),
  ];

  const assetItems = [];
  if (els.includes('hero-bg')) assetItems.push(asset('general.result.background', 'Background', 'next-result-bg'));
  assetItems.push(asset('files.result.winImage',  'Win image',  'next-result-winimage'));
  assetItems.push(asset('files.result.loseImage', 'Lose image', 'next-result-loseimage'));

  return tab('next-result-tab', 'Result', 'result', [
    block('next-result-assets-block', 'Assets', assetItems),
    block('next-result-copy-block',   'Copy',   copyItems),
  ], true);
}

/**
 * Menu — all four nav labels the menu page renders.
 */
function nextMenuTab(_els) {
  return tab('next-menu-tab', 'Menu', 'menu', [
    block('next-menu-copy-block', 'Menu copy', [
      textML('copy.menu.headline',  'Menu headline', 'next-menu-headline',  'Menu'),
      textML('copy.menu.home',      'Home',          'next-menu-home',      'Home'),
      textML('copy.menu.resume',    'Resume',        'next-menu-resume',    'Resume'),
      textML('copy.menu.howToPlay', 'How to play',   'next-menu-howtoplay', 'How to play'),
      textML('copy.menu.terms',     'Terms',         'next-menu-terms',     'Terms & conditions'),
    ]),
  ], true);
}

/** Full-screen interstitial video (the `video` page / module). */
function nextVideoTab() {
  return tab('next-video-tab', 'Video', 'video', [
    block('next-video-assets-block', 'Video file', [
      asset('general.video.introVideo', 'Intro video', 'next-video-introvideo'),
    ]),
    block('next-video-copy-block', 'Copy', [
      textML('copy.video.headline', 'Headline', 'next-video-headline', 'Watch this'),
      textML('copy.video.subline',  'Subline',  'next-video-subline',  ''),
      textML('copy.video.cta',      'CTA',      'next-video-cta',      'Continue'),
    ]),
  ], true);
}

// ── Module tabs ───────────────────────────────────────────────────────────────

function nextLeaderboardTab() {
  return tab('next-leaderboard-tab', 'Leaderboard', 'leaderboard', [
    block('next-leaderboard-copy-block', 'Copy', [
      textML('copy.leaderboard.kicker',     'Kicker',            'next-leaderboard-kicker',     'Ranking'),
      textML('copy.leaderboard.headline',   'Headline',          'next-leaderboard-headline',   'Leaderboard'),
      textML('copy.leaderboard.subline',    'Subline',           'next-leaderboard-subline',    ''),
      textML('copy.leaderboard.tabTotal',   'Tab — All time',    'next-leaderboard-tabtotal',   'All Time'),
      textML('copy.leaderboard.tabDaily',   'Tab — Daily',       'next-leaderboard-tabdaily',   'Daily'),
      textML('copy.leaderboard.tabWeekly',  'Tab — Weekly',      'next-leaderboard-tabweekly',  'Weekly'),
      textML('copy.leaderboard.tabMonthly', 'Tab — Monthly',     'next-leaderboard-tabmonthly', 'Monthly'),
      textML('copy.leaderboard.rankLabel',  'Rank column label', 'next-leaderboard-ranklabel',  '#'),
      textML('copy.leaderboard.nameLabel',  'Name column label', 'next-leaderboard-namelabel',  'Name'),
      textML('copy.leaderboard.scoreLabel', 'Score column label','next-leaderboard-scorelabel', 'Score'),
      textML('copy.leaderboard.youLabel',   '"You" label',       'next-leaderboard-youlabel',   'You'),
      textML('copy.leaderboard.emptyState', 'Empty state',       'next-leaderboard-empty',      'No scores yet.'),
      textML('copy.leaderboard.ctaDone',    'Done button',       'next-leaderboard-ctadone',    'Done'),
    ]),
  ], true);
}

function nextRegistrationTab() {
  return tab('next-registration-tab', 'Registration', 'registration', [
    block('next-reg-copy-block', 'Copy', [
      textML('copy.register.headline',        'Headline',           'next-reg-headline',     'Register'),
      textML('copy.register.subline',         'Subline',            'next-reg-subline',      'Enter your details to enter.'),
      textML('copy.register.cta',             'Submit button',      'next-reg-cta',          'Submit'),
      textML('copy.register.labelFirstName',  'First name label',   'next-reg-label-first',  'First name'),
      textML('copy.register.labelInfix',      'Infix label',        'next-reg-label-infix',  'Infix'),
      textML('copy.register.labelLastName',   'Last name label',    'next-reg-label-last',   'Last name'),
      textML('copy.register.labelEmail',      'Email label',        'next-reg-label-email',  'Email'),
      textML('copy.register.optIn1',          'Terms opt-in',       'next-reg-optin1',       'I agree to the <a href="/terms">terms and conditions</a>.'),
      textML('copy.register.optIn2',          'Newsletter opt-in',  'next-reg-optin2',       'Yes, I would like to receive news and offers.'),
      textML('copy.register.successHeadline', 'Success headline',   'next-reg-successh',     'Thanks for registering!'),
      textML('copy.register.successBody',     'Success body',       'next-reg-successb',     "We'll get in touch if you win."),
    ]),
    block('next-reg-files-block', 'Files', [
      asset('files.pdfs.terms',   'Terms & conditions PDF', 'next-reg-terms-pdf'),
      asset('files.pdfs.privacy', 'Privacy policy PDF',     'next-reg-privacy-pdf'),
    ]),
  ], true);
}

function nextVoucherTab() {
  return tab('next-voucher-tab', 'Voucher', 'voucher', [
    block('next-voucher-assets-block', 'Voucher assets', [
      asset('files.voucher.voucherImage', 'Voucher image',           'next-voucher-image'),
      asset('files.voucher.qrFrame',      'QR frame (optional)',     'next-voucher-qrframe'),
    ]),
    block('next-voucher-copy-block', 'Copy', [
      textML('copy.voucher.kicker',      'Kicker',             'next-voucher-kicker',      'Reward'),
      textML('copy.voucher.headline',    'Headline',           'next-voucher-headline',    'Your voucher'),
      textML('copy.voucher.subline',     'Subline',            'next-voucher-subline',     'Scan the QR code at the register.'),
      textML('copy.voucher.codeLabel',   'Code label',         'next-voucher-codelabel',   'Code'),
      textML('copy.voucher.expiryLabel', 'Expiry label',       'next-voucher-expirylabel', 'Valid until'),
      text(  'copy.voucher.expiryDate',  'Expiry date',        'next-voucher-expirydate',  ''),
      textML('copy.voucher.cta',         'Done button',        'next-voucher-cta',         'Done'),
      textML('copy.voucher.ctaShare',    'Share button',       'next-voucher-ctashare',    'Share'),
    ]),
  ], true);
}

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
export function buildNextCapeFormat({ pages, pageElementSelections = {}, modules = [] }) {
  const pageTabs = [];

  // Always included (every campaign has these surfaces)
  pageTabs.push(nextHeaderTab());
  pageTabs.push(nextDesktopTab());

  if (modules.includes('video') || pages.includes('video')) {
    pageTabs.push(nextVideoTab());
  }

  // Page-specific tabs
  if (pages.includes('landing')) {
    const t = nextLandingTab(pageElementSelections['landing'] ?? []);
    if (t) pageTabs.push(t);
  }
  if (pages.includes('onboarding')) {
    const stepCount = pageElementSelections['onboarding__stepCount'] ?? 3;
    const t = nextOnboardingTab(pageElementSelections['onboarding'] ?? [], stepCount);
    if (t) pageTabs.push(t);
  }
  if (pages.includes('result')) {
    const t = nextResultTab(pageElementSelections['result'] ?? []);
    if (t) pageTabs.push(t);
  }
  pageTabs.push(nextMenuTab(pageElementSelections['menu'] ?? []));

  // Module-specific tabs
  if (modules.includes('leaderboard'))  pageTabs.push(nextLeaderboardTab());
  if (modules.includes('registration')) pageTabs.push(nextRegistrationTab());
  if (modules.includes('voucher'))      pageTabs.push(nextVoucherTab());

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
