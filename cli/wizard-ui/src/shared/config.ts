/**
 * Shared scaffolder config — the single contract between:
 *   - the wizard UI (writes it),
 *   - the wizard server (validates it),
 *   - cli/scaffold.js --config=<file> (consumes it).
 *
 * Keep this file pure types + small helpers. No browser-only APIs.
 */

export type Stack  = 'next' | 'tanstack';
export type Engine = 'unity' | 'r3f' | 'phaser' | 'memory' | 'none';
export type Market = 'NL' | 'BE' | 'FR' | 'DE';
export type RegMode = 'none' | 'gate' | 'after';
export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'dark' | 'danger';
/**
 * How the wizard's Build step applies the config:
 *
 *   create   - Default. Fail if outputDir already exists.
 *   update   - In-place rewrite of outputDir; preserves git history. Module
 *              files + tokens are re-applied; manual edits to user code stay
 *              as a git diff the dev can keep or revert.
 *   recreate - Delete outputDir first, then a fresh `create`. Destructive.
 */
export type BuildMode = 'create' | 'update' | 'recreate';
export type FlowRuleMode =
  | 'always'
  | 'once-per-browser'
  | 'skip-if-registered'
  | 'voucher-required'
  | 'voucher-once';

export interface LanguageOption { code: string; label: string; group?: string }
/**
 * Mirrors CAPE's `languageSelector` codes (upper-case ISO 639-1, with a few
 * BCP-47-style regional variants where Livewall actually runs split markets
 * — Flemish vs Walloon Belgium, Austrian vs German German, etc).
 *
 * Grouped for the wizard UI; ungrouped fields default to "Other".
 */
export const LANGUAGES: LanguageOption[] = [
  // Western Europe
  { code: 'EN',    label: 'English',           group: 'Western Europe' },
  { code: 'NL',    label: 'Nederlands',        group: 'Western Europe' },
  { code: 'NL-BE', label: 'Vlaams (NL-BE)',    group: 'Western Europe' },
  { code: 'DE',    label: 'Deutsch',           group: 'Western Europe' },
  { code: 'DE-AT', label: 'Österreichisch',    group: 'Western Europe' },
  { code: 'DE-CH', label: 'Schweizerdeutsch',  group: 'Western Europe' },
  { code: 'FR',    label: 'Français',          group: 'Western Europe' },
  { code: 'FR-BE', label: 'Français (BE)',     group: 'Western Europe' },
  { code: 'FR-CH', label: 'Français (CH)',     group: 'Western Europe' },
  { code: 'IT',    label: 'Italiano',          group: 'Western Europe' },
  { code: 'ES',    label: 'Español',           group: 'Western Europe' },
  { code: 'PT',    label: 'Português',         group: 'Western Europe' },
  { code: 'PT-BR', label: 'Português (BR)',    group: 'Western Europe' },
  { code: 'GA',    label: 'Gaeilge',           group: 'Western Europe' },

  // Northern Europe
  { code: 'SV', label: 'Svenska',  group: 'Northern Europe' },
  { code: 'NO', label: 'Norsk',    group: 'Northern Europe' },
  { code: 'DA', label: 'Dansk',    group: 'Northern Europe' },
  { code: 'FI', label: 'Suomi',    group: 'Northern Europe' },
  { code: 'IS', label: 'Íslenska', group: 'Northern Europe' },

  // Central & Eastern Europe
  { code: 'PL', label: 'Polski',     group: 'Central & Eastern Europe' },
  { code: 'CS', label: 'Čeština',    group: 'Central & Eastern Europe' },
  { code: 'SK', label: 'Slovenčina', group: 'Central & Eastern Europe' },
  { code: 'HU', label: 'Magyar',     group: 'Central & Eastern Europe' },
  { code: 'RO', label: 'Română',     group: 'Central & Eastern Europe' },
  { code: 'BG', label: 'Български',  group: 'Central & Eastern Europe' },
  { code: 'HR', label: 'Hrvatski',   group: 'Central & Eastern Europe' },
  { code: 'SR', label: 'Српски',     group: 'Central & Eastern Europe' },
  { code: 'SL', label: 'Slovenščina',group: 'Central & Eastern Europe' },
  { code: 'EL', label: 'Ελληνικά',   group: 'Central & Eastern Europe' },
  { code: 'RU', label: 'Русский',    group: 'Central & Eastern Europe' },
  { code: 'UK', label: 'Українська', group: 'Central & Eastern Europe' },
  { code: 'TR', label: 'Türkçe',     group: 'Central & Eastern Europe' },
  { code: 'ET', label: 'Eesti',      group: 'Central & Eastern Europe' },
  { code: 'LV', label: 'Latviešu',   group: 'Central & Eastern Europe' },
  { code: 'LT', label: 'Lietuvių',   group: 'Central & Eastern Europe' },

  // Asia
  { code: 'ZH',    label: '中文 (简)',      group: 'Asia' },
  { code: 'ZH-TW', label: '中文 (繁)',      group: 'Asia' },
  { code: 'JA',    label: '日本語',         group: 'Asia' },
  { code: 'KO',    label: '한국어',         group: 'Asia' },
  { code: 'VI',    label: 'Tiếng Việt',    group: 'Asia' },
  { code: 'TH',    label: 'ไทย',           group: 'Asia' },
  { code: 'ID',    label: 'Bahasa Indo.',  group: 'Asia' },
  { code: 'MS',    label: 'Bahasa Melayu', group: 'Asia' },
  { code: 'HI',    label: 'हिन्दी',          group: 'Asia' },
  { code: 'BN',    label: 'বাংলা',          group: 'Asia' },

  // Middle East / Africa
  { code: 'AR', label: 'العربية',  group: 'Middle East / Africa' },
  { code: 'HE', label: 'עברית',    group: 'Middle East / Africa' },
  { code: 'FA', label: 'فارسی',    group: 'Middle East / Africa' },
  { code: 'SW', label: 'Kiswahili',group: 'Middle East / Africa' },
];

/**
 * Build the CAPE-shaped languages map: `{ "NL": "NL - Dutch", "EN": "EN - English" }`.
 * Uses ISO English names for the labels (CAPE's convention) rather than native scripts.
 */
