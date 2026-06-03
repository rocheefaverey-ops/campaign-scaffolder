export const GAME_ENGINES = ['unity', 'r3f', 'phaser', 'memory', 'video', 'pure-react'];

export const ALL_PAGES = ['loading', 'landing', 'intro-video', 'tutorial', 'howto-play', 'loading-video', 'game', 'result', 'ad-video', 'register', 'leaderboard', 'voucher', 'end', 'menu'];
export const VIDEO_PAGE_IDS = new Set(['video', 'intro-video', 'loading-video', 'ad-video']);
export const EXPLICIT_VIDEO_PAGES = ['intro-video', 'loading-video', 'ad-video'];

export const VALID_MARKETS = new Set(['NL', 'BE', 'FR', 'DE', 'UK', 'ES', 'IT', 'PL', 'AT', 'CH', 'LU', 'DK', 'SE', 'NO', 'FI']);

export const RESERVED_NAMES = new Set([
  'next',
  'app',
  'api',
  'src',
  'public',
  'node_modules',
  'build',
  'dist',
  'test',
  'tests',
  'frontend',
  'backend',
  'scaffolder',
  'campaign-scaffolder',
  'livewall',
]);

export const PAGE_ROUTES = {
  landing: '/landing',
  loading: '/loading',
  video: '/video',
  'intro-video': '/intro-video',
  'loading-video': '/loading-video',
  'ad-video': '/ad-video',
  tutorial: '/tutorial',
  'howto-play': '/howto-play',
  register: '/register',
  game: '/gameplay',
  result: '/result',
  leaderboard: '/leaderboard',
  voucher: '/voucher',
  end: '/end',
  menu: '/menu',
};

export const LOCAL_WIZARD_PAGE_SETTINGS = new Set(['onboardingFirstRunOnly']);

/**
 * Mirror of buildCapeLanguagesMap in cli/wizard-ui/src/shared/config.ts.
 * Builds the CAPE-shaped languages map: { "EN": "EN - English", ... }.
 */
export const ISO_LANGUAGE_NAMES = {
  EN: 'English', NL: 'Dutch', 'NL-BE': 'Flemish', DE: 'German', 'DE-AT': 'Austrian German',
  'DE-CH': 'Swiss German', FR: 'French', 'FR-BE': 'French (Belgium)', 'FR-CH': 'French (Switzerland)',
  IT: 'Italian', ES: 'Spanish', PT: 'Portuguese', 'PT-BR': 'Portuguese (Brazil)', GA: 'Irish',
  SV: 'Swedish', NO: 'Norwegian', DA: 'Danish', FI: 'Finnish', IS: 'Icelandic',
  PL: 'Polish', CS: 'Czech', SK: 'Slovak', HU: 'Hungarian', RO: 'Romanian', BG: 'Bulgarian',
  HR: 'Croatian', SR: 'Serbian', SL: 'Slovenian', EL: 'Greek', RU: 'Russian', UK: 'Ukrainian',
  TR: 'Turkish', ET: 'Estonian', LV: 'Latvian', LT: 'Lithuanian',
  ZH: 'Chinese', 'ZH-TW': 'Chinese (Traditional)', JA: 'Japanese', KO: 'Korean',
  VI: 'Vietnamese', TH: 'Thai', ID: 'Indonesian', MS: 'Malay', HI: 'Hindi', BN: 'Bengali',
  AR: 'Arabic', HE: 'Hebrew', FA: 'Persian', SW: 'Swahili',
};

export function buildLanguagesMap(codes) {
  const out = {};
  for (const code of codes) {
    out[code] = `${code} - ${ISO_LANGUAGE_NAMES[code] ?? code}`;
  }
  return out;
}

export function basePageType(pageId) {
  return String(pageId);
}

export function pageModuleType(pageId) {
  return VIDEO_PAGE_IDS.has(pageId) ? 'video' : String(pageId);
}

export function routeFor(pageId, routeMap = {}) {
  const key = String(pageId);
  const hyphenKey = key.replace(/_/g, '-');
  const underscoreKey = key.replace(/-/g, '_');
  return routeMap[key] ?? routeMap[hyphenKey] ?? routeMap[underscoreKey] ?? PAGE_ROUTES[key] ?? PAGE_ROUTES[hyphenKey] ?? `/${hyphenKey}`;
}

export function inferPageTypes(_pages) {
  return {};
}

export function buildDefaultPages(game) {
  const pages = ['landing', 'tutorial'];
  if (game && game !== 'video') pages.push('game', 'result');
  if (game === 'video') pages.push('intro-video');
  return pages;
}

export function landingOnboardingFirstRunOnly(wizardMeta) {
  const raw = wizardMeta?.pageSettings?.landing?.onboardingFirstRunOnly;
  return typeof raw === 'boolean' ? raw : true;
}
