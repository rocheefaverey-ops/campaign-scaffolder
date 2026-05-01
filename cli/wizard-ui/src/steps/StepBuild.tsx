import { useEffect, useMemo, useRef, useState } from 'react';
import type { ScaffoldConfig, BuildMode, StepProps } from '../shared/config.ts';
import { startScaffold, logoutCape, getGitStatus, type LogEvent, type GitStatus } from '../bridge.ts';

type BuildState =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'done'; ok: boolean; outputDir?: string };

/** Common auth-failure substrings emitted by CAPE / scaffold.js. */
const AUTH_FAIL_RE = /(userIncorrect|incorrect credentials|unauthori[sz]ed|not logged in|invalid token|expired session|CAPE auth required)/i;

export default function StepBuild({ config, setConfig, goToStep }: StepProps) {
  const [state, setState] = useState<BuildState>({ kind: 'idle' });
  const [lines, setLines] = useState<LogEvent[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  // The mode picker shows whenever the wizard was populated from an existing
  // project. `loadedProjectDir` is sticky across mode changes, so the user
  // can flip between update / recreate / fresh-copy without losing the path.
  const isLoadedExisting = Boolean(config.loadedProjectDir);

  // Git status of the loaded project. Refetched when loadedProjectDir changes
  // so the wizard reflects external commits/stashes the user makes between
  // loading and clicking Build. Null while loading.
  const [git, setGit] = useState<GitStatus | null>(null);
  // Explicit override checkbox for unsafe combos (dirty recreate, non-repo update).
  const [override, setOverride] = useState(false);

  useEffect(() => {
    if (!config.loadedProjectDir) { setGit(null); return; }
    setGit(null);
    getGitStatus(config.loadedProjectDir).then(setGit);
  }, [config.loadedProjectDir]);

  const authFailure = useMemo(
    () => state.kind === 'done' && !state.ok && lines.some(l => AUTH_FAIL_RE.test(l.line)),
    [state, lines],
  );

  const setMode = (mode: BuildMode) => {
    setOverride(false); // any mode change resets the override
    setConfig({ ...config, buildMode: mode });
  };

  /** Compute whether the chosen mode is safe + whether to require an override. */
  const safety = useMemo(() => evalSafety(config.buildMode, git, isLoadedExisting), [config.buildMode, git, isLoadedExisting]);
  const canStart = state.kind === 'idle' && (!safety.requiresOverride || override);

  // Auto-scroll the log to the bottom on each new line.
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [lines]);

  const start = () => {
    setLines([]);
    setState({ kind: 'running' });
    // For 'create' mode while loaded: drop outputDir so scaffold.js routes
    // it to a sibling directory rather than failing on the existing path.
    // loadedProjectDir + loadedFromExisting are also dropped — the server
    // doesn't need them and they'd confuse a fresh-build path. Update /
    // recreate keep outputDir = loadedProjectDir.
    const submitConfig = config.buildMode === 'create'
      ? { ...config, outputDir: undefined, loadedProjectDir: undefined }
      : config;
    const handle = startScaffold(submitConfig, (e) => setLines((prev) => [...prev, e]));
    handle.done.then((res) => {
      setState({ kind: 'done', ok: res.ok, outputDir: res.outputDir });
    });
  };

  return (
    <>
      <div>
        <h2 className="step__title">Review &amp; build</h2>
        <p className="step__hint">The wizard will run <code>scaffold.js --config=…</code> with the values below.</p>
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--color-line)', borderRadius: 12, padding: 16 }}>
        <Summary config={config} />
      </div>

      {isLoadedExisting && (
        <section className="build-mode">
          <header>
            <h3 className="pages-col__title">How should this build apply?</h3>
            <p className="step__hint">
              You loaded an existing project. Pick what should happen when you click <strong>Start build</strong>:
            </p>
          </header>
          <div className="build-mode__opts">
            <ModeOption
              mode="update"
              label="Update in place"
              hint="Rewrite files inside the loaded project. Module files + tokens are re-applied; manual code edits stay as a git diff you can keep or revert. Recommended."
              current={config.buildMode}
              onClick={setMode}
            />
            <ModeOption
              mode="recreate"
              label="Recreate (destructive)"
              hint="Delete the loaded project's directory and rebuild from scratch. Use when the structure has changed significantly. Make sure your work is committed first."
              current={config.buildMode}
              onClick={setMode}
            />
            <ModeOption
              mode="create"
              label="Build a fresh copy"
              hint="Scaffold to a new directory next to the loaded one. The original stays untouched."
              current={config.buildMode}
              onClick={setMode}
            />
          </div>
          {config.buildMode === 'recreate' && (
            <div className="banner banner--warn" style={{ marginTop: 6 }}>
              ⚠ <strong>{config.outputDir}</strong> will be deleted before the rebuild starts. Commit any pending changes first.
            </div>
          )}

          {/* Git safety panel — concrete state of the loaded project + any
              required override checkbox before Build can proceed. */}
          <GitPanel git={git} mode={config.buildMode} safety={safety} override={override} setOverride={setOverride} />
        </section>
      )}

      {state.kind === 'idle' && (
        <button
          className="btn btn--primary"
          onClick={start}
          disabled={!canStart}
          style={{ alignSelf: 'flex-start' }}
        >
          {modeButtonLabel(config.buildMode, isLoadedExisting)}
        </button>
      )}

      {(state.kind === 'running' || state.kind === 'done') && (
        <div className="log" ref={logRef}>
          {lines.map((l, i) => (
            <div key={i} className={`log__line log__line--${l.level}`}>{l.line}</div>
          ))}
          {state.kind === 'running' && <div className="log__line">⠋ working…</div>}
        </div>
      )}

      {state.kind === 'done' && (
        <div className={`banner ${state.ok ? 'banner--ok' : 'banner--err'}`}>
          {state.ok
            ? <>✓ Scaffold complete{state.outputDir ? <> · <code>{state.outputDir}</code></> : null}</>
            : <>✗ Scaffold failed — check the log above.</>}
        </div>
      )}

      {authFailure && (
        <div className="banner banner--warn" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span>
            CAPE rejected your session — your cached login is stale or for a different account.
            Sign in fresh and try again.
          </span>
          <button
            className="btn btn--primary"
            style={{ padding: '6px 12px', fontSize: 13 }}
            onClick={async () => {
              await logoutCape();
              goToStep('cape');
            }}
          >
            Re-authenticate →
          </button>
        </div>
      )}
    </>
  );
}