const ISO_ENGLISH_NAMES: Record<string, string> = {
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

export function buildCapeLanguagesMap(codes: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const code of codes) {
    const name = ISO_ENGLISH_NAMES[code] ?? code;
    out[code] = `${code} - ${name}`;
  }
  return out;
}

/** Shared shape every step component receives. */
export interface StepProps {
  config:    ScaffoldConfig;
  setConfig: (next: ScaffoldConfig) => void;
  goToStep:  (id: string) => void;
}

export interface ScaffoldConfig {
  stack:        Stack;
  game:         Engine;
  /** Selected game configuration from games/ folder. */
  gameId?:      string;
  name:         string;
  /** When true, a fresh CAPE campaign is created and capeId is ignored. */
  createCape:   boolean;
  /** Optional title override for the new CAPE campaign (createCape only). */
  capeTitle?:   string;
  /** Required when createCape is false. */
  capeId:       string;
  market:       Market;
  /**
   * Frontend-only "starting language" — used for `<html lang>` + NEXT_PUBLIC_CAPE_LANGUAGE.
   * Real CAPE has no separate "default" concept; supportedLanguages is the source of truth
   * and which one renders is decided by the user/browser.
   */
  defaultLanguage: string;
  /**
   * Codes for the languages the campaign supports. Mapped into CAPE as
   * `settings.languages: { CODE: "CODE - Label" }` to match the real export shape.
   */
  supportedLanguages: string[];
  /** IANA timezone (e.g. "Europe/Brussels"). Stored at settings.timezone. */
  timezone:     string;
  /** Free-form brand name. Stored at settings.brand. */
  brand:        string;
  /** Free-form department / business unit. Stored at settings.department. */
  department:   string;
  pages:        PageInstance[];
  regMode:      RegMode;
  modules:      string[];
  gtmId:        string;
  iframe:       boolean;
  outputDir?:   string;
  /** Per-page CAPE settings (settings.pages.{pageId}.{key} = value). */
  pageSettings: PageSettings;
  /** Per-page block editor state. Keyed by page instance id. */
  pageBlocks?: PageBlocksMap;
  /**
   * Per-exit destination overrides, keyed by `{pageId}.{exitKey}` → target page id.
   * Empty/missing means "use default rule" (next-in-flow / first-in-flow).
   * The wizard renders one dropdown per exit per FlowCard.
   */
  flowExits:    Record<string, string>;
  /** Optional override for the entry page id (FLOW_ENTRY). Empty = first-in-flow. */
  flowEntry?:   string;
  /**
   * Per-optional-exit enabled state, keyed by `{pageId}.{exitKey}` → boolean.
   * Required exits are always rendered; optional exits only render when this
   * map (or the exit's `defaultEnabled` flag if missing) resolves to true.
   * Persisted to CAPE as `settings.pages.{pageId}.{capeFlag} = boolean`.
   */
  flowEnabledExits: Record<string, boolean>;
  flowButtonVariants: Record<string, ButtonVariant>;
  /**
   * Per-page runtime behavior, keyed by page instance id. Routing answers
   * where a button goes; this answers whether the page should be shown at
   * all for the current visitor.
   */
  flowRules: Record<string, PageFlowRule>;
  /**
   * Per-menu-item visibility, keyed by item id (see MENU_ITEMS). Persisted
   * to CAPE as `settings.menu.show{Id}`. The /menu route reads these flags
   * and renders only the enabled items.
   */
  menuItemsEnabled: Record<string, boolean>;
  menuButtonVariants: Record<string, ButtonVariant>;
  /**
   * How Build applies this config. 'create' for fresh scaffolds; 'update' or
   * 'recreate' only available when the wizard was populated from an existing
   * project via "Open existing". UI-only — not persisted to .scaffolded.
   */
  buildMode:    BuildMode;
  /**
   * Where the wizard was loaded from (if it was). Survives mode changes so
   * switching to "fresh copy" and back to "update" still remembers the path.
   * UI-only.
   */
  loadedProjectDir?: string;
  /**
   * When true, the wizard spawns `pnpm dev` on the scaffolded project after
   * a successful build and opens the resulting URL in a new tab. UI-only;
   * never persisted to `.scaffolded`.
   */
  autoRunAfterBuild?: boolean;
}

// ─── Per-page settings ──────────────────────────────────────────────────────

export type SettingValue = string | number | boolean;
export type PageSettings = Record<string, Record<string, SettingValue>>;
export type BlockSetting = string | number | boolean | BlockSetting[] | { [key: string]: BlockSetting };
export type PageBlockConfig = {
  enabled: boolean;
  settings: Record<string, BlockSetting>;
};
export type PageBlocksConfig = {
  blocks: Record<string, PageBlockConfig>;
  blockOrder?: string[];
};
export type PageBlocksMap = Record<string, PageBlocksConfig>;

function block(enabled: boolean, settings: Record<string, BlockSetting> = {}): PageBlockConfig {
  return { enabled, settings };
}

function page(blocks: Record<string, PageBlockConfig>, blockOrder = Object.keys(blocks)): PageBlocksConfig {
  return { blocks, blockOrder };
}

