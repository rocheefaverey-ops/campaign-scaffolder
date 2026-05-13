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
import { resolve, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const SCAFFOLDER_ROOT = resolve(__dirname, '..');

// ── Constants ─────────────────────────────────────────────────────────────────

const API_URL    = 'https://api-acceptance.campaigndesigner.io';
const MEDIA_URL  = 'https://services-acceptance.api.bycape.io';
const ORIGIN     = 'https://engagement.acceptance.campaigndesigner.io';
const DOMAIN     = 'engagement';
const AUTH_FILE  = `${homedir()}/.cape/tokens.json`;

const MIME_TYPES = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  webp: 'image/webp', svg: 'image/svg+xml', mp4: 'video/mp4', webm: 'video/webm',
};
const CAPE_FILE_TYPES = {
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image', svg: 'image',
  mp4: 'video', webm: 'video',
};

/**
 * Brand assets to seed into every new campaign.
 * Only core, always-visible fields — content fields (step images, win/lose,
 * hero images etc.) are left empty for the client to fill in CAPE.
 */
// Pre-uploaded stable template assets (uploaded once to account-60, reused for every new campaign).
// To refresh: upload via uploadAsset() and replace the url + uuid below.
const _FAVICON      = { url: 'https://storage-acceptance.bycape.io/account-60/upload/1152b463-134b-4862-8326-b6e287e12013_favicon.svg',                  extension: 'svg',  title: 'favicon',               fileName: 'favicon.svg',                size: 258,      type: 'image' };
const _MARK         = { url: 'https://storage-acceptance.bycape.io/account-60/upload/1269b875-9033-4f15-82a1-057f0a763eaf_logo-livewall-mark.svg',       extension: 'svg',  title: 'logo-livewall-mark',    fileName: 'logo-livewall-mark.svg',     size: 264,      type: 'image' };
const _LOGO_ZWART   = { url: 'https://storage-acceptance.bycape.io/account-60/upload/53b25b87-abc6-41a8-8b1b-ea2fa6737cd5_livewall-logo-zwart.webp',     extension: 'webp', title: 'livewall-logo-zwart',   fileName: 'livewall-logo-zwart.webp',   size: 692558,   type: 'image' };
const _HERO_MOB     = { url: 'https://storage-acceptance.bycape.io/account-60/upload/a8f3f0e6-de67-4ffb-aa90-c2cd9217492c_hero-mobile.png',              extension: 'png',  title: 'hero-mobile',           fileName: 'hero-mobile.png',            size: 4940471,  type: 'image' };
const _AMBIENT_BG   = { url: 'https://storage-acceptance.bycape.io/account-60/upload/8f1ef5bb-5f40-4af5-a006-50de236e6bff_ambient-bg.mp4',              extension: 'mp4',  title: 'ambient-bg',            fileName: 'ambient-bg.mp4',             size: 1244781,  type: 'video' };
const _HEADER_VIDEO = { url: 'https://storage-acceptance.bycape.io/account-60/upload/8c9d3de1-bc42-4a8f-bc5f-e204a6cd1dc7_header-video.mp4',            extension: 'mp4',  title: 'header-video',          fileName: 'header-video.mp4',           size: 14254076, type: 'video' };
const _VIDEO        = { url: 'https://storage-acceptance.bycape.io/account-60/upload/af4c37b4-6782-4948-9a86-e5adecb1664e_intro-livewall.mp4',          extension: 'mp4',  title: 'intro-livewall',        fileName: 'intro-livewall.mp4',         size: 7390553,  type: 'video' };
const _FLOW_VIDEO        = { url: 'https://storage-acceptance.bycape.io/account-60/upload/159781c3-454b-494d-bdde-4fb3bb66f7ed_Flow_202605121624.mp4',          extension: 'mp4',  title: 'flow',                  fileName: 'Flow_202605121624.mp4',      size: 8838035,  type: 'video' };
// TODO: upload brand-assets/video/background.mp4 via uploadAsset() and replace url + uuid below
const _BACKGROUND_VIDEO  = { url: 'https://storage-acceptance.bycape.io/account-60/upload/REPLACE_WITH_UUID_background.mp4',                                   extension: 'mp4',  title: 'background',            fileName: 'background.mp4',             size: 0,        type: 'video' };

