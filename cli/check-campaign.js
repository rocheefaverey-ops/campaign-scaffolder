#!/usr/bin/env node
/**
 * Diagnostic: check which CAPE fields are empty for a given campaign.
 *
 * Usage:
 *   node cli/check-campaign.js <campaignId>
 *
 * Fetches the campaign + its format from CAPE, walks every field in the
 * interfaceSetup, and prints three sections:
 *   ✓  Filled fields (with a short value preview)
 *   ○  Empty optional fields (no defaultValue in format — client fills these)
 *   ✘  Empty required fields (format has a defaultValue but campaign is empty)
 */

import { checkAuth } from './cape-client.js';
import { homedir } from 'os';
import { readFile } from 'fs/promises';

const AUTH_FILE = `${homedir()}/.cape/tokens.json`;
const API_URL   = 'https://api-acceptance.campaigndesigner.io';
const ORIGIN    = 'https://engagement.acceptance.campaigndesigner.io';

// ── helpers ───────────────────────────────────────────────────────────────────

function makeHeaders(tokens) {
  const h = { Accept: 'application/json', 'Content-Type': 'application/json', Origin: ORIGIN };
  if (tokens.authToken)    h['Authorization'] = `Bearer ${tokens.authToken}`;
  if (tokens.sessionCookie) h['Cookie']        = tokens.sessionCookie;
  return h;
}

async function apiPost(endpoint, body, tokens) {
  const res  = await fetch(`${API_URL}${endpoint}`, { method: 'POST', headers: makeHeaders(tokens), body: JSON.stringify(body) });
  const data = await res.json();
  return { ok: res.ok, data };
}

function resolvePath(obj, path) {
  let cur = obj;
  for (const part of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[part];
  }
  return cur;
}

function isEmpty(value) {
  if (value === undefined || value === null || value === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && !Array.isArray(value)) {
    // { value: '' } text wrapper
    if ('value' in value && (value.value === '' || value.value === null || value.value === undefined)) return true;
    // multilanguage object — empty if no language has a non-empty value
    if (value.multilanguage) {
      return Object.entries(value)
        .filter(([k]) => k !== 'multilanguage')
        .every(([, v]) => !v || (typeof v === 'object' && (!v.value || v.value === '')));
    }
    if (Object.keys(value).length === 0) return true;
  }
  return false;
}

function previewValue(value) {
  if (value === undefined || value === null) return '(null)';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value.length > 60 ? value.slice(0, 60) + '…' : value;
  if (Array.isArray(value)) {
    const url = value[0]?.url;
    return url ? `[file] ${url.split('/').pop()}` : `[array(${value.length})]`;
  }
  if (typeof value === 'object') {
    if ('value' in value) return String(value.value).slice(0, 60);
    const langs = Object.keys(value).filter(k => k !== 'multilanguage');
    if (langs.length) {
      const first = value[langs[0]];
      const text  = typeof first === 'string' ? first : first?.value ?? '';
      return `[${langs[0]}] ${String(text).slice(0, 55)}`;
    }
    return JSON.stringify(value).slice(0, 60);
  }
  return String(value);
}

// ── main ──────────────────────────────────────────────────────────────────────

const campaignId = process.argv[2];
if (!campaignId) { console.error('Usage: node cli/check-campaign.js <campaignId>'); process.exit(1); }

const tokens = await checkAuth();
if (!tokens?.authToken) { console.error('Not logged in. Run the wizard first.'); process.exit(1); }

console.log(`\nFetching campaign ${campaignId}…`);
const { ok, data } = await apiPost('/editor/getCampaign', { type: 'campaign', id: campaignId }, tokens);
if (!ok || !data?.data) { console.error('Failed to fetch campaign'); process.exit(1); }

const campaignData  = data.data.data || {};
const interfaceSetup = (() => {
  const raw = data.data?.interfaceSetup;
  if (!raw) return null;
  try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return null; }
})();

if (!interfaceSetup) { console.error('No interfaceSetup found on campaign format'); process.exit(1); }

// Walk all items
const filled   = [];
const emptyOpt = [];
const emptyReq = [];

function walkItem(item, pageTitle, tabTitle) {
  if (item.type === 'subSection') {
    for (const sub of item.items || []) walkItem(sub, pageTitle, tabTitle);
    return;
  }
  if (!item.model || item.itemType !== 'input') return;

  // Expand [[language]] wildcards
  const models = item.model.includes('[[language]]')
    ? ['NL', 'EN'].map(lang => item.model.replace('[[language]]', lang))
    : [item.model];

  for (const model of models) {
    const value    = resolvePath(campaignData, model);
    const empty    = isEmpty(value);
    const hasDefault = item.defaultValue !== undefined && item.defaultValue !== '';
    const location = `${pageTitle} › ${tabTitle}`;

    if (!empty) {
      filled.push({ model, label: item.label, location, preview: previewValue(value) });
    } else if (hasDefault) {
      emptyReq.push({ model, label: item.label, location, default: previewValue(item.defaultValue) });
    } else {
      emptyOpt.push({ model, label: item.label, location });
    }
  }
}

for (const page of interfaceSetup.pages || []) {
  for (const tab of page.tabs || []) {
    for (const block of tab.blocks || []) {
      for (const item of block.items || []) {
        walkItem(item, page.title || page.key, tab.title || tab.key);
      }
    }
  }
}

// ── report ────────────────────────────────────────────────────────────────────

const W = { model: 55, label: 30, loc: 35, preview: 60 };
const row = (cols) => cols.map((s, i) => String(s ?? '').padEnd([W.model, W.label, W.loc, W.preview][i])).join('  ');
const sep = () => console.log('─'.repeat(W.model + W.label + W.loc + W.preview + 6));

const header = row(['Model path', 'Label', 'Location', 'Value / Default']);

console.log(`\n${'═'.repeat(header.length)}`);
console.log(`  Campaign ${campaignId} — field coverage report`);
console.log(`${'═'.repeat(header.length)}`);

// ── Empty fields with defaults (need seeding / attention) ─────────────────────
if (emptyReq.length) {
  console.log(`\n✘  EMPTY — has a default value (should have been seeded)  [${emptyReq.length}]\n`);
  console.log(header); sep();
  for (const f of emptyReq) console.log(row([f.model, f.label, f.location, `default: ${f.default}`]));
} else {
  console.log('\n✔  All fields with defaults are populated.');
}

// ── Empty optional fields ─────────────────────────────────────────────────────
if (emptyOpt.length) {
  console.log(`\n○  EMPTY — optional (no default, client fills these)  [${emptyOpt.length}]\n`);
  console.log(header); sep();
  for (const f of emptyOpt) console.log(row([f.model, f.label, f.location, '']));
}

// ── Filled fields ─────────────────────────────────────────────────────────────
console.log(`\n✓  FILLED  [${filled.length}]\n`);
console.log(header); sep();
for (const f of filled) console.log(row([f.model, f.label, f.location, f.preview]));

console.log(`\nTotal: ${filled.length} filled  |  ${emptyReq.length} empty-with-default  |  ${emptyOpt.length} empty-optional\n`);