export const DEFAULT_BLOCKS_BY_PAGE: Record<string, PageBlocksConfig> = {
  loading: page({
    background: block(true, { kind: 'video' }),
    'centered-art': block(true, { size: 'md' }),
    'brand-chip': block(true, { size: 'md' }),
    tagline: block(true),
    'loading-indicator': block(false, { kind: 'ring', minDisplayMs: 800 }),
  }),
  landing: page({
    background: block(true, { kind: 'image' }),
    'header-chrome': block(true, { leftSlot: 'menu', rightSlot: 'help', leftSlotTarget: '', rightSlotTarget: 'tutorial' }),
    'brand-chip': block(true, { size: 'md', slot: 'header' }),
    'title-block': block(true, { showKicker: false, showSubtitle: true }),
    'cta-group': block(true, { buttons: [{ variant: 'primary', exit: 'tutorial' }] }),
    'footer-link-list': block(false),
    'compliance-badge': block(false, { kind: '18+' }),
    'pre-gate-modal': block(false, { kind: 'age-18', persistAcrossSession: true }),
  }),
  tutorial: page({
    background: block(true, { kind: 'image' }),
    'header-chrome': block(true, { leftSlot: 'back', rightSlot: 'close', rightSlotTarget: 'landing' }),
    'brand-chip': block(true, { size: 'md', slot: 'header' }),
    'centered-art': block(true, { size: 'md' }),
    'title-block': block(true, { showKicker: false, showSubtitle: true }),
    'body-copy': block(true, { markdown: true }),
    'step-indicator': block(true, { count: 3, style: 'dots' }),
    'nav-controls': block(true, { showPrev: false, nextExit: 'loading-video' }),
    'compliance-badge': block(false, { kind: '18+' }),
  }),
  // Entry loading video — content-driven, NOT a skippable ad interlude (no
  // close button, no skip timer). Advance is load-driven and per-stack (see
  // builders). Kept in sync with block-defaults.js DEFAULT_PAGE_BLOCKS.
  'intro-video': page({
    background: block(true, { kind: 'solid' }),
    'video-player': block(true, { muted: true, loop: false, onEnd: 'auto-advance' }),
    'fallback-indicator': block(false),
  }),
  'loading-video': page({
    background: block(true, { kind: 'solid' }),
    'header-chrome': block(false, { leftSlot: 'none', rightSlot: 'none' }),
    'brand-chip': block(false, { size: 'sm' }),
    'video-player': block(true, { muted: true, loop: true, onEnd: 'wait-for-engine', availableAfterMs: 0 }),
    'fallback-indicator': block(false),
  }),
  'ad-video': page({
    background: block(true, { kind: 'solid' }),
    'header-chrome': block(true, { leftSlot: 'none', rightSlot: 'close' }),
    'brand-chip': block(false, { size: 'sm' }),
    'video-player': block(true, { muted: true, loop: false, onEnd: 'auto-advance', availableAfterMs: 3000 }),
    'skip-control': block(true, { availableAfterMs: 3000, exit: 'voucher' }),
    'reveal-cta': block(false, { exit: 'voucher', variant: 'primary' }),
    'fallback-indicator': block(false),
  }),
  game: page({
    background: block(true, { kind: 'solid' }),
    'header-chrome': block(false, { leftSlot: 'none', rightSlot: 'none' }),
    'audio-toggle': block(true),
    'pause-toggle': block(true),
    timer: block(true, { mode: 'countdown', durationSec: 60 }),
    'score-readout': block(false, { showHighScore: false }),
    'sponsor-footer-strip': block(false),
    'pause-overlay': block(true, { showRestart: true, showHowToPlay: true }),
  }),
  result: page({
    background: block(true, { kind: 'image' }),
    'header-chrome': block(true, { leftSlot: 'menu', rightSlot: 'none', leftSlotTarget: 'menu' }),
    'brand-chip': block(true, { size: 'md', slot: 'header' }),
    'title-block': block(true, { showKicker: true, showSubtitle: true }),
    'body-copy': block(true, { markdown: true }),
    'score-readout': block(true, { showHighScore: true }),
    'score-illustration': block(true, { position: 'above-title' }),
    'stats-table': block(false, { count: 3, rows: [{ label: 'Score', value: 'score' }, { label: 'Rank', value: 'rank' }, { label: 'Best', value: 'highScore' }] }),
    'status-chip': block(false, { kind: 'registered' }),
    'cta-group': block(true, { buttons: [{ variant: 'primary', exit: 'register' }], registeredButtons: [{ variant: 'secondary', exit: 'landing' }, { variant: 'tertiary', exit: 'leaderboard' }, { variant: 'primary', exit: 'game' }] }),
    'compliance-badge': block(false, { kind: '18+' }),
    'footer-link-list': block(false),
  }),
  leaderboard: page({
    background: block(true, { kind: 'image' }),
    'header-chrome': block(true, { leftSlot: 'back', rightSlot: 'menu', rightSlotTarget: 'menu' }),
    'brand-chip': block(true, { size: 'md', slot: 'header' }),
    'title-block': block(true, { showKicker: true, showSubtitle: true }),
    'leaderboard-tabs': block(true, { tabs: ['all', 'daily', 'weekly'], defaultTab: 'all' }),
    'rank-list': block(true, { rows: 10 }),
    'top-n-highlight': block(false, { count: 3 }),
    'personal-best-row': block(true),
    'cta-group': block(true, { buttons: [{ variant: 'primary', exit: 'game' }, { variant: 'secondary', exit: 'landing' }] }),
  }),
  register: page({
    background: block(true, { kind: 'image' }),
    'header-chrome': block(true, { leftSlot: 'back', rightSlot: 'close', rightSlotTarget: 'landing' }),
    'brand-chip': block(true, { size: 'md' }),
    'card-wrapper': block(true, { style: 'card', cardWidth: 'with-margin' }),
    'title-block': block(true, { showKicker: false, showSubtitle: true }),
    'body-copy': block(true, { markdown: true }),
    'field-set': block(true, { fields: ['firstName', 'lastName', 'email'] }),
    'opt-in-list': block(true, { optIns: ['terms'] }),
    'cta-group': block(true, { buttons: [{ variant: 'primary', exit: 'voucher' }] }),
    'footer-link-list': block(true),
  }, ['header-chrome', 'background', 'brand-chip', 'card-wrapper', 'title-block', 'body-copy', 'field-set', 'opt-in-list', 'cta-group', 'footer-link-list']),
  voucher: page({
    background: block(true, { kind: 'image' }),
    'header-chrome': block(true, { leftSlot: 'menu', rightSlot: 'none', leftSlotTarget: 'menu' }),
    'brand-chip': block(true, { size: 'md', slot: 'header' }),
    'title-block': block(true, { showKicker: true, showSubtitle: false }),
    'body-copy': block(true, { markdown: true }),
    'channel-tabs': block(false, { tabs: ['webshop', 'in-store'], defaultTab: 'webshop' }),
    'code-box': block(true),
    'qr-display': block(true),
    'cta-group': block(true, { buttons: [{ variant: 'primary', exit: 'leaderboard' }] }),
    'compliance-badge': block(false, { kind: '18+' }),
    'footer-link-list': block(true),
  }),
  end: page({
    background: block(true, { kind: 'image' }),
    'header-chrome': block(true, { leftSlot: 'none', rightSlot: 'close' }),
    'brand-chip': block(true, { size: 'md' }),
    'title-block': block(true, { showKicker: true, showSubtitle: false }),
    'body-copy': block(true, { markdown: true }),
    'prize-illustration': block(true),
    'cta-group': block(true, { buttons: [{ variant: 'icon-only', exit: 'leaderboard' }, { variant: 'primary', exit: 'game' }] }),
    'compliance-badge': block(false, { kind: '18+' }),
    'footer-link-list': block(false),
  }),
  menu: page({
    background: block(true, { kind: 'image' }),
    'header-chrome': block(true, { leftSlot: 'back', rightSlot: 'none' }),
    'brand-chip': block(true, { size: 'md' }),
    'menu-item-list': block(true, {
      items: ['home', 'howToPlay', 'terms', 'privacy'],
      targets: {
        home: '/landing',
        resume: '/game',
        howToPlay: '/tutorial',
        leaderboard: '/leaderboard',
        voucher: '/voucher',
        terms: '#',
        privacy: '#',
        faq: '#',
        leave: '#',
      },
    }),
  }),
};