function ModeOption({ mode, label, hint, current, onClick }:
  { mode: BuildMode; label: string; hint: string; current: BuildMode; onClick: (m: BuildMode) => void }
) {
  const selected = current === mode;
  return (
    <button type="button" className={`card${selected ? ' is-selected' : ''}`} onClick={() => onClick(mode)}>
      <div className="card__label">{label}</div>
      <div className="card__hint">{hint}</div>
    </button>
  );
}

function modeButtonLabel(mode: BuildMode, loaded: boolean): string {
  if (!loaded) return 'Start build';
  if (mode === 'update')   return 'Update in place';
  if (mode === 'recreate') return 'Delete & rebuild';
  return 'Build fresh copy';
}

// ─── Git safety ─────────────────────────────────────────────────────────────

interface Safety {
  /** When true, the Build button is disabled until the user ticks the override checkbox. */
  requiresOverride: boolean;
  /** Severity for visual treatment in GitPanel. */
  level: 'ok' | 'info' | 'warn' | 'block';
  /** One-line summary of the situation. */
  message: string;
  /** Optional override-checkbox label for unsafe combos. */
  overrideLabel?: string;
}

function evalSafety(mode: BuildMode, git: GitStatus | null, isLoaded: boolean): Safety {
  if (!isLoaded || !git) return { requiresOverride: false, level: 'ok', message: '' };

  // Not a git repo at all → no rollback available.
  if (!git.isRepo) {
    if (mode === 'recreate') {
      return {
        requiresOverride: true, level: 'block',
        message: 'No git repo here. Recreate will permanently delete the directory with no way to recover.',
        overrideLabel: 'I understand. Permanently delete this directory.',
      };
    }
    if (mode === 'update') {
      return {
        requiresOverride: true, level: 'warn',
        message: 'No git repo here. An update will overwrite files with no way to roll back.',
        overrideLabel: 'I understand. Proceed without git safety net.',
      };
    }
    return { requiresOverride: false, level: 'ok', message: '' };
  }

  // Git repo present.
  if (git.clean) {
    return {
      requiresOverride: false, level: 'ok',
      message: `Working tree clean on branch ${git.branch ?? '—'}. Safe to proceed.`,
    };
  }

  // Dirty repo.
  if (mode === 'recreate') {
    return {
      requiresOverride: true, level: 'block',
      message: `${git.files.length} uncommitted change${git.files.length === 1 ? '' : 's'} on ${git.branch ?? '—'}. Recreate WILL delete them all.`,
      overrideLabel: 'I have committed / stashed what I need. Delete everything.',
    };
  }
  if (mode === 'update') {
    return {
      requiresOverride: false, level: 'info',
      message: `${git.files.length} uncommitted change${git.files.length === 1 ? '' : 's'} on ${git.branch ?? '—'}. Module files + tokens will be re-applied; your edits will appear in the diff for review.`,
    };
  }
  return { requiresOverride: false, level: 'ok', message: '' };
}

