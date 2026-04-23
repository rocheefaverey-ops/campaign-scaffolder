/**
 * cli/cape-format-builder.js
 *
 * Builds a dynamic Cape interfaceSetup + publishProfiles from scaffold
 * selections. Only includes tabs and fields for the pages/elements that
 * were actually chosen — giving each project its own minimal Cape format.
 *
 * Usage:
 *   import { buildTanStackCapeFormat } from './cape-format-builder.js';
 *   const format = buildTanStackCapeFormat({ pages, tsPageElementSelections });
 */

// ── Field builders ─────────────────────────────────────────────────────────────

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

function langSelector(model, label, key, defaultValue) {
  return inp('languageSelector', model, label, key, { defaultValue });
}

// ── Structure builders ─────────────────────────────────────────────────────────

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

function settingsPage() {
  return capePage('settings', 'Settings', 'settings-page', [
    tab('settings-general-tab', 'General', 'general', [
      block('settings-languages-block', 'Languages', [
        langSelector('settings.languages', 'Languages', 'settings-languages', { NL: 'NL - Dutch', EN: 'EN - English' }),
      ]),
      block('settings-branding-block', 'Branding', [
        asset('settings.branding.favicon', 'Favicon', 'settings-branding-favicon'),
        color('settings.branding.themeColor',     'Theme Color',            'settings-branding-themecolor',  '#000000'),
        color('settings.branding.primaryColor',   'Primary Color (CTAs)',   'settings-branding-primarycolor','#C4FF00'),
        color('settings.branding.backgroundColor','Background Color',       'settings-branding-bgcolor',     '#FFFFFF'),
        color('settings.branding.textColor',      'Text Color',             'settings-branding-textcolor',   '#000000'),
        color('settings.branding.accentColor',    'Accent Color',           'settings-branding-accentcolor', '#C4FF00'),
      ]),
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

// ── TanStack page tabs ─────────────────────────────────────────────────────────

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
    block('ts-desktop-assets-block', 'Assets', [
      asset('desktop.logo', 'Desktop Logo', 'ts-desktop-logo'),
    ]),
    block('ts-desktop-copy-block', 'Desktop', [
      textML('desktop.description', 'Description', 'ts-desktop-description', 'This experience is optimised for mobile. Scan the QR code with your phone.'),
      textML('desktop.qrText',      'QR Text',     'ts-desktop-qrtext',      'Scan to play on mobile'),
    ]),
    block('ts-loading-copy-block', 'Loading', [
      textML('loading.title',        'Title',         'ts-loading-title', 'Loading…'),
      textML('loading.description1', 'Description 1', 'ts-loading-desc1', 'Preparing the game…'),
      textML('loading.description2', 'Description 2', 'ts-loading-desc2', 'Almost there…'),
      textML('loading.description3', 'Description 3', 'ts-loading-desc3', 'Ready to play!'),
    ]),
  ], true);
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Build a complete Cape format (interfaceSetup + publishProfiles) for a
 * TanStack project, including only fields relevant to the selected pages
 * and elements.
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
