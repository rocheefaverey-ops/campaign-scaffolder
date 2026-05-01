import { useState, useEffect } from 'react';
import { DEFAULT_CONFIG, type ScaffoldConfig } from './shared/config.ts';
import { fromScaffolded } from './shared/fromScaffolded.ts';
import { ping, getAuthStatus, loadExisting, type AuthStatus } from './bridge.ts';
import StepStack    from './steps/StepStack.tsx';
import StepProject  from './steps/StepProject.tsx';
import StepPages    from './steps/StepPages.tsx';
import StepCape     from './steps/StepCape.tsx';
import StepBuild    from './steps/StepBuild.tsx';

const STEPS = [
  { id: 'stack',   label: 'Stack',   Component: StepStack },
  { id: 'project', label: 'Project', Component: StepProject },
  { id: 'pages',   label: 'Pages',   Component: StepPages },
  // Modules and Branding will slot in here as they're built.
  { id: 'cape',    label: 'CAPE',    Component: StepCape },
  { id: 'build',   label: 'Build',   Component: StepBuild },
] as const;

export default function App() {
  const [config, setConfig]     = useState<ScaffoldConfig>(DEFAULT_CONFIG);
  const [stepIdx, setStepIdx]   = useState(0);
  const [serverUp, setServerUp] = useState<boolean | null>(null);
  const [auth, setAuth]         = useState<AuthStatus | null>(null);

  useEffect(() => { ping().then(setServerUp); }, []);

  // Refresh auth status whenever we land on the CAPE step — the user may
  // have just logged in inline, and the header badge should reflect it.
  useEffect(() => { getAuthStatus().then(setAuth); }, [stepIdx]);

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
    if (err) { alert(err); return; }
    setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
  };
  const back = () => setStepIdx((i) => Math.max(i - 1, 0));

  return (
    <div className="app">
      <header className="app__head">
        <h1>Livewall Campaign Wizard <span>· scaffold a new campaign</span></h1>
        <div className="app__head-right">
          <OpenExistingButton onLoaded={(cfg) => { setConfig(cfg); setStepIdx(STEPS.length - 1); }} />
          <AuthBadge auth={auth} />
          <ul className="app__steps">
            {STEPS.map((s, i) => (
              <li key={s.id} className={i === stepIdx ? 'is-current' : i < stepIdx ? 'is-done' : ''}>
                {i + 1}. {s.label}
              </li>
            ))}
          </ul>
        </div>
      </header>

      <main className="app__main">
        {serverUp === false && (
          <div className="banner banner--err">
            Wizard server not reachable on <code>:3737</code>. Make sure <code>npm run wizard</code> is running.
          </div>
        )}
        <Current
          config={config}
          setConfig={setConfig}
          goToStep={(id: string) => {
            const i = STEPS.findIndex((s) => s.id === id);
            if (i >= 0) setStepIdx(i);
          }}
        />
      </main>

      <footer className="app__foot">
        <button className="btn btn--ghost" onClick={back} disabled={isFirst}>← Back</button>
        {!isLast && (
          <button className="btn btn--primary" onClick={next}>Next →</button>
        )}
      </footer>
    </div>
  );
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
        className="btn btn--ghost"
        style={{ padding: '4px 12px', fontSize: 12 }}
        onClick={() => setOpen(true)}
      >
        ⇪ Open existing
      </button>

      {open && (
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
              <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
              <button type="submit" className="btn btn--primary" disabled={busy || !path.trim()}>
                {busy ? 'Loading…' : 'Load'}
              </button>
            </div>

            <p className="step__hint" style={{ marginTop: 8, fontSize: 11 }}>
              Builds go to a fresh output folder by default — the loaded project stays untouched.
              True update mode (rewrite in place, preserve git diff) is on the roadmap.
            </p>
          </form>
        </div>
      )}
    </>
  );
}
