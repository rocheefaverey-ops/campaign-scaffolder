#!/usr/bin/env node

/**
 * post-scaffold-message.js
 *
 * Printed by the CLI wizard at the end of every scaffold run.
 * Uses chalk v5 (ESM) for colour output.
 *
 * Called by the Step 3 CLI like:
 *   import { printPostScaffoldMessage } from './post-scaffold-message.js';
 *   printPostScaffoldMessage({ projectName, capeId, market, modules, outputDir });
 */

// Inline ANSI helpers — no external dep required at message-print time.
// The Step 3 CLI can swap these out for chalk if it adds that dependency.
const c = {
  reset:   (s) => `\x1b[0m${s}\x1b[0m`,
  bold:    (s) => `\x1b[1m${s}\x1b[0m`,
  dim:     (s) => `\x1b[2m${s}\x1b[0m`,
  green:   (s) => `\x1b[32m${s}\x1b[0m`,
  yellow:  (s) => `\x1b[33m${s}\x1b[0m`,
  cyan:    (s) => `\x1b[36m${s}\x1b[0m`,
  red:     (s) => `\x1b[31m${s}\x1b[0m`,
  white:   (s) => `\x1b[37m${s}\x1b[0m`,
  bgGreen: (s) => `\x1b[42m\x1b[30m${s}\x1b[0m`,
};

const CHECK  = c.green('✔');
const WARN   = c.yellow('⚠');
const CROSS  = c.red('✘');
const ARROW  = c.cyan('→');
const BULLET = c.dim('•');

/**
 * @param {object} opts
 * @param {string}   opts.projectName   - e.g. 'hema-handdoek-2025'
 * @param {string}   opts.capeId        - e.g. '54031'
 * @param {string}   opts.market        - e.g. 'NL'
 * @param {string[]} opts.modules       - e.g. ['unity', 'leaderboard', 'registration']
 * @param {string}   opts.outputDir     - absolute path to generated project
 */
export function printPostScaffoldMessage({ projectName, capeId, market, modules, outputDir, stack = 'next' }) {
  if (stack === 'tanstack') return printPostScaffoldMessageTanstack({ projectName, capeId, market, outputDir });

  const divider = c.dim('─'.repeat(60));

  console.log('');
  console.log(divider);
  console.log('');
  console.log(c.bgGreen(` ${CHECK} Project scaffolded successfully! `));
  console.log('');
  console.log(`  ${c.bold('Project:')}  ${c.cyan(projectName)}`);
  console.log(`  ${c.bold('CAPE ID:')}  ${c.cyan(capeId)}  ${c.dim(`(market: ${market})`)}`);
  console.log(`  ${c.bold('Modules:')}  ${modules.length > 0 ? modules.map(m => c.cyan(m)).join(', ') : c.dim('(core only)')}`);
  console.log(`  ${c.bold('Output:')}   ${c.dim(outputDir)}`);
  console.log('');
  console.log(divider);

  // ── Step 1: .env ──────────────────────────────────────────────────────────
  console.log('');
  console.log(c.bold(`  ${ARROW} STEP 1 — Fill in your .env`));
  console.log('');
  console.log(c.yellow(`  ${WARN}  .env was pre-created from env.dist — review and complete it.`));
  console.log(`     ${BULLET} ${c.green('NEXT_PUBLIC_CAPE_URL')} is pre-set to the acceptance CDN`);
  console.log(`     ${BULLET} ${c.green('NEXT_PUBLIC_CAPE_DEFAULT_ID')} is pre-set to ${c.bold(capeId)}`);
  console.log(`     ${BULLET} ${c.green('NEXT_PUBLIC_CAPE_DEFAULT_MARKET')} is pre-set to ${c.bold(market)}`);
  console.log(`     ${BULLET} Set ${c.cyan('API_URL')} to your backend`);
  console.log(`     ${BULLET} Set ${c.cyan('SERVER_SECRET')} to a random secret`);
  console.log('');

  // ── Step 2: CAPE pull ─────────────────────────────────────────────────────
  console.log('');
  console.log(divider);
  console.log('');
  console.log(c.bold(`  ${ARROW} STEP 2 — Pull your CAPE campaign data  ${c.dim('(manual — DO NOT automate)')}`));
  console.log('');
  console.log(c.yellow(`  ${WARN}  The scaffolder intentionally did NOT run this for you.`));
  console.log(`     ${c.dim('lwg-cli-cape has write access to ALL live campaigns.')}`);
  console.log(`     ${c.dim('Always pull manually so you know exactly what is happening.')}`);
  console.log('');
  console.log(`  ${BULLET} Also fill in the ${c.cyan('CAPE CLI')} block in your ${c.cyan('.env')}:`);
  console.log('');
  console.log(c.dim('       CAPE_EMAIL=your@livewall.nl'));
  console.log(c.dim('       CAPE_PASSWORD=your-password'));
  console.log(c.dim(`       CAPE_DEFAULT_CAMPAIGN_ID=${capeId}`));
  console.log('');
  console.log(`  ${BULLET} Then run the ${c.bold('read-only')} pull command from ${c.cyan('lwg-cli-cape')}:`);
  console.log('');
  console.log(c.cyan(`       cd /path/to/lwg-cli-cape`));
  console.log(c.cyan(`       node cli.js login`));
  console.log(c.cyan(`       node cli.js fetch ${capeId}`));
  console.log('');
  console.log(`     ${CHECK} This saves ${c.cyan(`workspace/campaign-${capeId}.json`)} locally for reference.`);
  console.log(`     ${c.dim('The Next.js app reads CAPE live at runtime — this file is for dev inspection only.')}`);
  console.log('');
  console.log(c.red(`  ${CROSS}  NEVER run:  node cli.js push / patch / publish`));
  console.log(`     ${c.dim('Those commands modify live campaign data for ALL markets.')}`);

  // ── Step 3: Install & run ─────────────────────────────────────────────────
  console.log('');
  console.log(divider);
  console.log('');
  console.log(c.bold(`  ${ARROW} STEP 3 — Install and start the dev server`));
  console.log('');
  console.log(c.cyan(`       cd ${outputDir}`));
  console.log(c.cyan(`       npm install`));
  console.log(c.cyan(`       npm run dev`));
  console.log('');

  // ── Module-specific TODOs ─────────────────────────────────────────────────
  const moduleTodos = buildModuleTodos(modules, capeId);
  if (moduleTodos.length > 0) {
    console.log(divider);
    console.log('');
    console.log(c.bold(`  ${ARROW} MODULE TODOS`));
    console.log('');
    for (const todo of moduleTodos) {
      console.log(`  ${WARN}  ${todo}`);
    }
    console.log('');
  }

  console.log(divider);
  console.log('');
  console.log(c.green(`  Happy building — ${c.bold(projectName)}! 🚀`));
  console.log('');
  console.log(divider);
  console.log('');
}

