#!/usr/bin/env node
/**
 * fetch-mock-cape.js
 *
 * Fetches the CAPE campaign JSON from the CDN and saves it to
 * public/mock-cape.json so you can run the app with CAPE_MOCK=true
 * without needing real credentials every time.
 *
 * Usage:
 *   node scripts/fetch-mock-cape.js
 *   npm run cape:fetch-mock
 *
 * Reads from .env (if present) or falls back to process.env.
 * Requires: NEXT_PUBLIC_CAPE_URL, NEXT_PUBLIC_CAPE_CAMPAIGN_ID, NEXT_PUBLIC_CAPE_MARKET
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// ── Load .env manually (no dotenv dep needed) ────────────────────────────────
function loadEnv() {
  const envPath = join(root, '.env');
  if (!existsSync(envPath)) return {};
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    env[key] = val;
  }
  return env;
}

const env = { ...loadEnv(), ...process.env };

const baseUrl    = env.NEXT_PUBLIC_CAPE_URL;
const campaignId = env.NEXT_PUBLIC_CAPE_DEFAULT_ID;
const market     = (env.NEXT_PUBLIC_CAPE_DEFAULT_MARKET ?? 'NL').toUpperCase();

if (!baseUrl || !campaignId) {
  console.error('\n[cape:fetch-mock] Missing required env vars:');
  if (!baseUrl)    console.error('  ✘ NEXT_PUBLIC_CAPE_URL');
  if (!campaignId) console.error('  ✘ NEXT_PUBLIC_CAPE_DEFAULT_ID');
  console.error('\n  Fill these in .env first, then re-run.\n');
  process.exit(1);
}

const url = `${baseUrl}/${campaignId}_${market}.json`;
const outPath = join(root, 'public', 'mock-cape.json');

console.log(`\n[cape:fetch-mock] Fetching: ${url}`);

const res = await fetch(url);

if (!res.ok) {
  console.error(`\n[cape:fetch-mock] Fetch failed: ${res.status} ${res.statusText}`);
  console.error(`  URL: ${url}`);
  console.error('  Is the campaign published to acceptance?\n');
  process.exit(1);
}

const data = await res.json();
writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf-8');

console.log(`[cape:fetch-mock] Saved → public/mock-cape.json`);
console.log(`[cape:fetch-mock] Campaign ${campaignId} (${market}) cached locally.`);
console.log(`\n  Set CAPE_MOCK=true in .env and run:  npm run dev:mock\n`);
