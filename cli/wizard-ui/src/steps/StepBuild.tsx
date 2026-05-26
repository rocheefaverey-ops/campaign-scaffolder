import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { pageMeta, type ScaffoldConfig, type BuildMode, type StepProps, type PageInstance } from '../shared/config.ts';
import { rememberFreshScaffoldCreated } from '../shared/projectNameDefaults.ts';
import { startScaffold, startScaffoldedProject, logoutCape, getGitStatus, getDoctorReport, type LogEvent, type GitStatus, type DoctorResult } from '../bridge.ts';

type BuildState =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'done'; ok: boolean; outputDir?: string };

type AutoRunState =
  | { kind: 'idle' }
  | { kind: 'starting' }
  | { kind: 'ready'; url: string }
  | { kind: 'failed'; error: string };

/** Common auth-failure substrings emitted by CAPE / scaffold.js. */
const AUTH_FAIL_RE = /(userIncorrect|incorrect credentials|unauthori[sz]ed|not logged in|invalid token|expired session|CAPE auth required)/i;

export default function StepBuild({ config, setConfig, goToStep }: StepProps) {
  const [state, setState] = useState<BuildState>({ kind: 'idle' });
  const [lines, setLines] = useState<LogEvent[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const [doctor, setDoctor] = useState<DoctorResult | null>(null);
  const [doctorLoading, setDoctorLoading] = useState(true);
  const [autoRun, setAutoRun] = useState<AutoRunState>({ kind: 'idle' });
  // Synchronous double-click guard. Setting `state` to 'running' inside
  // `start` re-renders + disables the button, but two clicks dispatched in
  // the same paint frame can both enter `start` before React commits. A ref
  // is consulted synchronously and blocks the second call.
  const inFlightRef = useRef(false);

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

  useEffect(() => {
    let cancelled = false;
    setDoctorLoading(true);
    getDoctorReport().then((report) => {
      if (cancelled) return;
      setDoctor(report);
      setDoctorLoading(false);
    });
    return () => { cancelled = true; };
  }, [config.stack, config.game, config.gameId]);

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
  const canStart = state.kind === 'idle' && doctor?.ok !== false && (!safety.requiresOverride || override);
  const canTestRun = state.kind === 'done' && state.ok && Boolean(state.outputDir) && autoRun.kind !== 'starting';

  // Auto-scroll the log to the bottom on each new line.
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [lines]);

  const testRun = async (outputDir: string) => {
    setAutoRun({ kind: 'starting' });
    const runRes = await startScaffoldedProject({ outputDir, stack: config.stack });
    if (runRes.ok && runRes.url) {
      setAutoRun({ kind: 'ready', url: runRes.url });
      window.open(runRes.url, '_blank', 'noopener');
    } else {
      setAutoRun({ kind: 'failed', error: runRes.error ?? 'Failed to start the dev server.' });
    }
  };

  const start = () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLines([]);
    setState({ kind: 'running' });
    setAutoRun({ kind: 'idle' });
    // For 'create' mode while loaded: drop outputDir so scaffold.js routes
    // it to a sibling directory rather than failing on the existing path.
    // loadedProjectDir + loadedFromExisting are also dropped — the server
    // doesn't need them and they'd confuse a fresh-build path. Update /
    // recreate keep outputDir = loadedProjectDir.
    const submitConfig = config.buildMode === 'create'
      ? { ...config, outputDir: undefined, loadedProjectDir: undefined }
      : config;
    const handle = startScaffold(submitConfig, (e) => setLines((prev) => [...prev, e]));
    handle.done.then(async (res) => {
      inFlightRef.current = false;
      if (res.ok && submitConfig.buildMode === 'create') {
        rememberFreshScaffoldCreated(submitConfig.name);
      }
      setState({ kind: 'done', ok: res.ok, outputDir: res.outputDir });
      // Tell the app shell to re-check the CAPE badge — a failed scaffold may
      // have cleared a stale token cache server-side (userIncorrect handling),
      // and the badge should drop the misleading ✓ without a step navigation.
      window.dispatchEvent(new Event('cape:auth-recheck'));

      // Auto-run the freshly scaffolded project if the user opted in.
      if (res.ok && config.autoRunAfterBuild && res.outputDir) {
        await testRun(res.outputDir);
      }
    });
  };

  return (
    <>
      <div>
        <h2 className="step__title">Review &amp; build</h2>
        <p className="step__hint">The wizard will run <code>scaffold.js --config=…</code> with the values below.</p>
      </div>

      <BuildPlan config={config} loaded={isLoadedExisting} />

      <DoctorPanel report={doctor} loading={doctorLoading} onRefresh={async () => {
        setDoctorLoading(true);
        setDoctor(await getDoctorReport());
        setDoctorLoading(false);
      }} />

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input
              type="checkbox"
              checked={Boolean(config.autoRunAfterBuild)}
              onChange={(e) => setConfig({ ...config, autoRunAfterBuild: e.target.checked })}
              style={{ width: 16, height: 16, accentColor: 'var(--color-primary)' }}
            />
            <span>
              <strong>Run it for me after build</strong> — spawn <code>pnpm dev</code> on the scaffolded project and open it in a new tab.
            </span>
          </label>
          <button
            className="btn btn--primary"
            onClick={start}
            disabled={!canStart}
          >
            {modeButtonLabel(config.buildMode, isLoadedExisting)}
          </button>
        </div>
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
        <div className={`banner ${state.ok ? 'banner--ok' : 'banner--err'}`} style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          {state.ok
            ? <>✓ Scaffold complete{state.outputDir ? <> · <code>{state.outputDir}</code></> : null}</>
            : <>✗ Scaffold failed — check the log above.</>}
          {canTestRun && state.outputDir && (
            <button
              type="button"
              className="btn btn--primary"
              style={{ padding: '6px 12px', fontSize: 13 }}
              onClick={() => void testRun(state.outputDir!)}
            >
              Test run
            </button>
          )}
        </div>
      )}

      {autoRun.kind === 'starting' && (
        <div className="banner">⠋ Booting your scaffold… first run may take ~60s for install + cold compile.</div>
      )}
      {autoRun.kind === 'ready' && (
        <div className="banner banner--ok" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span>✓ Dev server running at <code>{autoRun.url}</code></span>
          <a className="btn btn--primary" style={{ padding: '6px 12px', fontSize: 13 }} href={autoRun.url} target="_blank" rel="noreferrer">
            Open ↗
          </a>
        </div>
      )}
      {autoRun.kind === 'failed' && (
        <div className="banner banner--warn" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <span>⚠ Auto-run failed — the scaffold itself was fine, just the dev server didn't come up.</span>
          <pre style={{ marginTop: 8, fontSize: 11, whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>{autoRun.error}</pre>
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

function DoctorPanel({ report, loading, onRefresh }: { report: DoctorResult | null; loading: boolean; onRefresh: () => void }) {
  const warnings = report?.checks.flatMap((check) => check.warnings.map((message) => ({ label: check.label, message }))) ?? [];
  const errors = report?.checks.flatMap((check) => check.errors.map((message) => ({ label: check.label, message }))) ?? [];
  const klass = loading ? '' : report?.ok === false ? 'banner--err' : warnings.length ? 'banner--warn' : 'banner--ok';

  return (
    <section className={`banner ${klass}`} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <strong>Doctor</strong>
        <span style={{ flex: 1 }}>
          {loading
            ? 'Checking scaffolder health...'
            : report === null
              ? 'Could not reach the doctor endpoint.'
              : report.ok
                ? warnings.length ? `${warnings.length} warning${warnings.length === 1 ? '' : 's'} found.` : 'Everything needed for build looks healthy.'
                : `${errors.length} error${errors.length === 1 ? '' : 's'} must be fixed before build.`}
        </span>
        <button type="button" className="btn" onClick={onRefresh} disabled={loading} style={{ padding: '6px 10px', fontSize: 12 }}>
          Refresh
        </button>
      </div>

      {!loading && report && (errors.length > 0 || warnings.length > 0) && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: 'pointer', fontSize: 12 }}>Show details</summary>
          <ul style={{ marginTop: 8, listStyle: 'none', padding: 0, display: 'grid', gap: 6 }}>
            {errors.map((item, index) => (
              <li key={`e-${index}`} style={{ fontSize: 12 }}>
                <strong>error · {item.label}</strong><br />
                <code style={{ wordBreak: 'break-word' }}>{item.message}</code>
              </li>
            ))}
            {warnings.map((item, index) => (
              <li key={`w-${index}`} style={{ fontSize: 12 }}>
                <strong>warning · {item.label}</strong><br />
                <code style={{ wordBreak: 'break-word' }}>{item.message}</code>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

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

function BuildPlan({ config, loaded }: { config: ScaffoldConfig; loaded: boolean }) {
  const resolvedModules = resolveModulesForSummary(config);
  const runtimeRows: Array<[string, string]> = [
    ['Registration', regModeLabel(config.regMode)],
    ['Iframe', config.iframe ? 'enabled' : 'disabled'],
    ['GTM', config.gtmId || 'not configured'],
    ['Languages', formatLanguages(config.defaultLanguage, config.supportedLanguages)],
  ];

  return (
    <section className="build-plan">
      <header className="build-plan__head">
        <div>
          <p className="pages-col__title">Build plan</p>
          <h3>{config.name || 'Untitled campaign'}</h3>
        </div>
        <span className="build-plan__status">{buildModeSummary(config.buildMode, loaded)}</span>
      </header>

      <div className="build-plan__hero">
        <PlanFact label="Output" value={config.outputDir ?? 'Sibling of scaffolder'} mono />
        <PlanFact label="Stack" value={`${config.stack} / ${config.game}`} mono />
        <PlanFact
          label="CAPE"
          value={config.createCape
            ? `Create new${config.capeTitle ? `: ${config.capeTitle}` : ''}`
            : `Use existing #${config.capeId || 'missing id'}`}
          mono
        />
        <PlanFact label="Market" value={`${config.market} / ${config.timezone}`} mono />
      </div>

      <div className="build-plan__grid">
        <PlanSection title="Campaign">
          <PlanRows rows={[
            ['Brand', config.brand || 'Not set'],
            ['Department', config.department || 'Not set'],
            ['Game config', config.gameId || (config.game === 'none' ? 'No game engine' : `${config.game} defaults`)],
            ['Entry route', entryRoute(config.pages, config.flowEntry)],
          ]} />
        </PlanSection>

        <PlanSection title={`Pages (${config.pages.length})`}>
          {config.pages.length === 0 ? (
            <p className="build-plan__empty">No pages selected.</p>
          ) : (
            <ol className="build-plan__routes">
              {config.pages.map((page, index) => {
                const meta = pageMeta(page.type);
                return (
                  <li key={page.id}>
                    <span className="build-plan__step">{index + 1}</span>
                    <span className="build-plan__route-main">
                      <strong>{meta?.label ?? page.type}</strong>
                      <code>{pageRoute(page)}</code>
                    </span>
                    {page.id !== page.type && <span className="build-plan__muted">{page.id}</span>}
                  </li>
                );
              })}
            </ol>
          )}
        </PlanSection>

        <PlanSection title={`Modules (${resolvedModules.length})`}>
          {resolvedModules.length === 0 ? (
            <p className="build-plan__empty">No modules selected.</p>
          ) : (
            <div className="build-plan__pills">
              {resolvedModules.map((module) => <code key={module}>{module}</code>)}
            </div>
          )}
        </PlanSection>

        <PlanSection title="Runtime">
          <PlanRows rows={runtimeRows} />
        </PlanSection>
      </div>
    </section>
  );
}

function PlanFact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="build-plan__fact">
      <span>{label}</span>
      <strong className={mono ? 'build-plan__mono' : undefined}>{value}</strong>
    </div>
  );
}

function PlanSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="build-plan__section">
      <h4>{title}</h4>
      {children}
    </section>
  );
}

function PlanRows({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="build-plan__rows">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function buildModeSummary(mode: BuildMode, loaded: boolean): string {
  if (!loaded) return 'Fresh scaffold';
  if (mode === 'update') return 'Update loaded project';
  if (mode === 'recreate') return 'Delete and rebuild';
  return 'Build fresh copy';
}

function pageRoute(page: PageInstance): string {
  if (page.route) return page.route;
  const meta = pageMeta(page.type);
  return page.id === page.type ? (meta?.route ?? `/${page.id}`) : `/${page.id}`;
}

function entryRoute(pages: PageInstance[], flowEntry?: string): string {
  const page = pages.find((candidate) => candidate.id === flowEntry) ?? pages[0];
  return page ? pageRoute(page) : 'No entry page';
}

function regModeLabel(mode: ScaffoldConfig['regMode']): string {
  if (mode === 'gate') return 'Before gameplay';
  if (mode === 'after') return 'After gameplay';
  return 'Disabled';
}

function formatLanguages(defaultLanguage: string, supportedLanguages: string[]): string {
  const supported = supportedLanguages.length ? supportedLanguages : [defaultLanguage].filter(Boolean);
  if (supported.length === 0) return 'No languages selected';
  return supported.map((code) => code === defaultLanguage ? `${code} default` : code).join(', ');
}

function resolveModulesForSummary(config: ScaffoldConfig): string[] {
  if (config.stack === 'tanstack') return [];
  const modules = new Set<string>(config.modules);
  if (config.game === 'unity' || config.game === 'phaser' || config.game === 'r3f' || config.game === 'memory') {
    modules.add(config.game);
  }

  const pageTypes = new Set(config.pages.map((p) => p.type));
  if (pageTypes.has('register')) modules.add('registration');
  if (pageTypes.has('leaderboard')) modules.add('leaderboard');
  if (pageTypes.has('voucher')) modules.add('voucher');
  if (pageTypes.has('video') || pageTypes.has('intro-video') || pageTypes.has('loading-video') || pageTypes.has('ad-video')) modules.add('video');
  if (pageTypes.has('game') || pageTypes.has('result') || pageTypes.has('register') || pageTypes.has('leaderboard')) modules.add('scoring');
  if (modules.has('leaderboard') || modules.has('registration')) modules.add('scoring');

  return [...modules];
}
