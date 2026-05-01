/**
 * Transport abstraction. Today: HTTP + Server-Sent Events to the local
 * Fastify wizard server. Later (VS Code extension): swap the body of
 * these functions for `vscode.postMessage`. The rest of the UI doesn't
 * care which one is in use.
 */

import type { ScaffoldConfig } from './shared/config.ts';

export type LogLevel = 'info' | 'success' | 'warn' | 'error';
export interface LogEvent {
  level: LogLevel;
  line:  string;
  ts:    number;
}

export interface BuildHandle {
  /** Resolves when the build process exits (cleanly or not). */
  done:   Promise<{ ok: boolean; code: number; outputDir?: string }>;
  /** Aborts the SSE listener. Does NOT kill the server-side child process. */
  cancel: () => void;
}

/**
 * Kicks off a scaffold on the server and streams logs back via SSE.
 * Returns immediately with a handle; resolve `done` for completion.
 */
export function startScaffold(
  config:  ScaffoldConfig,
  onLog:   (e: LogEvent) => void,
): BuildHandle {
  let aborted = false;

  const done = (async (): Promise<{ ok: boolean; code: number; outputDir?: string }> => {
    const res = await fetch('/api/scaffold', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(config),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Server rejected scaffold request: ${res.status} ${text}`);
    }
    const { jobId } = await res.json() as { jobId: string };

    return new Promise((resolve) => {
      const es = new EventSource(`/events?jobId=${encodeURIComponent(jobId)}`);

      es.addEventListener('log', (ev) => {
        if (aborted) return;
        try { onLog(JSON.parse((ev as MessageEvent).data) as LogEvent); }
        catch { /* ignore malformed frames */ }
      });

      es.addEventListener('done', (ev) => {
        es.close();
        if (aborted) return;
        try {
          const data = JSON.parse((ev as MessageEvent).data) as { ok: boolean; code: number; outputDir?: string };
          resolve(data);
        } catch {
          resolve({ ok: false, code: -1 });
        }
      });

      es.onerror = () => {
        es.close();
        if (!aborted) resolve({ ok: false, code: -1 });
      };
    });
  })();

  return {
    done,
    cancel: () => { aborted = true; },
  };
}

/** Lightweight ping — used by the UI to confirm the wizard server is up. */
export async function ping(): Promise<boolean> {
  try {
    const res = await fetch('/api/ping');
    return res.ok;
  } catch {
    return false;
  }
}

// ─── CAPE auth ───────────────────────────────────────────────────────────────

export interface AuthStatus {
  authenticated: boolean;
  userId?:       string | null;
}

export async function getAuthStatus(): Promise<AuthStatus> {
  try {
    const res = await fetch('/api/auth/status');
    if (!res.ok) return { authenticated: false };
    return (await res.json()) as AuthStatus;
  } catch {
    return { authenticated: false };
  }
}

export async function loginCape(email: string, password: string): Promise<{ ok: boolean; error?: string; userId?: string | null }> {
  try {
    const res = await fetch('/api/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data?.error ?? `Login failed (${res.status})` };
    return { ok: true, userId: data?.userId ?? null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error.' };
  }
}

export async function logoutCape(): Promise<void> {
  try { await fetch('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
}

// ─── Load existing scaffolded project ───────────────────────────────────────

export interface LoadedScaffolded {
  ok:           boolean;
  error?:       string;
  markerPath?:  string;
  projectDir?:  string;
  /** Raw JSON from the project's .scaffolded marker. Shape varies by scaffolder version. */
  scaffolded?:  Record<string, unknown>;
}

// ─── Git status ─────────────────────────────────────────────────────────────

export interface GitFile { status: string; path: string }
export interface GitStatus {
  ok:     boolean;
  error?: string;
  isRepo: boolean;
  exists: boolean;
  clean:  boolean;
  branch: string | null;
  files:  GitFile[];
}

/**
 * Run `git status` against the loaded project so the wizard can warn
 * (or block) before an in-place update / destructive recreate.
 */
export async function getGitStatus(path: string): Promise<GitStatus> {
  const fallback: GitStatus = { ok: false, isRepo: false, exists: false, clean: true, branch: null, files: [] };
  try {
    const res = await fetch('/api/git-status', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ path }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ...fallback, error: (data as { error?: string }).error ?? `Status check failed (${res.status})` };
    return { ...(data as GitStatus), ok: true };
  } catch (err) {
    return { ...fallback, error: err instanceof Error ? err.message : 'Network error.' };
  }
}

/**
 * Look up a `.scaffolded` marker at the given path (project root or its
 * `frontend/` subdir). Returns the raw config JSON for the wizard UI to
 * translate into a ScaffoldConfig.
 */
export async function loadExisting(path: string): Promise<LoadedScaffolded> {
  try {
    const res = await fetch('/api/load-existing', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ path }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: (data as { error?: string }).error ?? `Load failed (${res.status})` };
    return { ok: true, ...(data as Record<string, unknown>) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error.' };
  }
}