function GitPanel({ git, mode, safety, override, setOverride }:
  { git: GitStatus | null; mode: BuildMode; safety: Safety; override: boolean; setOverride: (b: boolean) => void }
) {
  if (mode === 'create') return null;
  if (git === null) return <div className="banner">Checking git status…</div>;
  if (!git.exists)  return <div className="banner banner--err">Path does not exist on disk.</div>;

  const klass = safety.level === 'block' ? 'banner--err'
              : safety.level === 'warn'  ? 'banner--warn'
              : safety.level === 'ok'    ? 'banner--ok'
              : '';

  return (
    <div className={`git-panel banner ${klass}`} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <strong>{git.isRepo ? `git · ${git.branch ?? 'detached'}` : 'no git repo'}</strong>
        <span style={{ flex: 1 }}>{safety.message}</span>
      </div>

      {git.isRepo && !git.clean && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: 'pointer', fontSize: 12 }}>
            Show {git.files.length} change{git.files.length === 1 ? '' : 's'}
          </summary>
          <ul style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 12, listStyle: 'none', padding: 0 }}>
            {git.files.slice(0, 50).map((f, i) => (
              <li key={i} style={{ display: 'flex', gap: 8 }}>
                <code style={{ minWidth: 24, opacity: 0.7 }}>{f.status}</code>
                <code style={{ wordBreak: 'break-all' }}>{f.path}</code>
              </li>
            ))}
            {git.files.length > 50 && <li style={{ opacity: 0.6 }}>…and {git.files.length - 50} more</li>}
          </ul>
        </details>
      )}

      {safety.requiresOverride && (
        <label style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={override}
            onChange={(e) => setOverride(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: 'var(--color-primary)' }}
          />
          <span style={{ fontSize: 13 }}>{safety.overrideLabel}</span>
        </label>
      )}
    </div>
  );
}

function Summary({ config }: { config: ScaffoldConfig }) {
  const rows: Array<[string, string]> = [
    ['Stack',     `${config.stack} + ${config.game}`],
    ['Name',      config.name || '—'],
    ['CAPE',      config.createCape
                    ? `Create new${config.capeTitle ? ` — "${config.capeTitle}"` : ' (auto-titled)'}`
                    : `Existing #${config.capeId || '—'}`],
    ['Market',    config.market],
    ['Pages',     config.pages.join(', ') || '—'],
    ['Modules',   config.modules.join(', ') || '—'],
    ['Output',    config.outputDir ?? '(sibling of scaffolder)'],
  ];
  return (
    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}>
            <td style={{ padding: '6px 0', color: 'var(--color-text-soft)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', width: 110 }}>{k}</td>
            <td style={{ padding: '6px 0', fontFamily: 'var(--font-mono)', fontSize: 13 }}>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
