import { useEffect, useState } from 'react';
import type { ScaffoldConfig, StepProps } from '../shared/config.ts';
import { getAuthStatus, loginCape, logoutCape, type AuthStatus } from '../bridge.ts';

function defaultTitleFrom(name: string): string {
  if (!name) return '';
  return name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function StepCape({ config, setConfig }: StepProps) {
  const autoTitle    = defaultTitleFrom(config.name);
  const titlePreview = (config.capeTitle && config.capeTitle.trim()) || autoTitle;

  const [auth, setAuth] = useState<AuthStatus | null>(null);
  useEffect(() => { getAuthStatus().then(setAuth); }, []);

  return (
    <>
      <div>
        <h2 className="step__title">CAPE campaign</h2>
        <p className="step__hint">
          By default we'll create a fresh CAPE campaign for this project, push the format, and publish it to acceptance — all hands-free.
          Need to bind to an existing campaign instead? Switch the option below.
        </p>
      </div>

      <div className="card-grid">
        <button
          className={`card${config.createCape ? ' is-selected' : ''}`}
          onClick={() => setConfig({ ...config, createCape: true })}
        >
          <div className="card__label">✨ Create a new CAPE campaign</div>
          <div className="card__hint">Recommended. Uses your CAPE login.</div>
        </button>

        <button
          className={`card${!config.createCape ? ' is-selected' : ''}`}
          onClick={() => setConfig({ ...config, createCape: false })}
        >
          <div className="card__label">🔗 Use existing campaign</div>
          <div className="card__hint">Bind to a CAPE campaign you've already created.</div>
        </button>
      </div>

      {config.createCape ? (
        <>
          <div className="field">
            <label htmlFor="capeTitle">Campaign title (optional)</label>
            <input
              id="capeTitle" type="text"
              placeholder={autoTitle || 'Auto-derived from project name'}
              value={config.capeTitle ?? ''}
              onChange={(e) => setConfig({ ...config, capeTitle: e.target.value })}
            />
            <p className="step__hint" style={{ marginTop: 2 }}>
              Will create a CAPE campaign titled <strong>{titlePreview || '—'}</strong>.
            </p>
          </div>

          <AuthSection auth={auth} onChange={setAuth} />
        </>
      ) : (
        <div className="field">
          <label htmlFor="capeId">Existing CAPE campaign ID</label>
          <input
            id="capeId" type="text" inputMode="numeric" placeholder="54031"
            value={config.capeId}
            onChange={(e) => setConfig({ ...config, capeId: e.target.value.trim() })}
          />
        </div>
      )}
    </>
  );
}

StepCape.validate = (c: ScaffoldConfig): string | null => {
  if (c.createCape) return null;
  if (!c.capeId)             return 'CAPE campaign ID is required when not creating a new one.';
  if (!/^\d+$/.test(c.capeId)) return 'CAPE campaign ID must be numeric.';
  return null;
};

// ─── Auth section ────────────────────────────────────────────────────────────

function AuthSection({ auth, onChange }: { auth: AuthStatus | null; onChange: (a: AuthStatus) => void }) {
  if (auth === null) {
    return <div className="banner">Checking CAPE login…</div>;
  }
  if (auth.authenticated) {
    return (
      <div className="banner banner--ok" style={{ justifyContent: 'space-between' }}>
        <span>✓ Logged in to CAPE{auth.userId ? <> · <code>user #{auth.userId}</code></> : null}</span>
        <button
          className="btn btn--ghost"
          style={{ padding: '4px 10px', fontSize: 12 }}
          onClick={async () => { await logoutCape(); onChange({ authenticated: false }); }}
          title="Sign out and log in with different credentials. Use this if your session has expired or campaign creation fails with a userIncorrect / auth error."
        >
          Switch user
        </button>
      </div>
    );
  }
  return <LoginForm onSuccess={(userId) => onChange({ authenticated: true, userId })} />;
}

function LoginForm({ onSuccess }: { onSuccess: (userId: string | null) => void }) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState<string | null>(null);
  const [busy,     setBusy]     = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError(null);
    const res = await loginCape(email, password);
    setBusy(false);
    if (!res.ok) { setError(res.error ?? 'Login failed.'); return; }
    onSuccess(res.userId ?? null);
  };

  return (
    <form className="auth-card" onSubmit={submit}>
      <div>
        <strong>Log in to CAPE</strong>
        <p className="step__hint" style={{ marginTop: 2 }}>
          Same credentials you use for the CAPE web UI. Tokens are cached so you only do this once per machine.
        </p>
      </div>

      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr' }}>
        <div className="field">
          <label htmlFor="capeEmail">Email</label>
          <input
            id="capeEmail" type="email" autoComplete="username"
            value={email} onChange={(e) => setEmail(e.target.value)} required
          />
        </div>
        <div className="field">
          <label htmlFor="capePassword">Password</label>
          <input
            id="capePassword" type="password" autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)} required
          />
        </div>
      </div>

      {error && <div className="banner banner--err">{error}</div>}

      <button className="btn btn--primary" type="submit" disabled={busy} style={{ alignSelf: 'flex-start' }}>
        {busy ? 'Signing in…' : 'Log in'}
      </button>
    </form>
  );
}