const TEMPLATE_ASSET_SEEDS = [
  // ── Global brand ──────────────────────────────────────────────────────────
  { capeFile: _FAVICON,      fields: ['settings.branding.favicon', 'general.header.menuBtnBg', 'general.header.menuIcon'] },
  { capeFile: _MARK,         fields: ['general.header.logo'] },
  { capeFile: _LOGO_ZWART,   fields: ['desktop.logo'] },
  { capeFile: _HEADER_VIDEO, fields: ['desktop.backgroundIllustration'] },

  // ── Landing page ──────────────────────────────────────────────────────────
  { capeFile: _AMBIENT_BG,   fields: ['general.landing.background'] },
  { capeFile: _BACKGROUND_VIDEO, fields: ['files.landing.backgroundImage'] },
  { capeFile: _FLOW_VIDEO,       fields: ['files.landing.heroImage'] },
  { capeFile: _LOGO_ZWART,   fields: ['general.landing.logo'] },
  { capeFile: _VIDEO,        fields: ['files.landing.heroVideo'] },

  // ── Onboarding page (up to 5 steps) ──────────────────────────────────────
  { capeFile: _AMBIENT_BG,   fields: ['general.onboarding.background'] },
  { capeFile: _FLOW_VIDEO,   fields: [
    'general.onboarding.heroImage',
    'files.onboarding.step1Image', 'files.onboarding.step2Image',
    'files.onboarding.step3Image', 'files.onboarding.step4Image',
    'files.onboarding.step5Image',
  ]},
  { capeFile: _LOGO_ZWART,   fields: ['general.onboarding.logo'] },

  // ── Result page ───────────────────────────────────────────────────────────
  { capeFile: _AMBIENT_BG,   fields: ['general.result.background'] },
  { capeFile: _FLOW_VIDEO,   fields: ['files.result.winImage', 'files.result.loseImage'] },
  { capeFile: _LOGO_ZWART,   fields: ['general.result.logo'] },

  // ── Voucher page ──────────────────────────────────────────────────────────
  { capeFile: _FLOW_VIDEO,   fields: ['files.voucher.voucherImage'] },

  // ── Video pages — default 'video' instance + named variants ───────────────
  // instanceId 'video'         → modelId 'video'
  // instanceId 'intro-video'   → modelId 'introVideo'
  // instanceId 'loading-video' → modelId 'loadingVideo'
  // instanceId 'ad-video'      → modelId 'adVideo'
  { capeFile: _VIDEO,        fields: [
    'general.video.introVideo',        'files.video.loadingVideo',
    'general.introVideo.introVideo',   'files.introVideo.loadingVideo',
    'general.loadingVideo.introVideo', 'files.loadingVideo.loadingVideo',
    'general.adVideo.introVideo',      'files.adVideo.loadingVideo',
  ]},
  { capeFile: _LOGO_ZWART,   fields: [
    'general.video.logo',
    'general.introVideo.logo',
    'general.loadingVideo.logo',
    'general.adVideo.logo',
  ]},
];

/** Base format all new scaffolded campaigns are created from. */
export const DEFAULT_FORMAT_PATH = 'livewall_scaffolder_test';

