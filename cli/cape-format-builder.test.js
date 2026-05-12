/**
 * cli/cape-format-builder.test.js
 *
 * Smoke test: every page type in KNOWN_PAGE_TYPES (except `game`, which is
 * intentionally tab-less) must produce a CAPE tab when included as a flow
 * instance with the right module enabled. Catches the class of bug where
 * the wizard sends a page type the builder doesn't recognise — the format
 * comes back missing tabs and CAPE looks empty.
 *
 * Run with:  node cli/cape-format-builder.test.js
 * Exits non-zero on any failure.
 */

import { buildNextCapeFormat, KNOWN_PAGE_TYPES } from './cape-format-builder.js';
import { stripInterfaceSetupForCapeSave } from './cape-client.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TYPES_THAT_SHOULD_RENDER_A_TAB = [...KNOWN_PAGE_TYPES].filter((t) => t !== 'game');

const failures = [];
const warnings = [];

// Capture warnings so an unexpected `console.warn` from the builder fails the test.
const origWarn = console.warn;
console.warn = (...args) => { warnings.push(args.join(' ')); };

// ── Test 1: each known page type produces its own tab ────────────────────────
for (const type of TYPES_THAT_SHOULD_RENDER_A_TAB) {
  const f = buildNextCapeFormat({
    instances: [{ id: type, type }],
    pageTypes: {},
    pageElementSelections: {},
    // Module-gated tabs (leaderboard / register / voucher) only render when
    // their module is selected. Pass them all so every type gets a fair test.
    modules: ['leaderboard', 'registration', 'voucher'],
    flowEnabledExits: {},
    menuItemsEnabled: {},
  });
  const pagesPage = f.interfaceSetup.pages.find((p) => p.path === 'pages');
  const tabPaths = pagesPage?.tabs.map((t) => t.path) ?? [];
  if (!tabPaths.includes(type)) {
    failures.push(`Page type "${type}" did NOT produce a tab. Got tabs: ${tabPaths.join(', ')}`);
  }
}

// ── Test 2: an unknown type warns (and produces no tab) ──────────────────────
warnings.length = 0;
buildNextCapeFormat({
  instances: [{ id: 'mystery', type: 'mystery' }],
  pageTypes: {},
  pageElementSelections: {},
  modules: [],
  flowEnabledExits: {},
  menuItemsEnabled: {},
});
const sawUnknownWarning = warnings.some((w) => w.includes('Unknown page type "mystery"'));
if (!sawUnknownWarning) {
  failures.push('Unknown page type "mystery" did not trigger a console.warn from the builder.');
}

// ── Test 3: realistic full flow renders all expected tabs ────────────────────
warnings.length = 0;
const fullFlow = buildNextCapeFormat({
  instances: [
    { id: 'intro-video',   type: 'intro-video'   },
    { id: 'landing',       type: 'landing'       },
    { id: 'onboarding',    type: 'onboarding'    },
    { id: 'loading-video', type: 'loading-video' },
    { id: 'register',      type: 'register'      },
    { id: 'game',          type: 'game'          },
    { id: 'result',        type: 'result'        },
    { id: 'ad-video',      type: 'ad-video'      },
    { id: 'leaderboard',   type: 'leaderboard'   },
    { id: 'voucher',       type: 'voucher'       },
  ],
  pageTypes: {},
  pageElementSelections: {},
  modules: ['leaderboard', 'registration', 'voucher'],
  flowEnabledExits: {},
  menuItemsEnabled: {},
});
const fullTabs = fullFlow.interfaceSetup.pages.find((p) => p.path === 'pages').tabs.map((t) => t.path);
const expectedFullTabs = [
  'header', 'desktop',
  'intro-video', 'landing', 'onboarding', 'loading-video',
  'register', 'result', 'ad-video', 'leaderboard', 'voucher',
  'menu',
];
for (const expected of expectedFullTabs) {
  if (!fullTabs.includes(expected)) {
    failures.push(`Full-flow test: expected tab "${expected}" missing. Got: ${fullTabs.join(', ')}`);
  }
}
if (warnings.length > 0) {
  failures.push(`Full-flow test produced unexpected warnings:\n  ${warnings.join('\n  ')}`);
}