DEFAULT_BLOCKS_BY_PAGE.onboarding = DEFAULT_BLOCKS_BY_PAGE.tutorial;
DEFAULT_BLOCKS_BY_PAGE.video = DEFAULT_BLOCKS_BY_PAGE['intro-video'];

export const DEFAULT_LANDING_BLOCKS = DEFAULT_BLOCKS_BY_PAGE.landing;

export function blockLibraryPageType(type: string): string {
  if (type === 'tutorial') return 'onboarding';
  if (type === 'intro-video' || type === 'loading-video' || type === 'ad-video') return 'video';
  return type;
}

export function defaultBlocksForPage(pageType: string): PageBlocksConfig {
  const key = DEFAULT_BLOCKS_BY_PAGE[pageType] ? pageType : blockLibraryPageType(pageType);
  const source = DEFAULT_BLOCKS_BY_PAGE[key] ?? { blocks: {}, blockOrder: [] };
  return structuredClone(source);
}

export interface PageFlowRule {
  mode: FlowRuleMode;
  skipTo?: string;
}

export interface FlowRuleOption {
  value: FlowRuleMode;
  label: string;
  hint: string;
}

export const FLOW_RULE_OPTIONS: FlowRuleOption[] = [
  { value: 'always',             label: 'Always show',             hint: 'The page appears every time the route is reached.' },
  { value: 'once-per-browser',   label: 'Show once',               hint: 'After the visitor continues, future visits skip this page.' },
  { value: 'skip-if-registered', label: 'Skip after registration', hint: 'Registered visitors skip this page.' },
  { value: 'voucher-required',   label: 'Only with voucher',       hint: 'Skip when there is no voucher code available.' },
  { value: 'voucher-once',       label: 'Voucher once',            hint: 'Show only when a voucher exists and has not been viewed yet.' },
];

export const FLOW_RULES_BY_PAGE: Record<string, FlowRuleMode[]> = {
  loading:     ['always'],
  landing:     ['always'],
  tutorial:    ['always', 'once-per-browser'],
  register:    ['always', 'skip-if-registered'],
  game:        ['always'],
  result:      ['always'],
  voucher:     ['always', 'voucher-required', 'voucher-once'],
  leaderboard: ['always'],
  end:         ['always'],
  menu:        ['always'],
  'intro-video':   ['always', 'once-per-browser'],
  'loading-video': ['always'],
  'ad-video':      ['always', 'once-per-browser'],
};

export function defaultFlowRuleForType(type: string): PageFlowRule {
  switch (type) {
    case 'tutorial':
      return { mode: 'once-per-browser' };
    case 'register':
      return { mode: 'skip-if-registered' };
    case 'voucher':
      return { mode: 'voucher-once' };
    default:
      return { mode: 'always' };
  }
}

export function defaultFlowRulesForPages(pages: PageInstance[]): Record<string, PageFlowRule> {
  const out: Record<string, PageFlowRule> = {};
  for (const page of pages) out[page.id] = defaultFlowRuleForType(page.type);
  return out;
}

export interface SettingDef {
  key:      string;
  label:    string;
  hint?:    string;
  kind:     'select' | 'number' | 'boolean';
  default:  SettingValue;
  options?: Array<{ value: string; label: string }>;
  min?:     number;
  max?:     number;
  unit?:    string;
  showWhen?: Array<{ key: string; value: SettingValue }>;
}

/**
 * Per-page settings schema. Each entry describes the controls rendered in
 * the wizard's "Page settings" section, plus the values that get merged
 * into the scaffolded project's `settings.pages.{pageId}.*` block in CAPE.
 *
 * Status legend (in `hint`):
 *   ✓ = the page actually reads this value at runtime today
 *   ◌ = scheduled — value is persisted to CAPE but no page consumes it yet
 */
const VIDEO_PAGE_SETTINGS: SettingDef[] = [
  { key: 'mode', label: 'Playback mode', kind: 'select', default: 'loadingScreen',
    options: [
      { value: 'intro',         label: 'Intro — plays once' },
      { value: 'loadingScreen', label: 'Loading screen — loops until game ready' },
    ],
    hint: '✓ Loading screen mode waits for the game to finish loading; intro plays once.',
  },
  { key: 'alwaysSkip',       label: 'Show skip immediately', kind: 'boolean', default: false,
    hint: '✓ Show the skip button immediately. Overrides minPlaybackSec and the loading-screen wait.' },
  { key: 'minPlaybackSec',   label: 'Minimum watch time',   kind: 'number', default: 3, min: 0, max: 30, unit: 'sec', showWhen: [{ key: 'alwaysSkip', value: false }],
    hint: '✓ Don\'t allow skip before this many seconds. Ignored when "Always allow skip" is on.' },
  { key: 'readyFallbackSec', label: 'Game-ready fallback', kind: 'number', default: 8, min: 1, max: 60, unit: 'sec', showWhen: [{ key: 'mode', value: 'loadingScreen' }, { key: 'alwaysSkip', value: false }],
    hint: '✓ Auto-allow skip if the game-ready signal never fires.' },
];

