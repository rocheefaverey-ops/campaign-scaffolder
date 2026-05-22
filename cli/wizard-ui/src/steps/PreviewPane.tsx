import { useEffect, useState } from 'react';
import { pageMeta, MENU_ITEMS, type ScaffoldConfig, type PageInstance } from '../shared/config.ts';
import { startFrontendPreview } from '../bridge.ts';

// The "Start real preview" button is hidden for now — spinning up a full
// scaffold + pnpm install + vite dev from the wizard turned out to be too
// brittle (Windows spawn quirks, slow cold starts, opaque failure modes)
// for the benefit. The state/handler/server endpoint stay wired so it can
// be re-enabled by flipping this flag once the flow is more dependable.
const ENABLE_REAL_PREVIEW = false;

interface Props {
  config: ScaffoldConfig;
}

/**
 * Live preview of the user's flow. Renders one mobile-shaped frame at a time.
 * Tabs at the top let you jump between flow instances; primary CTAs inside
 * the preview also navigate, so you can click through your wired-up flow
 * just like a real user would.
 *
 * The renderers are simplified mocks — they read the wizard's config
 * (pageSettings, flowEnabledExits, brand, exits) and approximate the real
 * page layouts so the user gets visual feedback as they tweak. Real
 * scaffolded pages use the full base-template + module components.
 */