function buildModuleTodos(modules, capeId) {
  const todos = [];

  if (modules.includes('unity')) {
    todos.push(
      `[unity] Set ${c.cyan('NEXT_PUBLIC_UNITY_BASE_URL')} and ${c.cyan('NEXT_PUBLIC_UNITY_GAME_NAME')} in .env`,
    );
    todos.push(
      `[unity] Extend ${c.cyan('IUnityInput')} in ${c.cyan('lib/game-bridge/game-bridge.types.ts')} for campaign-specific data`,
    );
  }

  if (modules.includes('r3f')) {
    todos.push(
      `[r3f] Install deps: ${c.cyan('npm install three @react-three/fiber @react-three/drei')}`,
    );
    todos.push(
      `[r3f] Uncomment ${c.cyan('<Canvas>')} in ${c.cyan('components/_modules/R3FCanvas/R3FCanvas.tsx')}`,
    );
  }

  if (modules.includes('leaderboard') || modules.includes('registration')) {
    todos.push(
      `[scoring] Confirm ${c.cyan('API_URL')} session endpoints match backend (create/end-session paths)`,
    );
  }

  if (modules.includes('registration')) {
    todos.push(
      `[registration] Update opt-in labels + links in ${c.cyan('components/_modules/RegistrationForm/RegistrationForm.tsx')} from CAPE copy`,
    );
  }

  if (modules.includes('voucher')) {
    todos.push(
      `[voucher] Install QR dep: ${c.cyan('npm install next-qrcode')} and uncomment in ${c.cyan('components/_modules/Voucher/QRCode.tsx')}`,
    );
  }

  if (modules.includes('audio')) {
    todos.push(
      `[audio] Install: ${c.cyan('npm install howler @types/howler')} and uncomment in ${c.cyan('components/_modules/AudioPlayer/AudioPlayer.tsx')}`,
    );
  }

  if (modules.includes('cookie-consent')) {
    todos.push(
      `[cookie-consent] Set ${c.cyan('NEXT_PUBLIC_COOKIEBOT_CBID')} in .env and mount ${c.cyan('<CookieConsent />')} in app/layout.tsx`,
    );
  }

  if (modules.includes('design-tokens')) {
    todos.push(
      `[design-tokens] Mount ${c.cyan('<DesignTokenInjector capeData={capeData} />')} in app/providers.tsx`,
    );
  }

  // Always remind about CAPE ID
  todos.push(
    `Verify CAPE campaign ${c.bold(capeId)} is published to ${c.cyan('acceptance')} before testing`,
  );

  return todos;
}

