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
  /**
   * Per-menu-item visibility, keyed by item id (see MENU_ITEMS). Persisted
   * to CAPE as `settings.menu.show{Id}`. The /menu route reads these flags
   * and renders only the enabled items.
   */
  menuItemsEnabled: Record<string, boolean>;
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
}

// ─── Per-page settings ──────────────────────────────────────────────────────

export type SettingValue = string | number | boolean;
export type PageSettings = Record<string, Record<string, SettingValue>>;

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
export const PAGE_SETTINGS_SCHEMA: Record<string, SettingDef[]> = {
  video: [
    { key: 'mode', label: 'Mode', kind: 'select', default: 'loadingScreen',
      options: [
        { value: 'intro',         label: 'Intro — plays once' },
        { value: 'loadingScreen', label: 'Loading screen — loops until game ready' },
      ],
      hint: '✓ Loading screen mode waits for the game to finish loading; intro plays once.',
    },
    { key: 'alwaysSkip',       label: 'Always allow skip', kind: 'boolean', default: false,
      hint: '✓ Show the skip button immediately. Overrides minPlaybackSec and the loading-screen wait.' },
    { key: 'minPlaybackSec',   label: 'Min playback',   kind: 'number', default: 3, min: 0, max: 30, unit: 'sec',
      hint: '✓ Don\'t allow skip before this many seconds. Ignored when "Always allow skip" is on.' },
    { key: 'readyFallbackSec', label: 'Ready fallback', kind: 'number', default: 8, min: 1, max: 60, unit: 'sec',
      hint: '✓ Auto-allow skip if the game-ready signal never fires.' },
  ],
  onboarding: [
    { key: 'allowSkip', label: 'Allow skip', kind: 'boolean', default: false,
      hint: '✓ Show a "Skip" link on each onboarding slide.' },
  ],
  register: [
    { key: 'showInfix',     label: 'Show infix field',     kind: 'boolean', default: true,
      hint: '✓ Useful for Dutch markets ("van", "de", etc).' },
    { key: 'requireOptIns', label: 'Require all opt-ins', kind: 'boolean', default: true,
      hint: '✓ Block submission until all consent checkboxes are ticked.' },
  ],
  game: [
    { key: 'timerEnabled', label: 'Timer enabled',  kind: 'boolean', default: true,
      hint: '✓ Render a countdown overlay on the gameplay page.' },
    { key: 'timerSec',     label: 'Timer duration', kind: 'number',  default: 60, min: 5, max: 600, unit: 'sec',
      hint: '✓ Countdown duration. Game ends with score=0 if it expires.' },
  ],
  result: [
    { key: 'autoNavSec', label: 'Auto-navigate after', kind: 'number', default: 0, min: 0, max: 120, unit: 'sec',
      hint: '✓ For kiosk mode. 0 = disabled (user clicks Continue).' },
  ],
  voucher: [
    { key: 'showQr',     label: 'Show QR code',         kind: 'boolean', default: true,
      hint: '✓ Render a QR linking to the voucher in addition to the code.' },
    { key: 'codeLength', label: 'Voucher code length', kind: 'number',  default: 8, min: 4, max: 16,
      hint: '✓ Truncate / pad the displayed code to this many characters.' },
  ],
  // Pages without settings (landing, leaderboard) are simply omitted here —
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
  id:   string;
  type: string;
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
   * skip back to onboarding, etc.
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
}