export default function PreviewPane({ config }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [menuOpen, setMenuOpen]   = useState(false);
  const [realUrl, setRealUrl]     = useState<string | null>(null);
  const [realBusy, setRealBusy]   = useState(false);
  const [realError, setRealError] = useState<string | null>(null);

  // Clamp activeIdx if pages were removed.
  useEffect(() => {
    if (activeIdx >= config.pages.length) setActiveIdx(Math.max(0, config.pages.length - 1));
  }, [activeIdx, config.pages.length]);

  if (config.pages.length === 0) {
    return (
      <section className="preview-pane">
        <header className="preview-pane__head">
          <h3 className="pages-col__title">Preview</h3>
          <p className="step__hint">Add a page to your flow to see it here.</p>
        </header>
      </section>
    );
  }

  const idx = Math.min(activeIdx, config.pages.length - 1);
  const inst = config.pages[idx];
  const visualPages = config.pages.filter(p => !['game', 'video', 'intro-video', 'loading-video', 'ad-video'].includes(p.type));
  const realRoute = visualPages.some(p => p.id === inst.id)
    ? inst.route
    : visualPages[0]?.route ?? inst.route;

  const startRealPreview = async () => {
    setRealBusy(true);
    setRealError(null);
    const res = await startFrontendPreview(config);
    setRealBusy(false);
    if (!res.ok || !res.url) {
      setRealError(res.error ?? 'Could not start real frontend preview.');
      return;
    }
    setRealUrl(res.url);
    const firstVisual = visualPages[0];
    if (firstVisual) {
      const firstIdx = config.pages.findIndex(p => p.id === firstVisual.id);
      if (firstIdx >= 0) setActiveIdx(firstIdx);
    }
  };

  /** Resolve where a given exit on this instance navigates to (instance id). */
  const resolveExit = (instId: string, exitKey: string, defaultRule: 'next' | 'first' = 'next'): number | null => {
    const target = config.flowExits[`${instId}.${exitKey}`];
    if (target) {
      const found = config.pages.findIndex(p => p.id === target);
      if (found >= 0) return found;
    }
    if (defaultRule === 'first') return 0;
    return idx + 1 < config.pages.length ? idx + 1 : null;
  };

  /** Click handler for any preview button. exitKey + defaultRule decide where it goes. */
  const navigate = (instId: string, exitKey: string, defaultRule: 'next' | 'first' = 'next') => {
    const next = resolveExit(instId, exitKey, defaultRule);
    if (next !== null) setActiveIdx(next);
  };

  return (
    <section className="preview-pane">
      <header className="preview-pane__head">
        <h3 className="pages-col__title">Preview</h3>
        <p className="step__hint">
          Mock render of each page in your flow. Click CTAs and tabs to step through the wired-up navigation. Real copy, branding and game runtime arrive at scaffold time via CAPE.
        </p>
        {ENABLE_REAL_PREVIEW && (
          <>
            <div className="preview-pane__actions">
              <button type="button" className="btn btn--secondary" onClick={startRealPreview} disabled={realBusy}>
                {realBusy ? 'Starting real preview...' : realUrl ? 'Restart real preview' : 'Start real preview'}
              </button>
              {realUrl && <a className="preview-pane__link" href={realUrl} target="_blank" rel="noreferrer">Open full page</a>}
            </div>
            {realError && <div className="banner banner--err">{realError}</div>}
          </>
        )}
      </header>

      <div className="preview-pane__tabs" role="tablist">
        {(realUrl ? visualPages : config.pages).map((p) => {
          const i = config.pages.findIndex(page => page.id === p.id);
          const meta = pageMeta(p.type);
          if (!meta) return null;
          const label = p.id === p.type ? meta.label : p.id;
          return (
            <button
              key={p.id}
              role="tab"
              aria-selected={i === idx}
              className={`preview-pane__tab${i === idx ? ' is-active' : ''}`}
              onClick={() => setActiveIdx(i)}
              title={p.route}
            >
              <span className="preview-pane__tab-num">{i + 1}</span>
              <span className="preview-pane__tab-text">
                <span className="preview-pane__tab-label">{label}</span>
                <span className="preview-pane__tab-route">{p.route}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="preview-pane__frame-wrap">
        <PhoneFrame route={realUrl ? realRoute : menuOpen ? '/menu' : inst.route}>
          {realUrl ? (
            <iframe
              key={`${realUrl}${realRoute}`}
              className="frontend-preview-frame"
              src={`${realUrl}${realRoute}`}
              title="Real frontend preview"
            />
          ) : (
            menuOpen
              ? <MenuPreview config={config} onClose={() => setMenuOpen(false)} onNavigate={(target) => {
                  // If the user picks a menu item that points to a page in the
                  // flow, jump the preview to that tab; otherwise just close.
                  const idx = config.pages.findIndex(p => p.route === target || `/${p.id}` === target);
                  if (idx >= 0) setActiveIdx(idx);
                  setMenuOpen(false);
                }} />
              : (
                // Keyed wrapper so React swaps the subtree on page change,
                // re-triggering the CSS fade-in. Cheap polish — no JS animation.
                <div key={inst.id} className="preview-pane__page">
                  <PageRenderer config={config} instance={inst} navigate={navigate} onMenu={() => setMenuOpen(true)} />
                </div>
              )
          )}
        </PhoneFrame>
      </div>
    </section>
  );
}

// ─── Phone frame ─────────────────────────────────────────────────────────────

function PhoneFrame({ children, route }: { children: React.ReactNode; route: string }) {
  return (
    <div className="phone-frame">
      <div className="phone-frame__notch" />
      <div className="phone-frame__inner">{children}</div>
      <div className="phone-frame__route" aria-hidden>{route}</div>
    </div>
  );
}

// ─── Renderer dispatcher ─────────────────────────────────────────────────────

type NavFn = (instId: string, exitKey: string, defaultRule?: 'next' | 'first') => void;

function PageRenderer({ config, instance, navigate, onMenu }: { config: ScaffoldConfig; instance: PageInstance; navigate: NavFn; onMenu: () => void }) {
  switch (instance.type) {
    case 'landing':       return <LandingPreview      config={config} instance={instance} navigate={navigate} onMenu={onMenu} />;
    case 'tutorial':      return <TutorialPreview     config={config} instance={instance} navigate={navigate} />;
    case 'video':
    case 'intro-video':
    case 'ad-video':      return <VideoPreview        config={config} instance={instance} navigate={navigate} />;
    case 'loading-video': return <LoadingVideoPreview config={config} instance={instance} navigate={navigate} />;
    case 'register':      return <RegisterPreview     config={config} instance={instance} navigate={navigate} />;
    case 'game':          return <GamePreview         config={config} instance={instance} navigate={navigate} />;
    case 'result':        return <ResultPreview       config={config} instance={instance} navigate={navigate} onMenu={onMenu} />;
    case 'leaderboard':   return <LeaderboardPreview  config={config} instance={instance} navigate={navigate} onMenu={onMenu} />;
    case 'voucher':       return <VoucherPreview      config={config} instance={instance} navigate={navigate} onMenu={onMenu} />;
    default:              return <PlaceholderPreview  instance={instance} />;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function instSettings(config: ScaffoldConfig, id: string): Record<string, unknown> {
  return (config.pageSettings[id] ?? {}) as Record<string, unknown>;
}
function isExitOn(config: ScaffoldConfig, id: string, exitKey: string, defaultEnabled: boolean): boolean {
  return config.flowEnabledExits[`${id}.${exitKey}`] ?? defaultEnabled;
}

function exitVariant(config: ScaffoldConfig, id: string, exitKey: string, fallback: 'primary' | 'secondary' | 'tertiary' | 'dark' | 'danger') {
  return config.flowButtonVariants[`${id}.${exitKey}`] ?? fallback;
}

// ─── Per-page renderers ──────────────────────────────────────────────────────

function HeroBleed() {
  return (
    <>
      <img src="/hero-mobile.png" alt="" className="pp-hero-img" aria-hidden />
      <div className="pp-hero-shade" aria-hidden />
    </>
  );
}

function HeaderLogo({ onMenu }: { onMenu?: () => void }) {
  return (
    <div className="pp-header pp-header--with-close">
      <img src="/logo-livewall-wordmark.svg" alt="logo" className="pp-wordmark" />
      <button type="button" className="pp-menu" aria-label="Menu" onClick={onMenu}>
        <HamburgerSvg />
      </button>
    </div>
  );
}

function HamburgerSvg() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <line x1="4" y1="7"  x2="20" y2="7"  />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

function CtaButton({ kind = 'primary', label, onClick }:
  { kind?: 'primary' | 'secondary' | 'tertiary' | 'dark' | 'danger'; label: string; onClick?: () => void }
) {
  return (
    <button type="button" className={`pp-btn pp-btn--${kind}`} onClick={onClick}>
      {label}
    </button>
  );
}

function HeroStack({ kicker, title, body }: { kicker?: string; title: string; body?: string }) {
  return (
    <div className="pp-stack">
      {kicker && <p className="pp-kicker">{kicker}</p>}
      <h1 className="pp-title">{title}</h1>
      {body && <p className="pp-body">{body}</p>}
    </div>
  );
}

// ─────────────── Landing ───────────────

function LandingPreview({ config, instance, navigate, onMenu }: { config: ScaffoldConfig; instance: PageInstance; navigate: NavFn; onMenu: () => void }) {
  const showTutorial    = isExitOn(config, instance.id, 'tutorial',    false);
  const showLeaderboard = isExitOn(config, instance.id, 'leaderboard', false);
  const brand = config.brand?.trim() || config.name?.trim();
  const title = brand ? `Welcome to ${brand}` : 'Welcome';
  return (
    <div className="pp pp--hero">
      <HeroBleed />
      <div className="pp-shell">
        <HeaderLogo onMenu={onMenu} />
        <div className="pp-bottom">
          <HeroStack kicker="LIVE EXPERIENCE" title={title} body="Are you ready to play?" />
          <div className="pp-actions">
            <CtaButton kind={exitVariant(config, instance.id, 'next', 'primary')} label="Play now" onClick={() => navigate(instance.id, 'next')} />
            {showTutorial    && <CtaButton kind={exitVariant(config, instance.id, 'tutorial',    'secondary')} label="Tutorial"    onClick={() => navigate(instance.id, 'tutorial')} />}
            {showLeaderboard && <CtaButton kind={exitVariant(config, instance.id, 'leaderboard', 'secondary')} label="Leaderboard" onClick={() => navigate(instance.id, 'leaderboard')} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function TutorialPreview({ config, instance, navigate }: { config: ScaffoldConfig; instance: PageInstance; navigate: NavFn }) {
  const s = instSettings(config, instance.id);
  const layout = (s.screenLayout as string) ?? 'fullBleedHero';
  // stepCount mirrors the wizard's tutorial setting — clamp so we always show
  // at least one step and don't render a pagination row past what fits.
  const stepCount = Math.max(1, Math.min(6, Number(s.stepCount ?? 3)));
  const [step, setStep] = useState(0);
  const STEPS = Array.from({ length: stepCount }, (_, i) => ({
    title: `Step ${i + 1}`,
    body: `Instructions for step ${i + 1}.`,
  }));
  const isLast = step === STEPS.length - 1;
  const content = (
    <>
      <HeroStack kicker="HOW TO PLAY" title={STEPS[step].title} body={STEPS[step].body} />
      <div className="pp-dots">
        {STEPS.map((_, i) => (
          <button key={i} type="button" aria-label={`step ${i + 1}`} className={`pp-dot${i === step ? ' is-active' : ''}`} onClick={() => setStep(i)} />
        ))}
      </div>
      <div className="pp-actions">
        <CtaButton
          kind={exitVariant(config, instance.id, 'next', 'primary')}
          label={isLast ? 'Start' : 'Continue'}
          onClick={() => isLast ? navigate(instance.id, 'next') : setStep(step + 1)}
        />
        {Boolean(s.allowSkip) && <CtaButton kind="secondary" label="Skip" onClick={() => navigate(instance.id, 'next')} />}
      </div>
    </>
  );

  if (layout === 'card') {
    return (
      <div className="pp pp--form pp--tutorial-card">
        <div className="pp-tutorial-panel">
          <button type="button" className="pp-card-close" aria-label="Close" onClick={() => navigate(instance.id, 'next')}>×</button>
          <div className="pp-card-visual" aria-hidden />
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="pp pp--hero">
      <HeroBleed />
      <div className="pp-shell">
        <HeaderLogo onMenu={() => navigate(instance.id, 'next')} />
        <div className="pp-bottom">{content}</div>
      </div>
    </div>
  );
}

// ─────────────── Video ───────────────

function VideoPreview({ config, instance, navigate }: { config: ScaffoldConfig; instance: PageInstance; navigate: NavFn }) {
  const s = instSettings(config, instance.id);
  const mode       = (s.mode as string) ?? 'intro';
  const alwaysSkip = Boolean(s.alwaysSkip);
  const minSec     = (s.minPlaybackSec ?? 3) as number;
  const isLoader   = mode === 'loadingScreen';
  const skippable  = alwaysSkip || !isLoader;
  return (
    <div className="pp pp--video">
      <div className="pp-video-stage" onClick={() => navigate(instance.id, 'next')}>
        <span className="pp-video-icon">▶</span>
      </div>
      {isLoader && <span className="pp-video-loading">Loading game…</span>}
      {skippable && (
        <button type="button" className="pp-video-skip" onClick={() => navigate(instance.id, 'next')}>
          {alwaysSkip ? 'Skip →' : `Skip (${minSec}s)`}
        </button>
      )}
    </div>
  );
}

function LoadingVideoPreview({ config, instance, navigate }: { config: ScaffoldConfig; instance: PageInstance; navigate: NavFn }) {
  const s = instSettings(config, instance.id);
  const alwaysSkip  = Boolean(s.alwaysSkip);
  const fallbackSec = (s.readyFallbackSec ?? 8) as number;
  return (
    <div className="pp pp--video">
      <div className="pp-video-stage">
        <span className="pp-video-icon" style={{ animation: 'spin 1.2s linear infinite' }}>⟳</span>
        <span className="pp-video-loading">Loading game…</span>
      </div>
      <button type="button" className="pp-video-skip" onClick={() => navigate(instance.id, 'next')}>
        {alwaysSkip ? 'Skip →' : `Skip (${fallbackSec}s fallback)`}
      </button>
    </div>
  );
}

// ─────────────── Register ───────────────

function RegisterPreview({ config, instance, navigate }: { config: ScaffoldConfig; instance: PageInstance; navigate: NavFn }) {
  const s = instSettings(config, instance.id);
  const showInfix = (s.showInfix ?? true) as boolean;
  return (
    <div className="pp pp--form">
      <div className="pp-shell pp-shell--scroll">
        <HeroStack kicker="REGISTER" title="Join the game" body="Fill in your details to play." />
        <div className="pp-form">
          <div className="pp-row">
            <Field label="First name" />
            {showInfix && <Field label="Infix" narrow />}
          </div>
          <Field label="Last name" />
          <Field label="Email" />
          <Checkbox label="I'm 18 or older" />
          <Checkbox label="I accept the terms" />
          <Checkbox label="I accept the privacy policy" />
          <CtaButton kind={exitVariant(config, instance.id, 'next', 'primary')} label="Register" onClick={() => navigate(instance.id, 'next')} />
        </div>
      </div>
    </div>
  );
}
function Field({ label, narrow = false }: { label: string; narrow?: boolean }) {
  return (
    <div className={`pp-field${narrow ? ' is-narrow' : ''}`}>
      <span className="pp-field__label">{label}</span>
      <span className="pp-field__input" />
    </div>
  );
}
function Checkbox({ label }: { label: string }) {
  return (
    <label className="pp-check">
      <span className="pp-check__box" />
      <span>{label}</span>
    </label>
  );
}

// ─────────────── Game ───────────────

function GamePreview({ config, instance, navigate }: { config: ScaffoldConfig; instance: PageInstance; navigate: NavFn }) {
  const s = instSettings(config, instance.id);
  const timerOn  = (s.timerEnabled ?? true) as boolean;
  const timerSec = (s.timerSec ?? 60) as number;
  const m = Math.floor(timerSec / 60);
  const r = timerSec % 60;
  const clock = `${m}:${r.toString().padStart(2, '0')}`;
  return (
    <div className="pp pp--game">
      {timerOn && timerSec > 0 && (
        <div className="pp-timer">
          <span className="pp-timer__label">Time</span>
          <span className="pp-timer__value">{clock}</span>
        </div>
      )}
      <div className="pp-game-canvas">
        <div className="pp-game-grid" aria-hidden>
          {Array.from({ length: 16 }).map((_, i) => <div key={i} className="pp-game-tile" />)}
        </div>
        <CtaButton kind={exitVariant(config, instance.id, 'next', 'tertiary')} label="Simulate game end" onClick={() => navigate(instance.id, 'next')} />
      </div>
      <div className="pp-game-engine">{config.gameId || config.game}</div>
    </div>
  );
}

// ─────────────── Result ───────────────

function ResultPreview({ config, instance, navigate, onMenu }: { config: ScaffoldConfig; instance: PageInstance; navigate: NavFn; onMenu: () => void }) {
  const showPlayAgain   = isExitOn(config, instance.id, 'playAgain',   true);
  const showLeaderboard = isExitOn(config, instance.id, 'leaderboard', false);
  const brand = config.brand?.trim() || config.name?.trim();
  return (
    <div className="pp pp--hero">
      <HeroBleed />
      <div className="pp-shell">
        <HeaderLogo onMenu={onMenu} />
        <div className="pp-bottom">
          <HeroStack kicker="RESULT" title="Well done!" body={brand ? `Thanks for playing ${brand}.` : undefined} />
          <div className="pp-score-plate">
            <span className="pp-score-plate__label">Score</span>
            <span className="pp-score-plate__value">2,480</span>
            <span className="pp-score-plate__rank">Rank #4</span>
          </div>
          <div className="pp-actions">
            <CtaButton kind={exitVariant(config, instance.id, 'next', 'primary')} label="Continue" onClick={() => navigate(instance.id, 'next')} />
            {showPlayAgain   && <CtaButton kind={exitVariant(config, instance.id, 'playAgain', 'secondary')} label="Play again"  onClick={() => navigate(instance.id, 'playAgain', 'first')} />}
            {showLeaderboard && <CtaButton kind={exitVariant(config, instance.id, 'leaderboard', 'tertiary')} label="Leaderboard" onClick={() => navigate(instance.id, 'leaderboard')} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────── Leaderboard ───────────────

function LeaderboardPreview({ config, instance, navigate, onMenu }: { config: ScaffoldConfig; instance: PageInstance; navigate: NavFn; onMenu: () => void }) {
  const mock = [
    { rank: 1, name: 'Alex P.',   score: 4830 },
    { rank: 2, name: 'Sam V.',    score: 4622 },
    { rank: 3, name: 'Jordan K.', score: 4501, you: true },
    { rank: 4, name: 'Morgan L.', score: 4310 },
    { rank: 5, name: 'Taylor B.', score: 4112 },
  ];
  return (
    <div className="pp pp--hero">
      <HeroBleed />
      <div className="pp-shell">
        <HeaderLogo onMenu={onMenu} />
        <div className="pp-bottom">
          <HeroStack kicker="LEADERBOARD" title="Top players" />
          <ol className="pp-lb">
            {mock.map(r => (
              <li key={r.rank} className={`pp-lb__row${r.you ? ' is-you' : ''}`}>
                <span className="pp-lb__rank">#{r.rank}</span>
                <span className="pp-lb__name">{r.name}{r.you ? ' (you)' : ''}</span>
                <span className="pp-lb__score">{r.score.toLocaleString()}</span>
              </li>
            ))}
          </ol>
          <CtaButton kind={exitVariant(config, instance.id, 'next', 'primary')} label="Continue" onClick={() => navigate(instance.id, 'next')} />
        </div>
      </div>
    </div>
  );
}

// ─────────────── Voucher ───────────────

function VoucherPreview({ config, instance, navigate, onMenu }: { config: ScaffoldConfig; instance: PageInstance; navigate: NavFn; onMenu: () => void }) {
  const s = instSettings(config, instance.id);
  const showQr     = (s.showQr ?? true) as boolean;
  const codeLength = ((s.codeLength as number) || 8);
  const sample = 'LIVEWALL-2025-CAMPAIGN'.replace(/-/g, '');
  const code = sample.slice(0, codeLength).padEnd(codeLength, 'X');
  return (
    <div className="pp pp--hero">
      <HeroBleed />
      <div className="pp-shell">
        <HeaderLogo onMenu={onMenu} />
        <div className="pp-bottom pp-bottom--center">
          <HeroStack kicker="REWARD" title="Your voucher" body="Show this code at checkout." />
          <div className="pp-voucher">
            <span className="pp-voucher__code">{code}</span>
            {showQr && <div className="pp-voucher__qr" aria-hidden>▦</div>}
          </div>
          <CtaButton kind={exitVariant(config, instance.id, 'next', 'primary')} label="Done" onClick={() => navigate(instance.id, 'next')} />
        </div>
      </div>
    </div>
  );
}

// ─────────────── Menu (overlay rendered when hamburger is clicked) ───────────

function MenuPreview({ config, onClose, onNavigate }: {
  config: ScaffoldConfig;
  onClose: () => void;
  onNavigate: (target: string) => void;
}) {
  const visible = MENU_ITEMS.filter(item => config.menuItemsEnabled[item.id] ?? item.defaultEnabled);

  return (
    <div className="pp pp--menu">
      <div className="pp-shell">
        <div className="pp-header pp-header--menu">
          <div className="pp-menu-spacer" aria-hidden />
          <img src="/logo-livewall-wordmark.svg" alt="logo" className="pp-wordmark pp-wordmark--center" />
          <button type="button" className="pp-close" aria-label="Close menu" onClick={onClose}>×</button>
        </div>

        <div className="pp-menu-panel">
          {visible.length === 0 && (
            <p className="pp-body" style={{ textAlign: 'center', color: 'var(--color-text-soft)' }}>
              No menu items enabled.<br />Toggle some on in the wizard.
            </p>
          )}
          {visible.map(item => (
            <button
              key={item.id}
              type="button"
              className={`pp-btn pp-btn--${config.menuButtonVariants[item.id] ?? item.kind}`}
              onClick={() => onNavigate(item.target)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <p className="pp-menu-footer">Powered by Livewall</p>
      </div>
    </div>
  );
}

function PlaceholderPreview({ instance }: { instance: PageInstance }) {
  return (
    <div className="pp pp--placeholder">
      <strong>{instance.id}</strong>
      <span>type: {instance.type}</span>
    </div>
  );
}