export function stripInterfaceSetupForCapeSave(obj) {
  if (Array.isArray(obj)) return obj.map(stripInterfaceSetupForCapeSave);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'defaultValue' && typeof value === 'string') continue;
      out[key] = stripInterfaceSetupForCapeSave(value);
    }
    return out;
  }
  return obj;
}

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
  const res = await fetch(`${API_URL}${endpoint}`, {
    method:  'POST',
    headers: makeHeaders(tokens),
    body:    JSON.stringify(body),
  });
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    throw new Error(`CAPE API ${endpoint} returned non-JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

/**
 * Fetch a campaign. If the session cookie causes CAPE to return empty data
 * (expired / conflicting session), retries using authToken only.
 */
async function getCampaign(campaignId, tokens) {
  const body = { type: 'campaign', id: campaignId };
  const { ok, data } = await apiPost('/editor/getCampaign', body, tokens);
  if (ok && data?.data) return { ok, data };

  // Session cookie may be stale — retry without it
  if (tokens.sessionCookie) {
    const { sessionCookie: _, ...tokensBare } = tokens;
    const retry = await apiPost('/editor/getCampaign', body, tokensBare);
    if (retry.ok && retry.data?.data) return retry;
  }
  return { ok, data };
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
 * Clear cached CAPE tokens (typically before forcing re-login).
 * Deletes the token file so checkAuth() returns null.
 */
export async function clearTokenCache() {
  try {
    const fs = await import('fs/promises');
    await fs.unlink(AUTH_FILE);
  } catch {
    // File doesn't exist — that's fine
  }
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
  const { ok, data } = await getCampaign(campaignId, tokens);
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
    // CAPE stores both publishProfiles and interfaceSetup as JSON strings in the format API
    publishProfiles: JSON.stringify(formatFile.publishProfiles ?? formatData.publishProfiles),
    interfaceSetup:  JSON.stringify(stripInterfaceSetupForCapeSave(formatFile.interfaceSetup)),
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
  const { ok, data } = await getCampaign(campaignId, tokens);
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
 * Upload a local file to CAPE media storage.
 * Returns a CAPE file object: { url, extension, title, fileName, size, type }.
 *
 * @param {object} tokens   — must have mediaToken
 * @param {string} filePath — absolute local path
 */
export async function uploadAsset(tokens, filePath) {
  if (!tokens.mediaToken) throw new Error('No mediaToken in session — re-login required');

  const filename    = basename(filePath);
  const ext         = extname(filename).slice(1).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  // Step 1: Get signed GCS upload URL
  const urlRes = await fetch(`${MEDIA_URL}/v3/media/uploadtocloud`, {
    method:  'POST',
    headers: {
      'Accept':        'application/json',
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${tokens.mediaToken}`,
      'Origin':        ORIGIN,
    },
    body: JSON.stringify({ filename }),
  });
  if (!urlRes.ok) throw new Error(`Upload URL request failed: ${urlRes.status}`);
  const urlData = await urlRes.json();
  if (urlData.success === 0) throw new Error(`Upload URL error: ${urlData.error}`);

  // Step 2: PUT file to GCS
  const fileBuffer = await readFile(filePath);
  const uploadRes  = await fetch(urlData.uploadUrl, {
    method:  'PUT',
    headers: { 'Content-Type': contentType },
    body:    fileBuffer,
  });
  if (!uploadRes.ok) throw new Error(`File upload failed: ${uploadRes.status}`);

  // Step 3: Build CAPE-format file object
  const finalUrl = urlData.uploadUrl
    .split('?')[0]
    .replace('storage.googleapis.com/cape-shared-media-acc', 'storage-acceptance.bycape.io');

  return {
    url:       finalUrl,
    extension: ext,
    title:     basename(filename, extname(filename)),
    fileName:  filename,
    size:      fileBuffer.length,
    type:      CAPE_FILE_TYPES[ext] || 'file',
  };
}

/**
 * Seed a campaign's brand fields with stable pre-uploaded Livewall placeholder assets.
 * No uploads — uses hardcoded URLs from TEMPLATE_ASSET_SEEDS.
 * Only seeds fields that are currently empty (null / undefined / []).
 *
 * @param {object} tokens
 * @param {string} campaignId
 * @param {object} [opts]
 * @param {boolean} [opts.force=false]  overwrite fields that already have a value
 * @returns {{ seeded: number, warnings: string[] }}
 */
export async function seedTemplateAssets(tokens, campaignId, { force = false } = {}) {
  // 1. Fetch current campaign data
  const { ok, data } = await getCampaign(campaignId, tokens);
  if (!ok || !data?.data) throw new Error(`Failed to fetch campaign ${campaignId}`);

  const fullData     = data.data;
  const campaignData = JSON.parse(JSON.stringify(fullData.data || {}));

  // 2. Set fields using pre-uploaded stable template asset URLs (no upload needed)
  let seeded = 0;
  for (const seed of TEMPLATE_ASSET_SEEDS) {
    for (const fieldPath of seed.fields) {
      const parts = fieldPath.split('.');
      let cur = campaignData;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
        cur = cur[parts[i]];
      }
      const last     = parts[parts.length - 1];
      const existing = cur[last];
      const isEmpty  = existing === undefined || existing === null
                    || (Array.isArray(existing) && existing.length === 0)
                    || (existing && typeof existing === 'object' && !Array.isArray(existing) && Object.keys(existing).length === 0);
      if (isEmpty || force) {
        cur[last] = [seed.capeFile];
        seeded++;
      }
    }
  }

  // 3. Save
  const versionNr  = String(fullData.versionNr || fullData.version || '1');
  const saveResult = await apiPost('/editor/save', { id: campaignId, data: campaignData, versionNr }, tokens);
  if (saveResult.data?.success === 0) {
    throw new Error(`seedTemplateAssets save failed: ${saveResult.data?.error || 'unknown'}`);
  }

  return { seeded, warnings: [] };
}

/**
 * Delete a campaign permanently.
 *
 * @param {object} tokens
 * @param {string} campaignId
 */
export async function deleteCampaign(tokens, campaignId) {
  const { ok, data } = await apiPost('/campaigns/delete', { id: campaignId }, tokens);
  if (!ok || data?.success === 0) {
    throw new Error(`Campaign delete failed: ${data?.error || JSON.stringify(data)}`);
  }
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
  const { ok, data } = await getCampaign(campaignId, tokens);
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