let generatedBooleanFields = 0;
let generatedSwitchFields = 0;
let generatedYesNoSelectFields = 0;
const walkItems = (node) => {
  if (Array.isArray(node)) return node.forEach(walkItems);
  if (!node || typeof node !== 'object') return;
  if (node.itemType === 'input') {
    if (node.type === 'boolean') generatedBooleanFields++;
    if (node.type === 'switch') generatedSwitchFields++;
    if (
      node.type === 'select' &&
      node.options?.true === 'Yes' &&
      node.options?.false === 'No'
    ) generatedYesNoSelectFields++;
  }
  for (const value of Object.values(node)) walkItems(value);
};
walkItems(fullFlow.interfaceSetup);
if (generatedBooleanFields > 0) {
  failures.push(`Generated CAPE format still contains ${generatedBooleanFields} boolean field(s); use CAPE switch fields instead.`);
}
if (generatedSwitchFields === 0) {
  failures.push('Generated CAPE format did not contain any switch fields for boolean settings.');
}
if (generatedYesNoSelectFields > 0) {
  failures.push(`Generated CAPE format still contains ${generatedYesNoSelectFields} Yes/No select field(s); use switch instead.`);
}

// ── Test 4: KNOWN_PAGE_TYPES and the wizard's ALL_PAGES stay in sync ─────────
//
// `ALL_PAGES` lives in cli/wizard-ui/src/shared/config.ts (TS, can't be
// imported here without a build step). We parse the page ids from the file
// directly. If they diverge from KNOWN_PAGE_TYPES, scaffolds will silently
// drop tabs (or the validator will reject pages the wizard legitimately
// produces). Either way: bug. Fail loudly.
try {
  const configPath = join(__dirname, 'wizard-ui', 'src', 'shared', 'config.ts');
  const src = readFileSync(configPath, 'utf8');
  // Match `{ id: 'landing', label: ...` etc. inside `ALL_PAGES`.
  const allPagesBlock = src.match(/export const ALL_PAGES[\s\S]*?\];/);
  if (!allPagesBlock) {
    failures.push('Could not locate ALL_PAGES in cli/wizard-ui/src/shared/config.ts — drift check skipped.');
  } else {
    const idRegex = /\{\s*id:\s*'([^']+)'/g;
    const wizardIds = new Set();
    let m;
    while ((m = idRegex.exec(allPagesBlock[0])) !== null) wizardIds.add(m[1]);

    const inWizardOnly = [...wizardIds].filter((id) => !KNOWN_PAGE_TYPES.has(id));
    const inBuilderOnly = [...KNOWN_PAGE_TYPES].filter((id) => !wizardIds.has(id));
    if (inWizardOnly.length) {
      failures.push(
        `Drift: wizard ALL_PAGES contains type(s) the format builder doesn't know about: ${inWizardOnly.join(', ')}. ` +
        `Add them to KNOWN_PAGE_TYPES + the switch in buildNextCapeFormat.`
      );
    }
    if (inBuilderOnly.length) {
      failures.push(
        `Drift: KNOWN_PAGE_TYPES contains type(s) the wizard doesn't expose: ${inBuilderOnly.join(', ')}. ` +
        `Add them to ALL_PAGES, or remove from KNOWN_PAGE_TYPES + the switch.`
      );
    }
  }
} catch (err) {
  failures.push(`Drift check failed to read wizard config: ${err.message}`);
}

// ── Report ───────────────────────────────────────────────────────────────────
const defaultStripFixture = {
  pages: [{
    path: 'settings',
    tabs: [{
      blocks: [{
        items: [
          { type: 'text', model: 'copy.title', defaultValue: 'Hello' },
          { type: 'color', model: 'settings.branding.primaryColor', defaultValue: '#CDFF00' },
          { type: 'boolean', model: 'settings.enabled', defaultValue: true },
          { type: 'number', model: 'settings.count', defaultValue: 3 },
          { type: 'textMultiLanguage', model: 'copy.subtitle', defaultValue: { value: 'Subtitle' } },
        ],
      }],
    }],
  }],
};
const strippedFixture = stripInterfaceSetupForCapeSave(defaultStripFixture);
const strippedItems = strippedFixture.pages[0].tabs[0].blocks[0].items;
if ('defaultValue' in strippedItems[0]) failures.push('stripInterfaceSetupForCapeSave kept text string defaultValue.');
if ('defaultValue' in strippedItems[1]) failures.push('stripInterfaceSetupForCapeSave kept color string defaultValue.');
if (strippedItems[2].defaultValue !== true) failures.push('stripInterfaceSetupForCapeSave removed boolean defaultValue.');
if (strippedItems[3].defaultValue !== 3) failures.push('stripInterfaceSetupForCapeSave removed number defaultValue.');
if (strippedItems[4].defaultValue?.value !== 'Subtitle') failures.push('stripInterfaceSetupForCapeSave removed object defaultValue.');

console.warn = origWarn;
if (failures.length === 0) {
  console.log(`✓ cape-format-builder smoke tests passed (${TYPES_THAT_SHOULD_RENDER_A_TAB.length + 4} checks)`);
  process.exit(0);
} else {
  console.error(`✘ cape-format-builder smoke tests FAILED:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