const LOADING_VIDEO_PAGE_SETTINGS: SettingDef[] = [
  { key: 'mode', label: 'Playback mode', kind: 'select', default: 'loadingScreen',
    options: [
      { value: 'loadingScreen', label: 'Loading screen — loops until game ready' },
    ],
    hint: '✓ Waits for the game to finish loading before continuing.',
  },
  { key: 'readyFallbackSec', label: 'Game-ready fallback', kind: 'number', default: 8, min: 1, max: 60, unit: 'sec',
    hint: '✓ Allows the loading screen to continue if the game-ready signal never fires.' },
];

export const PAGE_SETTINGS_SCHEMA: Record<string, SettingDef[]> = {
  'intro-video': VIDEO_PAGE_SETTINGS,
  'loading-video': LOADING_VIDEO_PAGE_SETTINGS,
  'ad-video': VIDEO_PAGE_SETTINGS,
  landing: [
    { key: 'onboardingFirstRunOnly', label: 'Skip tutorial for returning players', kind: 'boolean', default: true,
      hint: '✓ Returning players skip the tutorial and continue directly to the next route.' },
  ],
  tutorial: [
    { key: 'screenLayout', label: 'Screen layout', kind: 'select', default: 'fullBleedHero',
      options: [
        { value: 'fullBleedHero', label: 'Full bleed hero' },
        { value: 'card',          label: 'Card screen' },
      ],
      hint: 'Choose whether the tutorial sits directly on the campaign hero image or inside a centered card.' },
    // Step count → step-indicator block; allow skip → nav-controls block.
  ],
  register: [
    { key: 'showInfix',     label: 'Show name infix field',     kind: 'boolean', default: true,
      hint: '✓ Useful for Dutch markets ("van", "de", etc).' },
    // Require consent → opt-in-list block.
  ],
  game: [
    { key: 'unityBootMode', label: 'Unity boot timing', kind: 'select', default: 'entry',
      options: [
        { value: 'entry', label: 'Start page (preload immediately)' },
        { value: 'game',  label: 'Game page only' },
      ],
      hint: 'Choose whether Unity starts loading as soon as the visitor enters the site or only when /game opens.' },
    // Timer on/off + duration → timer block.
  ],
  result: [
    { key: 'autoNavSec', label: 'Auto-continue after', kind: 'number', default: 0, min: 0, max: 120, unit: 'sec',
      hint: '✓ For kiosk mode. 0 = disabled (user clicks Continue).' },
  ],
  voucher: [
    // Show QR → qr-display block.
    { key: 'codeLength', label: 'Voucher code length', kind: 'number',  default: 8, min: 4, max: 16,
      hint: '✓ Truncate / pad the displayed code to this many characters.' },
  ],
  // Pages without settings (leaderboard) are simply omitted here —
  // the settings panel skips pages with no schema entry.
};

/** Default values for every page in the schema, indexed by pageId. */
export function defaultPageSettings(): PageSettings {
  const out: PageSettings = {};
  for (const [pageId, settings] of Object.entries(PAGE_SETTINGS_SCHEMA)) {
    out[pageId] = {};
    for (const s of settings) {
      out[pageId][s.key] = s.default;
    }
  }
  return out;
}

/**
 * Mirror of `ALL_PAGES` + `PAGE_ROUTES` in cli/scaffold.js.
 * The CANONICAL ORDER on the right is the order pages appear in by default;
 * the wizard lets devs override it with drag-to-reorder.
 */
/**
 * A single page node in the user's flow. Different from PageMeta — that's the
 * "type" / definition; this is the "instance" that lives in the flow array.
 *
 *   { id: 'video',       type: 'video' }   — first/canonical instance, route = /video
 *   { id: 'video-intro', type: 'video' }   — additional instance,    route = /video-intro
 *
 * Settings, exits, and route tokens are keyed by `id` so multiple instances of
 * the same type don't collide. The `type` is used to look up the schema
 * (PageMeta) and to find the source page.tsx to copy.
 */
export interface PageInstance {
  id:    string;
  type:  string;
  route: string;
}

/** Returns the default URL slug for a page type, e.g. 'game' → '/gameplay'. */
export function defaultRouteForType(type: string): string {
  return ALL_PAGES.find(p => p.id === type)?.route ?? `/${type}`;
}

export interface PageMeta {
  id:         string;
  label:      string;
  hint:       string;
  route:      string;
  /** When this page is in the flow, this module is required and gets auto-added. */
  requires?:  string;
  /**
   * Buttons / navigations the page emits. Each exit's destination is
   * separately configurable in the wizard, so flow routing isn't strictly
   * linear — `result.next` could go to voucher, `result.playAgain` could
   * skip back to tutorial, etc.
   */
  exits?:     PageExit[];
}

export interface PageExit {
  /** Local key, scoped to the page. Used to address the exit in flowExits. */
  key:         string;
  /** Human label shown in the wizard (e.g. "Continue button", "Play again"). */
  label:       string;
  /**
   * Token suffix consumed at scaffold time. The wizard writes the user's
   * choice as `flowExits[token] = '/route-of-target-page'`, scaffold.js then
   * substitutes `{{<token>}}` everywhere it appears in the source.
   */
  token:       string;
  /**
   * Optional default-target heuristic (page id), evaluated only when no
   * user choice is set. 'next-in-flow' picks the page after this one in the
   * sequence. 'first-in-flow' picks the entry page (used by Play again).
   * Leaving undefined defaults to 'next-in-flow'.
   */
  defaultRule?: 'next-in-flow' | 'first-in-flow';
  /**
   * Optional exits don't render their button unless explicitly enabled in
   * the wizard. Required exits (like the primary "next" CTA) are always on.
   */
  optional?:    boolean;
  /**
   * For optional exits: whether the toggle starts ON. Most optional exits
   * default to OFF (e.g. landing's Leaderboard button is rare); some
   * (like result's Play Again) start ON because almost every campaign has it.
   */
  defaultEnabled?: boolean;
  /**
   * CAPE settings key that toggles this exit's button visibility at runtime.
   * The wizard writes `settings.pages.{pageId}.{cape} = true|false` based on
   * the user's checkbox; the page component reads it via getCapeBoolean.
   * Required exits don't need this — their button is always rendered.
   */
  capeFlag?:    string;
  defaultVariant?: ButtonVariant;
}

