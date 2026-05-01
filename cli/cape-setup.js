#!/usr/bin/env node
/**
 * cape-setup.js
 *
 * Handles optional CAPE campaign creation + mock data fetch during scaffolding.
 * Called by scaffold.js after the project directory is set up.
 *
 * Requires `cape` to be globally linked (lwg-cli-cape: npm link).
 */

import { execSync, spawnSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// ─── Colour helpers (duplicated here — no shared dep) ────────────────────────
const c = {
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
  dim:    (s) => `\x1b[2m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
};
const ok   = (msg) => console.log(`      ${c.green('✔')} ${msg}`);
const warn = (msg) => console.log(`      ${c.yellow('⚠')} ${msg}`);
const fail = (msg) => console.log(`      ${c.red('✘')} ${msg}`);

/** Returns true if the `cape` CLI is available globally. */
export function capeCliAvailable() {
  try {
    const result = spawnSync('cape', ['--version'], { encoding: 'utf8', shell: true });
    return result.status === 0 || result.stdout?.length > 0 || result.stderr?.length > 0;
  } catch {
    // Try `node cli.js` fallback path — not supported here, require global link
    return false;
  }
}

/**
 * Create a CAPE campaign via `cape create-campaign`.
 *
 * @param {string} formatPath  e.g. "hema-curacao-memory"
 * @param {string} title       Campaign title (project name)
 * @param {string} market      Market code, e.g. "NL"
 * @returns {string|null}      Campaign ID on success, null on failure
 */
export function capeCreateCampaign(formatPath, title, market) {
  try {
    console.log(c.dim(`      cape create-campaign ${formatPath} "${title}" ${market}`));
    const out = execSync(
      `cape create-campaign "${formatPath}" "${title}" "${market}"`,
      { encoding: 'utf8', shell: true, timeout: 30_000 },
    );
    // Output line: "ID: 54031"
    const match = out.match(/^ID:\s*(\d+)/m);
    if (!match) {
      fail('Could not parse campaign ID from cape output:');
      console.log(c.dim(out));
      return null;
    }
    const id = match[1];
    ok(`Campaign created — ID: ${c.cyan(id)}`);
    return id;
  } catch (e) {
    fail(`cape create-campaign failed: ${e.message}`);
    return null;
  }
}

/**
 * Run `cape populate-defaults <id>` to fill the campaign with format defaults.
 * Non-fatal — warns on failure.
 */
export function capePopulateDefaults(campaignId) {
  try {
    console.log(c.dim(`      cape populate-defaults ${campaignId}`));
    execSync(`cape populate-defaults ${campaignId}`, {
      encoding: 'utf8', shell: true, timeout: 30_000,
    });
    ok('Defaults populated');
  } catch (e) {
    warn(`cape populate-defaults failed (run manually): ${e.message}`);
  }
}

/**
 * Run `cape publish <id>` to publish the campaign to acceptance.
 * Non-fatal — warns on failure.
 */
export function capePublish(campaignId) {
  try {
    console.log(c.dim(`      cape publish ${campaignId}`));
    execSync(`cape publish ${campaignId}`, {
      encoding: 'utf8', shell: true, timeout: 30_000,
    });
    ok('Published to acceptance');
  } catch (e) {
    warn(`cape publish failed (run manually: cape publish ${campaignId}): ${e.message}`);
  }
}

/**
 * Fetch campaign JSON from the public CAPE CDN and save to public/mock-cape.json.
 * Waits up to ~10s for the CDN to propagate after publish.
 *
 * @param {string} outputDir   Scaffolded project root
 * @param {string} campaignId
 * @param {string} market
 * @param {string} baseUrl     CAPE CDN base, e.g. "https://storage.bycape.io"
 */
export async function capeFetchMock(outputDir, campaignId, market, baseUrl = 'https://storage.bycape.io') {
  const url = `${baseUrl}/${campaignId}_${market.toUpperCase()}.json`;
  const outPath = join(outputDir, 'public', 'mock-cape.json');

  console.log(c.dim(`      GET ${url}`));

  // Retry a few times — CDN can take a moment after publish
  let data = null;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      data = await res.json();
      break;
    } catch (e) {
      if (attempt < 4) {
        console.log(c.dim(`      retry ${attempt}/3…`));
        await new Promise(r => setTimeout(r, 2500));
      } else {
        warn(`CDN fetch failed after ${attempt} attempts: ${e.message}`);
        warn(`Run later:  cd ${outputDir} && npm run cape:fetch-mock`);
        return false;
      }
    }
  }

  writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf-8');
  ok(`mock-cape.json saved (${Object.keys(data).length} top-level keys)`);
  return true;
}

/**
 * Patch .env in the scaffolded project:
 *   - Set NEXT_PUBLIC_CAPE_CAMPAIGN_ID to the real ID
 *   - Set CAPE_DEFAULT_CAMPAIGN_ID
 *   - Set CAPE_MOCK=true
 */
export function patchEnvForCape(outputDir, campaignId) {
  const envPath = join(outputDir, '.env');
  if (!existsSync(envPath)) {
    warn('.env not found — skipping env patch');
    return;
  }
  let content = readFileSync(envPath, 'utf-8');
  // Update campaign ID lines
  content = content
    .replace(/^(NEXT_PUBLIC_CAPE_CAMPAIGN_ID=).*/m, `$1${campaignId}`)
    .replace(/^(CAPE_DEFAULT_CAMPAIGN_ID=).*/m,      `$1${campaignId}`)
    .replace(/^(CAPE_MOCK=).*/m,                      `$1true`);
  writeFileSync(envPath, content, 'utf-8');
  ok(`NEXT_PUBLIC_CAPE_CAMPAIGN_ID=${campaignId}, CAPE_MOCK=true written to .env`);
}
