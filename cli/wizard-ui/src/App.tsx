import { Component, useState, useEffect, type ErrorInfo, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { DEFAULT_CONFIG, type ScaffoldConfig } from './shared/config.ts';
import { initialScaffoldConfig } from './shared/projectNameDefaults.ts';
import { fromScaffolded } from './shared/fromScaffolded.ts';
import { ping, getAuthStatus, loadExisting, type AuthStatus } from './bridge.ts';
import StepStack    from './steps/StepStack.tsx';
import StepProject  from './steps/StepProject.tsx';
import StepPages    from './steps/StepPages.tsx';
import StepGames    from './steps/StepGames.tsx';
import StepCape     from './steps/StepCape.tsx';
import StepBuild    from './steps/StepBuild.tsx';

const STEPS = [
  { id: 'stack',   label: 'Stack',   Component: StepStack },
  { id: 'project', label: 'Project', Component: StepProject },
  { id: 'pages',   label: 'Pages',   Component: StepPages },
  { id: 'games',   label: 'Game',    Component: StepGames },
  { id: 'cape',    label: 'CAPE',    Component: StepCape },
  { id: 'build',   label: 'Build',   Component: StepBuild },
] as const;

// Bump the version suffix if the persisted shape becomes incompatible — old
// payloads are then ignored instead of crashing the wizard on restore.
const WIZARD_STATE_KEY = 'livewall-scaffolder.wizardState.v1';

interface PersistedState {
  config: ScaffoldConfig;
  stepIdx: number;
  maxReachedStep: number;
}

function readPersistedState(): PersistedState | null {
  // Opt-out via URL — `?reset` clears persistence before reading. Handy when
  // a stale payload is breaking the wizard and the user can't reach the UI's
  // Start-fresh button.
  try {
    if (typeof window !== 'undefined' && window.location.search.includes('reset')) {
      window.localStorage.removeItem(WIZARD_STATE_KEY);
      return null;
    }
  } catch { /* ignore */ }

  try {
    const raw = window.localStorage.getItem(WIZARD_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (!parsed || typeof parsed !== 'object' || !parsed.config) return null;
    parsed.config = sanitizeConfig(parsed.config);
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Reconcile a persisted config with DEFAULT_CONFIG so that:
 *   - every key DEFAULT_CONFIG defines is present (missing → default),
 *   - object-typed keys are never null/undefined/wrong-shape (e.g. an old
 *     payload with `pageSettings: null` would otherwise crash on first read).
 * Top-level only — nested fields with their own defaults (per-page settings)
 * are still merged at use-site via `?? def.default`.
 */
function sanitizeConfig(raw: Partial<ScaffoldConfig>): ScaffoldConfig {
  const out: Record<string, unknown> = { ...DEFAULT_CONFIG, ...raw };
  for (const [key, defaultValue] of Object.entries(DEFAULT_CONFIG)) {
    const value = out[key];
    if (defaultValue !== null && typeof defaultValue === 'object') {
      const isArr = Array.isArray(defaultValue);
      const ok = isArr ? Array.isArray(value) : (value !== null && typeof value === 'object');
      if (!ok) out[key] = defaultValue;
    }
  }
  return out as unknown as ScaffoldConfig;
}

function writePersistedState(state: PersistedState): void {
  try {
    window.localStorage.setItem(WIZARD_STATE_KEY, JSON.stringify(state));
  } catch {
    // Best-effort — hardened browser contexts can deny storage.
  }
}

function clearPersistedState(): void {
  try { window.localStorage.removeItem(WIZARD_STATE_KEY); } catch { /* ignore */ }
}

export default function App() {
  return (
    <WizardErrorBoundary>
      <AppInner />
    </WizardErrorBoundary>
  );
}

function AppInner() {
  const persisted = typeof window !== 'undefined' ? readPersistedState() : null;
  const [config, setConfig]                 = useState<ScaffoldConfig>(() => persisted?.config ?? initialScaffoldConfig());
  const [stepIdx, setStepIdx]               = useState(() => persisted?.stepIdx ?? 0);
  const [maxReachedStep, setMaxReachedStep] = useState(() => persisted?.maxReachedStep ?? 0);
  const [restored, setRestored]             = useState(persisted !== null);
  const [serverUp, setServerUp]             = useState<boolean | null>(null);
  const [auth, setAuth]                     = useState<AuthStatus | null>(null);
  // Inline validation message shown when the user clicks Next on an invalid
  // step. Used to be a blocking `alert()` — accessibility-hostile and threw
  // away any accidental stack trace. Cleared on step change.
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let timer: number | undefined;

    const check = async () => {
      const ok = await ping();
      if (cancelled) return;
      setServerUp(ok);
      if (!ok && attempts < 20) {
        attempts += 1;
        timer = window.setTimeout(check, 1000);
      }
    };

    void check();

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  // Persist wizard progress so a crash, refresh, or accidental close doesn't
  // wipe everything the user just entered. Restored on next mount; cleared
  // explicitly via the "Start fresh" button.
  useEffect(() => {
    console.log('[persist] writing state', { stepIdx, maxReachedStep, configKeys: Object.keys(config) });
    writePersistedState({ config, stepIdx, maxReachedStep });
  }, [config, stepIdx, maxReachedStep]);

  const startFresh = () => {
    clearPersistedState();
    setConfig(initialScaffoldConfig());
    setStepIdx(0);
    setMaxReachedStep(0);
    setRestored(false);
    setValidationError(null);
  };

  // Refresh auth status whenever we land on the CAPE step — the user may
  // have just logged in inline, and the header badge should reflect it.
  useEffect(() => { getAuthStatus().then(setAuth); }, [stepIdx]);

  // Also refresh on window focus and after StepBuild signals a finish — a
  // scaffold that failed with userIncorrect clears the bad token cache
  // server-side, and the badge should drop the misleading ✓ without forcing a
  // step navigation.
  useEffect(() => {
    const refresh = () => { getAuthStatus().then(setAuth); };
    window.addEventListener('focus', refresh);
    window.addEventListener('cape:auth-recheck', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('cape:auth-recheck', refresh);
    };
  }, []);

  const Current = STEPS[stepIdx].Component;
  const isFirst = stepIdx === 0;
  const isLast  = stepIdx === STEPS.length - 1;

  // Each step exposes a `validate(config) => string | null` static if it wants
  // gating. For now Stack always valid; Project enforces name + capeId.
  const validateCurrent = (): string | null => {
    const v = (Current as unknown as { validate?: (c: ScaffoldConfig) => string | null }).validate;
    return v ? v(config) : null;
  };

  const next = () => {
    const err = validateCurrent();
    if (err) { setValidationError(err); return; }
    setValidationError(null);
    const newIdx = Math.min(stepIdx + 1, STEPS.length - 1);
    setMaxReachedStep((m) => Math.max(m, newIdx));
    setStepIdx(newIdx);
  };

  const back = () => { setValidationError(null); setStepIdx((i) => Math.max(i - 1, 0)); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Enter' && !isLast) { e.preventDefault(); next(); }
      if (e.key === 'Escape' && !isFirst) { e.preventDefault(); back(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const jumpToStep = (i: number) => {
    if (i !== stepIdx && i <= maxReachedStep) { setValidationError(null); setStepIdx(i); }
  };

  return (
    <div className="app">
      <header className="app__head">
        <div className="app__brand">
          <span className="app__brand-mark" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 1.8v14.4M3.2 5.6l11.6 6.8M14.8 5.6 3.2 12.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </span>
          <h1>Livewall Campaign Wizard <span>scaffold a new campaign</span></h1>
        </div>
        <div className="app__head-right">
          <OpenExistingButton onLoaded={(cfg) => {
            setConfig(cfg);
            const last = STEPS.length - 1;
            setMaxReachedStep(last);
            setStepIdx(last);
          }} />
          <button
            type="button"
            className="btn btn--tertiary btn--sm"
            onClick={startFresh}
            title="Discard saved wizard progress and start a new campaign"
          >
            ↺ Start fresh
          </button>
          <AuthBadge auth={auth} />
        </div>
      </header>

      <main className="app__main">
        {serverUp === false && (
          <div className="banner banner--err">
            Wizard server not reachable on <code>:3737</code>. Make sure <code>pnpm wizard</code> is running.
          </div>
        )}
        {restored && (
          <div className="banner" role="status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span>Resumed your previous wizard progress. Use <strong>Start fresh</strong> in the header to discard it.</span>
            <button type="button" className="btn btn--tertiary btn--sm" onClick={() => setRestored(false)}>Dismiss</button>
          </div>
        )}
        <div key={stepIdx} className="app__step-content">
          <Current
            config={config}
            setConfig={setConfig}
            goToStep={(id: string) => {
              const i = STEPS.findIndex((s) => s.id === id);
              if (i >= 0) {
                setMaxReachedStep((m) => Math.max(m, i));
                setStepIdx(i);
              }
            }}
          />
        </div>
        {validationError && (
          <div className="banner banner--err" role="alert">
            {validationError}
          </div>
        )}
      </main>

      <footer className="app__foot">
        <button className="btn btn--tertiary" onClick={back} disabled={isFirst}>← Back</button>

        <nav className="app__stepper" aria-label="Wizard steps">
          {STEPS.flatMap((s, i) => {
            const isDone    = i < stepIdx;
            const isCurrent = i === stepIdx;
            const isLocked  = i > maxReachedStep;
            const btn = (
              <button
                key={s.id}
                className={`app__step-btn${isCurrent ? ' is-current' : isDone ? ' is-done' : ''}`}
                onClick={() => jumpToStep(i)}
                disabled={isLocked || isCurrent}
                aria-current={isCurrent ? 'step' : undefined}
                title={isLocked ? 'Complete previous steps to unlock' : s.label}
              >
                <span className="app__step-num">{i + 1}</span>
                <span className="app__step-label">{s.label}</span>
              </button>
            );
            return i > 0
              ? [<span key={`sep-${i}`} className={`app__step-sep${isDone || isCurrent ? ' is-done' : ''}`} aria-hidden="true" />, btn]
              : [btn];
          })}
        </nav>

        {!isLast ? (
          <button className="btn btn--primary" onClick={next}>Next →</button>
        ) : (
          <span className="btn" style={{ visibility: 'hidden' }}>Next →</span>
        )}
      </footer>
    </div>
  );
}

/**
 * Catches render errors in the wizard. Without this, a thrown exception in any
 * step (e.g. dereferencing a missing nested config key) leaves the user with a
 * blank page and no recourse. Provides a one-click "clear and reload" button.
 */
interface WizardErrorBoundaryProps { children: ReactNode }
interface WizardErrorBoundaryState { error: Error | null }

class WizardErrorBoundary extends Component<WizardErrorBoundaryProps, WizardErrorBoundaryState> {
  state: WizardErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): WizardErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[wizard] render crash:', error, info.componentStack);
  }

  handleReset = (): void => {
    clearPersistedState();
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, maxWidth: 720, margin: '40px auto', fontFamily: 'system-ui, sans-serif' }}>
          <h2 style={{ marginTop: 0 }}>Wizard crashed</h2>
          <p>The wizard hit an error while rendering. This usually means saved progress is incompatible with the current code.</p>
          <pre style={{ background: '#1a1a1a', color: '#f88', padding: 12, borderRadius: 6, overflow: 'auto', fontSize: 12 }}>
            {this.state.error.message}
          </pre>
          <button className="btn btn--primary" onClick={this.handleReset}>
            ↺ Clear saved state &amp; reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AuthBadge({ auth }: { auth: AuthStatus | null }) {
  if (auth === null) return <span className="auth-badge auth-badge--idle">CAPE: …</span>;
  if (auth.authenticated) {
    return <span className="auth-badge auth-badge--ok" title={auth.userId ? `user #${auth.userId}` : ''}>✓ CAPE</span>;
  }
  return <span className="auth-badge auth-badge--off">CAPE: signed out</span>;
}

/**
 * "Open existing" — load a project's `.scaffolded`, translate it, and jump
 * straight to the Build step. The user can step back through any tab to
 * tweak before re-scaffolding.
 *
 * Note: this is fresh-build-only for now (Option 1 from the design). Build
 * targets a NEW outputDir by default (cfg.outputDir is cleared) so the
 * existing project stays untouched. Update mode (--update / true diff) is
 * the future Option 3.
 */
function OpenExistingButton({ onLoaded }: { onLoaded: (cfg: ScaffoldConfig) => void }) {
  const [open,    setOpen]    = useState(false);
  const [path,    setPath]    = useState('');
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !path.trim()) return;
    setBusy(true); setError(null);
    const res = await loadExisting(path.trim());
    setBusy(false);
    if (!res.ok || !res.scaffolded) { setError(res.error ?? 'Failed to load.'); return; }
    const cfg = fromScaffolded(res.scaffolded);
    // Track where we loaded from. The Build step's mode picker reads
    // loadedProjectDir to decide whether to render at all, and uses it as
    // the outputDir for update / recreate. 'create' (fresh copy) clears
    // outputDir at submit time so it scaffolds to a sibling.
    if (typeof res.projectDir === 'string') {
      cfg.loadedProjectDir = res.projectDir;
      cfg.outputDir        = res.projectDir;
    }
    onLoaded(cfg);
    setOpen(false);
    setPath('');
  };

  return (
    <>
      <button
        type="button"
        className="btn btn--tertiary btn--sm"
        onClick={() => setOpen(true)}
      >
        <span aria-hidden>↥</span> Open existing
      </button>

      {open && createPortal(
        <div className="modal-backdrop" onClick={() => !busy && setOpen(false)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
            <header className="modal__head">
              <strong>Open an existing campaign</strong>
              <button type="button" className="modal__close" onClick={() => setOpen(false)} disabled={busy}>×</button>
            </header>

            <p className="step__hint">
              Point at any folder containing <code>.scaffolded</code> (the project root, or its <code>frontend/</code>).
              The wizard fills every step with that project's config so you can tweak and re-scaffold.
            </p>

            <div className="field">
              <label htmlFor="existingPath">Project path</label>
              <input
                id="existingPath" type="text"
                placeholder="e.g. C:\Dev\Livewall\hema-handdoek-2025"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                autoFocus
                required
              />
            </div>

            {error && <div className="banner banner--err">{error}</div>}

            <div className="modal__foot">
              <button type="button" className="btn btn--tertiary" onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
              <button type="submit" className="btn btn--primary" disabled={busy || !path.trim()}>
                {busy ? 'Loading…' : 'Load'}
              </button>
            </div>

            <p className="step__hint" style={{ marginTop: 8, fontSize: 11 }}>
              Builds go to a fresh output folder by default — the loaded project stays untouched.
              True update mode (rewrite in place, preserve git diff) is on the roadmap.
            </p>
          </form>
        </div>,
        document.body,
      )}
    </>
  );
}