export const ALL_PAGES: PageMeta[] = [
  { id: 'landing',     label: 'Landing',     hint: 'Hero / brand splash with CTA.',     route: '/landing',
    exits: [
      { key: 'next',        label: 'Primary CTA button',      token: 'NEXT_AFTER_LANDING' },
      { key: 'leaderboard', label: 'Leaderboard button',      token: 'LANDING_LEADERBOARD_ROUTE',
        optional: true, defaultEnabled: false, capeFlag: 'showLeaderboardButton' },
    ] },
  { id: 'video',       label: 'Video',       hint: 'Intro / brand video, skippable.',   route: '/video',       requires: 'video',
    exits: [{ key: 'next', label: 'On end / skip',   token: 'NEXT_AFTER_VIDEO' }] },
  { id: 'onboarding',  label: 'Onboarding',  hint: 'How-to-play steps, multi-slide.',   route: '/onboarding',
    exits: [{ key: 'next', label: 'Final CTA',       token: 'NEXT_AFTER_ONBOARDING' }] },
  { id: 'register',    label: 'Register',    hint: 'Player registration form.',         route: '/register',    requires: 'registration',
    exits: [{ key: 'next', label: 'On submit',       token: 'NEXT_AFTER_REGISTER' }] },
  { id: 'game',        label: 'Game',        hint: 'The actual game canvas.',           route: '/gameplay',
    exits: [{ key: 'next', label: 'On game end',     token: 'NEXT_AFTER_GAME' }] },
  { id: 'result',      label: 'Result',      hint: 'Score reveal / win / lose screen.', route: '/result',
    exits: [
      { key: 'next',        label: 'Continue button',  token: 'NEXT_AFTER_RESULT' },
      { key: 'playAgain',   label: 'Play again button',token: 'PLAY_AGAIN_ROUTE', defaultRule: 'first-in-flow',
        optional: true, defaultEnabled: true,  capeFlag: 'showPlayAgainButton' },
      { key: 'leaderboard', label: 'Leaderboard button', token: 'RESULT_LEADERBOARD_ROUTE',
        optional: true, defaultEnabled: false, capeFlag: 'showLeaderboardButton' },
    ] },
  { id: 'leaderboard', label: 'Leaderboard', hint: 'Top scores + personal best.',       route: '/leaderboard', requires: 'leaderboard',
    exits: [{ key: 'next', label: 'CTA button',      token: 'NEXT_AFTER_LEADERBOARD' }] },
  { id: 'voucher',     label: 'Voucher',     hint: 'Reward code / QR for the prize.',   route: '/voucher',     requires: 'voucher',
    exits: [{ key: 'next', label: 'Done button',     token: 'NEXT_AFTER_VOUCHER' }] },
];

export const ALL_PAGE_IDS: string[] = ALL_PAGES.map(p => p.id);

export function pageMeta(id: string): PageMeta | undefined {
  return ALL_PAGES.find(p => p.id === id);
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
      'No game canvas at all — onboarding, register, voucher, leaderboard',
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
  kind:           'primary' | 'secondary' | 'ghost';
  defaultEnabled: boolean;
}

export const MENU_ITEMS: MenuItemDef[] = [
  { id: 'home',        label: 'Home',           target: '/landing',     kind: 'primary',   defaultEnabled: true  },
  { id: 'resume',      label: 'Resume game',    target: '/gameplay',    kind: 'secondary', defaultEnabled: true  },
  { id: 'howToPlay',   label: 'How to play',    target: '/onboarding',  kind: 'secondary', defaultEnabled: true  },
  { id: 'leaderboard', label: 'Leaderboard',   target: '/leaderboard', kind: 'secondary', defaultEnabled: false },
  { id: 'voucher',     label: 'My voucher',     target: '/voucher',     kind: 'secondary', defaultEnabled: false },
  { id: 'terms',       label: 'Terms',          target: '/terms',       kind: 'ghost',     defaultEnabled: true  },
  { id: 'privacy',     label: 'Privacy',        target: '/privacy',     kind: 'ghost',     defaultEnabled: false },
  { id: 'faq',         label: 'FAQ',             target: '/faq',         kind: 'ghost',     defaultEnabled: false },
  { id: 'leave',       label: 'Leave campaign', target: '/',            kind: 'ghost',     defaultEnabled: false },
];

export function defaultMenuItemsEnabled(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const item of MENU_ITEMS) out[item.id] = item.defaultEnabled;
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
  pages:              [
    { id: 'landing',    type: 'landing'    },
    { id: 'onboarding', type: 'onboarding' },
    { id: 'game',       type: 'game'       },
    { id: 'result',     type: 'result'     },
  ],
  regMode:            'none',
  modules:            [],
  gtmId:              '',
  iframe:             false,
  pageSettings:       defaultPageSettings(),
  flowExits:          {},
  flowEntry:          undefined,
  flowEnabledExits:   defaultEnabledExits(),
  menuItemsEnabled:   defaultMenuItemsEnabled(),
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
