import { DEFAULT_CONFIG, type ScaffoldConfig } from './config.ts';

const STORAGE_KEY = 'livewall-scaffolder.nextProjectVersion';
const FALLBACK_VERSION = 1;
const GENERATED_NAME_RE = /^scaffolder-test-v(\d+)$/;

/** Matches any auto-generated name ending in -v{n}. Returns the version string, or null if user-typed. */
export function autoNameVersion(name: string): string | null {
  const m = /-v(\d+)$/.exec(name);
  return m ? m[1] : null;
}

function readNextVersion(): number {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : FALLBACK_VERSION;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : FALLBACK_VERSION;
  } catch {
    return FALLBACK_VERSION;
  }
}

function writeNextVersion(version: number): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(Math.max(FALLBACK_VERSION, version)));
  } catch {
    // Local storage can be unavailable in hardened browser contexts. The
    // default still works for the current session; persistence is best effort.
  }
}

export function generatedProjectName(version = readNextVersion()): string {
  return `scaffolder-test-v${version}`;
}

export function initialScaffoldConfig(): ScaffoldConfig {
  return {
    ...DEFAULT_CONFIG,
    name: generatedProjectName(),
  };
}

export function rememberFreshScaffoldCreated(projectName: string): void {
  const match = GENERATED_NAME_RE.exec(projectName);
  const versionFromName = match ? Number.parseInt(match[1], 10) : readNextVersion();
  const nextVersion = Math.max(readNextVersion(), versionFromName) + 1;
  writeNextVersion(nextVersion);
}