export const BUTTON_VARIANTS: Array<{ value: ButtonVariant; label: string }> = [
  { value: 'primary',   label: 'Primary' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'tertiary',  label: 'Tertiary' },
  { value: 'dark',      label: 'Dark' },
  { value: 'danger',    label: 'Danger' },
];

// Order here is the canonical campaign funnel — used as the default
// insertion order when the user adds a page to the flow, and as the listing
// order in the "+ Add page" popover. Loose narrative:
//   pre-game build-up  → gameplay → reward path
//   landing → intro-video → tutorial → loading-video → register → game →
//   result → ad-video → voucher → leaderboard
// Register lands in its pre-game slot by default; users can drag it to land
// after result, and `regMode` is derived from that position (see
// deriveRegMode below). There is no separate Registration-timing UI.
export const ALL_PAGES: PageMeta[] = [
  { id: 'loading',     label: 'Loading',     hint: 'Pre-entry loading screen with brand and progress.', route: '/loading',
    exits: [{ key: 'next', label: 'When ready', token: 'NEXT_AFTER_LOADING', defaultVariant: 'primary' }] },
  { id: 'landing',     label: 'Landing',     hint: 'Hero / brand splash with CTA.',             route: '/landing',
    exits: [
      { key: 'next',        label: 'Primary CTA button',   token: 'NEXT_AFTER_LANDING',          defaultVariant: 'primary' },
      { key: 'tutorial',    label: 'Tutorial button',      token: 'LANDING_TUTORIAL_ROUTE',
        optional: true, defaultEnabled: false, capeFlag: 'showTutorialButton',    defaultVariant: 'secondary' },
      { key: 'leaderboard', label: 'Leaderboard button',   token: 'LANDING_LEADERBOARD_ROUTE',
        optional: true, defaultEnabled: false, capeFlag: 'showLeaderboardButton', defaultVariant: 'secondary' },
    ] },
  { id: 'intro-video',   label: 'Video 1',   hint: 'A video screen — typically the pre-game intro.', route: '/intro-video',   requires: 'video',
    exits: [{ key: 'next', label: 'On end / skip',  token: 'NEXT_AFTER_INTRO_VIDEO' }] },
  { id: 'tutorial',    label: 'Tutorial',    hint: 'How-to-play steps / slides before gameplay.',route: '/tutorial',
    exits: [{ key: 'next', label: 'Start / Final CTA', token: 'NEXT_AFTER_TUTORIAL', defaultVariant: 'primary' }] },
  { id: 'loading-video', label: 'Loading video', hint: 'Looping loading screen until the game is ready.', route: '/loading-video', requires: 'video',
    exits: [{ key: 'next', label: 'When game ready',  token: 'NEXT_AFTER_LOADING_VIDEO' }] },
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
  { id: 'ad-video',      label: 'Video 2',      hint: 'A second video screen — typically a post-result interstitial.',         route: '/ad-video',      requires: 'video',
    exits: [{ key: 'next', label: 'On end / skip',  token: 'NEXT_AFTER_AD_VIDEO' }] },
  { id: 'voucher',     label: 'Voucher',     hint: 'Reward code / QR for the prize.',           route: '/voucher',       requires: 'voucher',
    exits: [{ key: 'next', label: 'Continue button', token: 'NEXT_AFTER_VOUCHER',     defaultVariant: 'primary' }] },
  { id: 'leaderboard', label: 'Leaderboard', hint: 'Top scores + personal best.',               route: '/leaderboard',   requires: 'leaderboard',
    exits: [{ key: 'next', label: 'CTA button',      token: 'NEXT_AFTER_LEADERBOARD', defaultVariant: 'primary' }] },
  { id: 'end',         label: 'End',         hint: 'Final thank-you screen after reward or score flow.', route: '/end',
    exits: [{ key: 'next', label: 'Final CTA', token: 'NEXT_AFTER_END', defaultVariant: 'primary' }] },
  { id: 'menu',        label: 'Menu',        hint: 'Full-screen campaign navigation overlay.', route: '/menu',
    exits: [{ key: 'next', label: 'Back / close', token: 'NEXT_AFTER_MENU', defaultVariant: 'secondary' }] },
];

export const ALL_PAGE_IDS: string[] = ALL_PAGES.map(p => p.id);

/**
 * Derive `regMode` from the actual page positions in the flow:
 *   - `'gate'`  — register sits before result (pre-game gate)
 *   - `'after'` — register sits after result (post-result claim)
 *   - `'none'`  — no register page in the flow
 *
 * Used as the single source of truth for regMode; the wizard no longer
 * stores user-set regMode independently. scaffold.js's legacy
 * `regMode === 'after'` reorder is still respected for CLI callers, but
 * becomes a no-op for wizard builds because the page array already encodes
 * the intent.
 */
export function deriveRegMode(pages: PageInstance[]): RegMode {
  const regIdx    = pages.findIndex((p) => p.type === 'register');
  if (regIdx < 0) return 'none';
  const resultIdx = pages.findIndex((p) => p.type === 'result');
  if (resultIdx < 0) return 'gate';
  return regIdx > resultIdx ? 'after' : 'gate';
}

export function pageMeta(id: string): PageMeta | undefined {
  return ALL_PAGES.find(p => p.id === id);
}

/** A pickable navigation target for a CTA button's destination dropdown. */
export interface FlowPageOption {
  id:    string;
  type:  string;
  label: string;
  route: string;
}

/**
 * The other pages in the flow, as { id, type, label, route } options — the same
 * shape FlowCard builds for its exit dropdowns. Used by the cta-group button
 * editor so a button's `exit` (a page id) can be picked from real targets.
 */
