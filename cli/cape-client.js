/**
 * cape-client.js — self-contained CAPE API client for the scaffolder.
 *
 * Mirrors the logic from lwg-cli-cape without depending on it being installed.
 * Shares the same token store (~/.cape/tokens.json) so a user logged in via
 * the CLI is already logged in here too.
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const SCAFFOLDER_ROOT = resolve(__dirname, '..');

// ── Constants ─────────────────────────────────────────────────────────────────

const API_URL    = 'https://api-acceptance.campaigndesigner.io';
const ORIGIN     = 'https://engagement.acceptance.campaigndesigner.io';
const DOMAIN     = 'engagement';
const AUTH_FILE  = `${homedir()}/.cape/tokens.json`;

/** Base format all new scaffolded campaigns are created from. */
export const DEFAULT_FORMAT_PATH = 'livewall_scaffolder_test';

/** Bundled interfaceSetup + publishProfiles for scaffolded campaigns. */
export const SCAFFOLDER_FORMAT_FILE = resolve(SCAFFOLDER_ROOT, 'formats', 'scaffolder-format.json');

// ── Token store ───────────────────────────────────────────────────────────────

async function loadTokens() {
  try {
    const data = await readFile(AUTH_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveTokens(tokens) {
  const dir = `${homedir()}/.cape`;
  await mkdir(dir, { recursive: true });
  await writeFile(AUTH_FILE, JSON.stringify(tokens, null, 2), { mode: 0o600 });
}

function makeHeaders(tokens) {
  const h = {
    'Accept':       'application/json',
    'Content-Type': 'application/json',
    'Origin':       ORIGIN,
  };
  if (tokens.authToken)    h['Authorization'] = `Bearer ${tokens.authToken}`;
  if (tokens.sessionCookie) h['Cookie']       = tokens.sessionCookie;
  return h;
}

async function apiPost(endpoint, body, tokens) {
  const res  = await fetch(`${API_URL}${endpoint}`, {
    method:  'POST',
    headers: makeHeaders(tokens),
    body:    JSON.stringify(body),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns stored tokens if the user is already logged in, or null.
 */
export async function checkAuth() {
  const tokens = await loadTokens();
  return tokens.authToken ? tokens : null;
}

/**
 * Login with email + password. Saves tokens to ~/.cape/tokens.json.
 * Throws on failure.
 */
export async function login(email, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method:  'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Origin': ORIGIN },
    body:    JSON.stringify({ email, password, domain: DOMAIN }),
  });

  const setCookie = res.headers.get('set-cookie');
  const data      = await res.json();

  if (data.success === 0 || !data.data?.userId) {
    throw new Error(`CAPE login failed: ${data.error || data.message || 'incorrect credentials'}`);
  }

  const tokens = {};
  if (setCookie) {
    const match = setCookie.match(/s_tk=([^;]+)/);
    if (match) tokens.sessionCookie = `s_tk=${match[1]}`;
  }
  tokens.authToken = `${data.data.userId}:${data.data.token}`;
  if (data.data.user?.mediaServicesApiToken) tokens.mediaToken = data.data.user.mediaServicesApiToken;

  await saveTokens(tokens);
  return tokens;
}

/**
 * Create a new campaign. Returns the numeric campaign ID string.
 *
 * @param {object} tokens
 * @param {{ title: string, market: string, formatPath?: string }} opts
 */
export async function createCampaign(tokens, { title, market, formatPath = DEFAULT_FORMAT_PATH }) {
  const dateStr   = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const fullTitle = `${title} - ${market} - ${dateStr}`;

  const { ok, data } = await apiPost('/campaigns/create', {
    campaignFormat: formatPath,
    settings:       { title: fullTitle, market },
    type:           'campaign',
    conceptId:      0,
    copyCampaignId: 0,
  }, tokens);

  if (!ok || data?.success !== 1 || !data?.data?.id || data.data.id === '0') {
    throw new Error(`Campaign creation failed: ${data?.error || JSON.stringify(data)}`);
  }

  return String(data.data.id);
}

/**
 * Push the scaffolder interfaceSetup (+ publishProfiles) to the campaign's format.
 * Fetches the current format metadata from CAPE first, then saves the updated setup.
 *
 * @param {object} tokens
 * @param {string} campaignId
 * @param {{ interfaceSetup: object, publishProfiles: object }} formatFile
 */
export async function pushFormat(tokens, campaignId, formatFile) {
  // 1. Fetch current campaign to get the format metadata
  const { ok, data } = await apiPost('/editor/getCampaign', { type: 'campaign', id: campaignId }, tokens);
  if (!ok || !data?.data) throw new Error(`Failed to fetch campaign ${campaignId}`);

  const formatData = data.data.format;
  if (!formatData?.id) throw new Error('Campaign has no linked format');

  // 2. Build minimal save payload — only send what CAPE needs
  const minimalData = {
    id:          formatData.id,
    accountId:   formatData.accountId,
    path:        formatData.path,
    title:       formatData.title,
    description: formatData.description || '',
    brand:       formatData.brand        || '',
    department:  formatData.department   || '',
    active:      formatData.active       ?? '1',
    publishProfiles: formatFile.publishProfiles ?? formatData.publishProfiles,
    interfaceSetup:  JSON.stringify(formatFile.interfaceSetup),
  };

  const { ok: saveOk, data: saveData } = await apiPost('/campaignFormats/save', {
    id:   String(formatData.id),
    data: minimalData,
  }, tokens);

  if (!saveOk || saveData?.success === 0) {
    throw new Error(`pushFormat failed: ${saveData?.error || JSON.stringify(saveData)}`);
  }
}

/**
 * Populate a campaign with defaultValues from the interfaceSetup.
 * Text/textMultiLanguage fields get multilanguage wrappers.
 *
 * @param {object} tokens
 * @param {string} campaignId
 * @param {object} interfaceSetup  — from the scaffolder format file
 */
export async function populateDefaults(tokens, campaignId, interfaceSetup) {
  const { ok, data } = await apiPost('/editor/getCampaign', { type: 'campaign', id: campaignId }, tokens);
  if (!ok || !data?.data) throw new Error(`Failed to fetch campaign ${campaignId}`);

  const fullData     = data.data;
  const currentData  = fullData.data || {};
  const languagesObj = currentData.settings?.languages || { EN: 'EN - English' };
  const languages    = Object.keys(languagesObj).map(k => k.toUpperCase());

  const campaignData = JSON.parse(JSON.stringify(currentData));
  let populated = 0;

  const setPath = (obj, path, value, force = false) => {
    const parts = path.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    const last     = parts[parts.length - 1];
    const existing = cur[last];
    const isEmpty  = existing === undefined || existing === null || existing === '';
    if (isEmpty || force) { cur[last] = value; return true; }
    return false;
  };

  const makeMultilanguage = (value) => {
    const obj = { multilanguage: true };
    for (const lang of languages) {
      obj[lang] = { value: String(value), requiresTranslation: false, updated: false, referenceTranslation: String(value) };
    }
    return obj;
  };

  const processItem = (item) => {
    if (item.type === 'subSection') {
      for (const sub of item.items || []) processItem(sub);
      return;
    }
    if (!item.model) return;
    if ((item.type === 'slider' || item.type === 'number') && item.defaultValue === 0) return;
    if (Array.isArray(item.defaultValue) && item.defaultValue.length === 0) return;
    if (item.defaultValue === '' || item.defaultValue === undefined) return;

    const forceOverwrite = item.type === 'text' && item.defaultValue !== undefined && item.defaultValue !== '';

    let value;
    if (item.type === 'checkboxList') {
      if (!item.options) return;
      const allKeys = Array.isArray(item.options) ? item.options.map(o => o.value ?? o) : Object.keys(item.options);
      if (allKeys.length === 0) return;
      value = { value: allKeys };
    } else if (item.type === 'textMultiLanguage' || item.type === 'richTextEditor') {
      const rawDefault = (typeof item.defaultValue === 'object' && item.defaultValue !== null && 'value' in item.defaultValue)
        ? item.defaultValue.value
        : item.defaultValue;
      value = makeMultilanguage(rawDefault);
    } else if (item.type === 'text') {
      if (item.model.includes('[[language]]')) {
        for (const lang of languages) {
          const expandedModel = item.model.replace('[[language]]', lang);
          if (setPath(campaignData, expandedModel, { value: String(item.defaultValue), updated: true, copy: true }, true)) populated++;
        }
        return;
      }
      value = { value: String(item.defaultValue), updated: true, copy: true };
    } else {
      value = item.defaultValue;
    }

    if (setPath(campaignData, item.model, value, forceOverwrite)) populated++;
  };

  for (const page of interfaceSetup.pages || []) {
    for (const tab of page.tabs || []) {
      for (const block of tab.blocks || []) {
        for (const item of block.items || []) processItem(item);
      }
    }
  }

  const versionNr  = String(fullData.versionNr || fullData.version || '1');
  const saveResult = await apiPost('/editor/save', { id: campaignId, data: campaignData, versionNr }, tokens);

  if (saveResult.data?.success === 0) {
    throw new Error(`populateDefaults save failed: ${saveResult.data?.error || 'unknown'}`);
  }

  return populated;
}

/**
 * Publish a campaign to acceptance. Polls until done (max 3 min).
 *
 * @param {object} tokens
 * @param {string} campaignId
 * @returns {string} Published CDN URL (first product)
 */
export async function publishCampaign(tokens, campaignId) {
  // 1. Fetch campaign
  const { ok, data } = await apiPost('/editor/getCampaign', { type: 'campaign', id: campaignId }, tokens);
  if (!ok || !data?.data) throw new Error(`Failed to fetch campaign ${campaignId}`);

  const campaignData = data.data;
  const market       = campaignData.market;
  const innerData    = campaignData.data;
  if (!market || !innerData) throw new Error('Campaign missing market or data');

  // 2. Fetch acceptance domains
  const setupResult = await apiPost('/resources/load', { resource: 'setup' }, tokens);
  const acceptanceDomains = setupResult.data?.data?.gameApi?.domains?.acceptance || [];
  if (acceptanceDomains.length === 0) throw new Error('No acceptance domains found — is your session valid?');

  // 3. Build tasks + start publish
  const tasks = buildPublishTasks(campaignId, market, innerData, acceptanceDomains, DOMAIN);
  const startResult = await apiPost('/publishing/start', {
    campaignId,
    publishProfile: 'export',
    startDate: null,
    tasks,
  }, tokens);

  if (startResult.data?.success === 0) throw new Error(`Publish start failed: ${startResult.data.error}`);
  const jobToken = startResult.data?.data?.jobToken;
  if (!jobToken) throw new Error('No jobToken received');

  // 4. Poll status
  for (let i = 0; i < 60; i++) {
    await sleep(3000);
    const statusResult = await apiPost('/publishing/status', { jobToken }, tokens);
    const status = statusResult.data?.data?.status;

    if (status === 'finished' || status === 'done' || status === 'completed') {
      const products = statusResult.data?.data?.products || [];
      const firstUrl = products[0]?.url || products[0]?.value || '';
      return firstUrl;
    }
    if (status === 'failed' || status === 'error') {
      throw new Error(`Publish failed: ${statusResult.data?.data?.error || status}`);
    }
  }

  throw new Error('Publish timed out after 3 minutes');
}

// ── Internals ─────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function buildPublishTasks(campaignId, market, innerData, acceptanceDomains, domain) {
  const u    = `${campaignId}_${market}`;
  const uuid = randomUUID();
  const c    = `${campaignId}-${uuid}-${u}`;

  const f = JSON.parse(JSON.stringify(innerData));
  if (f.settings) { f.settings.notifications = {}; f.settings.admin = {}; }
  const p = { settings: f.settings, coupons: [] };

  return [
    { service: 'files',   type: 'storeFile',  extension: 'json', fixed: true, source: JSON.stringify(f), filename: u, resourceId: u },
    { service: 'files',   type: 'storeFile',  extension: 'json', fixed: true, source: JSON.stringify(p), filename: c, resourceId: c },
    { service: 'publish', type: 'product',    name: 'Export public', product: `{{${u}}}` },
    { service: 'publish', type: 'product',    name: 'Export server', product: `{{${c}}}` },
    ...acceptanceDomains.map((domainUrl, i) => ({
      service: 'utilities', type: 'httpRequest',
      url: `https://${domainUrl}/api/game/publish`, method: 'POST_JSON', handleError: true,
      parameters: { domain, campaignId, market, identifier: '', link: `{{${c}}}` },
      resourceId: `urlCallbackResult${i + 1}`,
    })),
  ];
}