// ─── TanStack post-scaffold message ──────────────────────────────────────────
function printPostScaffoldMessageTanstack({ projectName, capeId, market, outputDir }) {
  const divider = c.dim('─'.repeat(60));

  console.log('');
  console.log(divider);
  console.log('');
  console.log(c.bgGreen(` ${CHECK} Project scaffolded successfully! `));
  console.log('');
  console.log(`  ${c.bold('Stack:')}    ${c.cyan('TanStack Start + Vite')}`);
  console.log(`  ${c.bold('Project:')} ${c.cyan(projectName)}`);
  console.log(`  ${c.bold('CAPE ID:')} ${c.cyan(capeId)}  ${c.dim(`(market: ${market})`)}`);
  console.log(`  ${c.bold('Output:')}  ${c.dim(outputDir)}`);
  console.log('');
  console.log(divider);

  // Step 1: .env
  console.log('');
  console.log(c.bold(`  ${ARROW} STEP 1 — Fill in your .env`));
  console.log('');
  console.log(c.yellow(`  ${WARN}  .env was pre-created from env.dist — review and complete it.`));
  console.log(`     ${BULLET} ${c.green('CAPE_BASE_URL')} is pre-set to the acceptance CDN`);
  console.log(`     ${BULLET} ${c.green('CAPE_CAMPAIGN_ID')} is pre-set to ${c.bold(capeId)}`);
  console.log(`     ${BULLET} Set ${c.cyan('API_URL')} to your backend`);
  console.log(`     ${BULLET} Set ${c.cyan('API_SESSION_SECRET')} to a random secret`);
  console.log(`     ${BULLET} Set ${c.cyan('UNITY_BASE_URL')} and ${c.cyan('UNITY_GAME_NAME')} for your Unity build`);

  // Step 2: CAPE
  console.log('');
  console.log(divider);
  console.log('');
  console.log(c.bold(`  ${ARROW} STEP 2 — Pull your CAPE campaign data  ${c.dim('(manual — DO NOT automate)')}`));
  console.log('');
  console.log(c.yellow(`  ${WARN}  The scaffolder intentionally did NOT run this for you.`));
  console.log(`     ${c.dim('lwg-cli-cape has write access to ALL live campaigns.')}`);
  console.log('');
  console.log(c.cyan(`       cd /path/to/lwg-cli-cape`));
  console.log(c.cyan(`       node cli.js login`));
  console.log(c.cyan(`       node cli.js fetch ${capeId}`));
  console.log('');
  console.log(c.red(`  ${CROSS}  NEVER run:  node cli.js push / patch / publish`));

  // Step 3: Unity build
  console.log('');
  console.log(divider);
  console.log('');
  console.log(c.bold(`  ${ARROW} STEP 3 — Add your Unity WebGL build`));
  console.log('');
  console.log(`     ${BULLET} Upload Unity build to GCS and set ${c.cyan('UNITY_BASE_URL')} in .env`);
  console.log(`     ${BULLET} The loader script path is ${c.cyan('${UNITY_BASE_URL}/Build/Build.loader.js')}`);
  console.log(`     ${BULLET} Update ${c.cyan('UNITY_GAME_NAME')} to match your Unity output folder`);
  console.log('');
  console.log(c.yellow(`  ${WARN}  Review boilerplate-specific files and remove what is not needed:`));
  console.log(`     ${BULLET} ${c.cyan('src/hooks/stores/useTeamStore.ts')}  ${c.dim('← sport-specific, remove if not needed')}`);
  console.log(`     ${BULLET} ${c.cyan('src/utils/TeamMapper.ts')}           ${c.dim('← sport-specific, remove if not needed')}`);
  console.log(`     ${BULLET} ${c.cyan('src/routes/tutorial.tsx')}           ${c.dim('← keep or remove based on campaign')}`);

  // Step 4: Install & run
  console.log('');
  console.log(divider);
  console.log('');
  console.log(c.bold(`  ${ARROW} STEP 4 — Install and start the dev server`));
  console.log('');
  console.log(c.cyan(`       cd ${outputDir}`));
  console.log(c.cyan(`       npm install`));
  console.log(c.cyan(`       npm run dev`));
  console.log('');
  console.log(divider);
  console.log('');
  console.log(c.green(`  Happy building — ${c.bold(projectName)}! 🚀`));
  console.log('');
  console.log(divider);
  console.log('');
}

// ─── CLI entry point for manual testing ────────────────────────────────────
// Run:  node cli/post-scaffold-message.js
if (process.argv[1].endsWith('post-scaffold-message.js')) {
  printPostScaffoldMessage({
    projectName: 'hema-handdoek-2025',
    capeId: '54031',
    market: 'NL',
    modules: ['unity', 'leaderboard', 'registration', 'voucher'],
    outputDir: '/c/Dev/Livewall/hema-handdoek-2025',
  });
}