export function flowPageOptions(config: ScaffoldConfig, selfId: string): FlowPageOption[] {
  return (config.pages ?? [])
    .filter((p) => p.id !== selfId)
    .map((p) => {
      const m = pageMeta(p.type);
      if (!m) return null;
      return {
        id:    p.id,
        type:  p.type,
        label: p.id === p.type ? m.label : `${m.label} · ${p.id}`,
        route: p.route,
      };
    })
    .filter((o): o is FlowPageOption => Boolean(o));
}

export function pagesForStack(_stack: Stack): PageMeta[] {
  return ALL_PAGES;
}

// ─── Phase grouping ─────────────────────────────────────────────────────────
//
// Used by the wizard to divide a flow into "Before gameplay / Gameplay /
// After gameplay" sections. Helps the user reason about pacing and is the
// grouping shown in both the flow list and the Add-page picker.

export type Phase = 'before' | 'game' | 'after';

export const PHASE_LABELS: Record<Phase, string> = {
  before: 'Before gameplay',
  game:   'Gameplay',
  after:  'After gameplay',
};

export const PHASE_ORDER: Phase[] = ['before', 'game', 'after'];

const PAGE_PHASE: Record<string, Phase> = {
  landing:         'before',
  'intro-video':   'before',
  tutorial:        'before',
  'loading-video': 'before',
  register:        'before',
  game:            'game',
  result:          'after',
  'ad-video':      'after',
  voucher:         'after',
  leaderboard:     'after',
};

export function phaseForType(type: string): Phase {
  return PAGE_PHASE[type] ?? 'after';
}

/**
 * Group an instance flow into phase buckets. Position-aware: if a `register`
 * page sits after `result`, it lands in the "after" bucket instead of its
 * canonical "before" home so the UI matches what scaffolding will actually do.
 */
export function groupPagesByPhase(pages: PageInstance[]): Array<{ phase: Phase; pages: PageInstance[] }> {
  const gameIdx = pages.findIndex(p => p.type === 'game');
  const buckets: Record<Phase, PageInstance[]> = { before: [], game: [], after: [] };
  pages.forEach((page, idx) => {
    let phase = phaseForType(page.type);
    if (gameIdx >= 0) {
      if (idx < gameIdx) phase = page.type === 'game' ? 'game' : 'before';
      else if (idx === gameIdx) phase = 'game';
      else phase = page.type === 'game' ? 'game' : 'after';
    }
    buckets[phase].push(page);
  });
  return PHASE_ORDER
    .map(phase => ({ phase, pages: buckets[phase] }))
    .filter(group => group.pages.length > 0);
}

// Small inline glyphs per page type — used by FlowCard and AddPageMenu as a
// fast visual hint. Kept as text/emoji so we don't pull an icon dep.
export const PAGE_ICONS: Record<string, string> = {
  landing:         '⌂',
  'intro-video':   '▶',
  tutorial:        '☷',
  'loading-video': '◐',
  register:        '✎',
  game:            '◆',
  result:          '★',
  'ad-video':      '▶',
  voucher:         '⌑',
  leaderboard:     '☰',
};

export function pageIcon(type: string): string {
  return PAGE_ICONS[type] ?? '◌';
}

export function defaultPagesForStack(stack: Stack): PageInstance[] {
  const gameRoute = stack === 'tanstack' ? '/game' : '/gameplay';
  return [
    { id: 'loading',       type: 'loading',       route: '/loading'       },
    { id: 'landing',       type: 'landing',       route: '/landing'       },
    { id: 'tutorial',      type: 'tutorial',      route: '/tutorial'      },
    { id: 'loading-video', type: 'loading-video', route: '/loading-video' },
    { id: 'game',          type: 'game',          route: gameRoute        },
    { id: 'result',        type: 'result',        route: '/result'        },
    { id: 'register',      type: 'register',      route: '/register'      },
    { id: 'voucher',       type: 'voucher',       route: '/voucher'       },
    { id: 'leaderboard',   type: 'leaderboard',   route: '/leaderboard'   },
    { id: 'menu',          type: 'menu',          route: '/menu'          },
  ];
}

export function defaultPageBlocksForPages(pages: PageInstance[]): PageBlocksMap {
  const out: PageBlocksMap = {};
  for (const page of pages) out[page.id] = defaultBlocksForPage(page.type);
  return out;
}

export interface StackOption {
  id:         Stack;
  engine:     Engine;
  label:      string;
  hint:       string;
  /** Reference projects this stack maps to (Livewall internal). */
  references: string[];
  strengths:  string[];
  notes?:     string;
}

export const STACK_OPTIONS: StackOption[] = [
  {
    id: 'next', engine: 'unity', label: 'Next.js + Unity',
    hint: 'Next.js 16 + Unity WebGL — like HaasF1',
    references: ['HaasF1', 'Hema Handdoekenspel', 'La Roche-Posay'],
    strengths: [
      'Battle-tested for heavy WebGL games (5–60MB bundles)',
      'Server-side CAPE fetch + 5-min cache built in',
      'Unity boot lifecycle (sceneLoaded → ready) wired to a typed bridge',
    ],
    notes: 'Default for any Unity-based campaign. Use TanStack instead only if you specifically need TanStack Start.',
  },
  {
    id: 'tanstack', engine: 'unity', label: 'TanStack + Unity',
    hint: 'TanStack Start + Unity WebGL — like NHL-Crush',
    references: ['NHL Crease Crusher', 'Champion Petfood'],
    strengths: [
      'Newest gold-standard at Livewall (replaces Next.js for Unity)',
      'File-based routing with server functions',
      'Loader-driven CAPE fetching per route',
    ],
    notes: 'Pick this for new Unity projects unless the team has explicit Next.js requirements.',
  },
  {
    id: 'next', engine: 'r3f', label: 'React Three Fiber',
    hint: '3D in-browser — R3F / ThreeJS',
    references: ['R3F-Stable (3D experiments)'],
    strengths: [
      'No Unity build pipeline — ship 3D directly from React',
      'Smaller download than Unity for simple 3D scenes',
      'Hot reload for the entire game during dev',
    ],
    notes: 'Best for stylised low-poly 3D scenes. Not a Unity replacement for complex physics or animation rigs.',
  },
  {
    id: 'next', engine: 'phaser', label: 'Phaser 3',
    hint: '2D game engine — like Freekick',
    references: ['Freekick', 'Acana How-To-Play'],
    strengths: [
      '2D game engine optimised for arcade-style mobile games',
      'Sprites, physics, tweens, particles — no Unity complexity',
      'Pure JS, hot-reloadable, ~150KB runtime',
    ],
    notes: 'Pick this for fast 2D action: tap, swipe, drag, projectile games.',
  },
  {
    id: 'next', engine: 'memory', label: 'Memory (no engine)',
    hint: 'Pure React — like Hunkemöller memory',
    references: ['Hunkemöller Memory', 'Carrefour El Club'],
    strengths: [
      'Card flip / matching games as plain React state',
      'Zero engine dependency — bundle stays tiny',
      'Cards driven from CAPE (files.game.card1–card6)',
    ],
    notes: 'Perfect for memory / matching / pairing games where state fits comfortably in React.',
  },
  {
    id: 'next', engine: 'none', label: 'No game',
    hint: 'CAPE only — registration / voucher flows',
    references: ['Registration-only sweepstakes campaigns'],
    strengths: [
      'No game canvas at all — tutorial, register, voucher, leaderboard',
      'Use for "win a prize by signing up" experiences',
      'Lightest possible scaffold',
    ],
  },
];

// ─── Menu items ─────────────────────────────────────────────────────────────
//
// The /menu route renders a configurable list of links. Each item lives in
// MENU_ITEMS as a (id, default label, route, button kind, default-enabled)
// tuple. The wizard surfaces a checkbox per item; CAPE persists the choice
// at `settings.menu.show{Id}`. The menu page reads those flags and renders
// only the enabled items in the order MENU_ITEMS defines.
//
// Adding a new menu item: append an entry here AND update menu/page.tsx's
// MENU_ITEMS mirror (kept in sync because the page can't import from the
// wizard's TS source).

export interface MenuItemDef {
  id:             string;
  label:          string;
  target:         string;
  kind:           ButtonVariant;
  defaultEnabled: boolean;
}

export const MENU_ITEMS: MenuItemDef[] = [
  { id: 'home',        label: 'Home',           target: '/landing',     kind: 'primary',   defaultEnabled: true  },
  { id: 'resume',      label: 'Resume game',    target: '/gameplay',    kind: 'secondary', defaultEnabled: false },
  { id: 'howToPlay',   label: 'How to play',    target: '/tutorial',    kind: 'secondary', defaultEnabled: true  },
  { id: 'leaderboard', label: 'Leaderboard',   target: '/leaderboard', kind: 'secondary', defaultEnabled: false },
  { id: 'voucher',     label: 'My voucher',     target: '/voucher',     kind: 'secondary', defaultEnabled: false },
  { id: 'terms',       label: 'Terms',          target: '/terms',       kind: 'tertiary',  defaultEnabled: true  },
  { id: 'privacy',     label: 'Privacy',        target: '/privacy',     kind: 'tertiary',  defaultEnabled: true  },
  { id: 'faq',         label: 'FAQ',             target: '/faq',         kind: 'tertiary',  defaultEnabled: false },
  { id: 'leave',       label: 'Leave campaign', target: '/',            kind: 'danger',    defaultEnabled: false },
];

/** Default route per header slot type — used as placeholder text in the wizard. */
export const HEADER_SLOT_DEFAULTS: Record<string, string> = {
  menu: '/menu',
  help: '/tutorial',
  close: '/',
};

export function defaultMenuItemsEnabled(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const item of MENU_ITEMS) out[item.id] = item.defaultEnabled;
  return out;
}

export function defaultFlowButtonVariants(): Record<string, ButtonVariant> {
  const out: Record<string, ButtonVariant> = {};
  for (const page of ALL_PAGES) {
    for (const exit of page.exits ?? []) {
      out[`${page.id}.${exit.key}`] = exit.defaultVariant ?? 'primary';
    }
  }
  return out;
}

export function defaultMenuButtonVariants(): Record<string, ButtonVariant> {
  const out: Record<string, ButtonVariant> = {};
  for (const item of MENU_ITEMS) out[item.id] = item.kind;
  return out;
}

export const DEFAULT_CONFIG: ScaffoldConfig = {
  stack:              'next',
  game:               'unity',
  name:               '',
  createCape:         true,
  capeTitle:          '',
  capeId:             '',
  market:             'NL',
  defaultLanguage:    'EN',
  supportedLanguages: ['EN'],
  timezone:           'Europe/Brussels',
  brand:              '',
  department:         '',
  pages:              defaultPagesForStack('next'),
  regMode:            'after',
  modules:            [],
  gtmId:              '',
  iframe:             false,
  pageSettings:       defaultPageSettings(),
  pageBlocks:         defaultPageBlocksForPages(defaultPagesForStack('next')),
  flowExits:          {},
  flowEntry:          undefined,
  flowEnabledExits:   defaultEnabledExits(),
  flowButtonVariants: defaultFlowButtonVariants(),
  flowRules:          defaultFlowRulesForPages(defaultPagesForStack('next')),
  menuItemsEnabled:   defaultMenuItemsEnabled(),
  menuButtonVariants: defaultMenuButtonVariants(),
  buildMode:          'create',
};

/**
 * Generate a unique instance id for a new page of `type` given the existing
 * instances in the flow. Strategy: first instance keeps the bare type name
 * (`video`); subsequent instances get a numeric suffix (`video-2`, `video-3`).
 * Skips ids already in use to handle gaps from removals.
 */
export function nextInstanceId(type: string, existing: PageInstance[]): string {
  const usedIds = new Set(existing.map(i => i.id));
  if (!usedIds.has(type)) return type;
  let n = 2;
  while (usedIds.has(`${type}-${n}`)) n++;
  return `${type}-${n}`;
}

/** Build the default enabled-exits map from each page's optional exit defaults. */
export function defaultEnabledExits(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const page of ALL_PAGES) {
    for (const exit of page.exits ?? []) {
      if (!exit.optional) continue;
      out[`${page.id}.${exit.key}`] = exit.defaultEnabled ?? false;
    }
  }
  return out;
}
