import { useEffect, useMemo, useState } from 'react';
import {
  pageMeta,
  MENU_ITEMS,
  FLOW_RULE_OPTIONS,
  deriveRegMode,
  defaultBlocksForPage,
  type ScaffoldConfig,
  type PageInstance,
  type PageFlowRule,
} from '../shared/config.ts';
import { deriveFlowFromBlocks, mergeDerivedFlow, deriveMenuItemsEnabled } from '../../../flow-bridge.js';
import { startFrontendPreview } from '../bridge.ts';

/**
 * Build the list-form blocksConfig the flow bridge expects ({ pageId: { blocks:
 * [{name, settings}] } }) from the wizard's pageBlocks map, then derive the
 * legacy flow maps for CTA-bearing pages and merge them over the stored config.
 * The cta-group block is the single source of truth for CTA buttons; the legacy
 * maps the preview helpers read are derived from it here (non-CTA pages keep
 * their stored flow wiring untouched).
 */
function withDerivedFlow(config: ScaffoldConfig): ScaffoldConfig {
  const blocksConfig: Record<string, { blocks: Array<{ name: string; settings: Record<string, unknown> }> }> = {};
  for (const [pageId, pageBlocks] of Object.entries(config.pageBlocks ?? {})) {
    const order = pageBlocks.blockOrder?.length ? pageBlocks.blockOrder : Object.keys(pageBlocks.blocks);
    const blocks = order
      .filter((name) => pageBlocks.blocks[name]?.enabled)
      .map((name) => ({ name, settings: pageBlocks.blocks[name]?.settings ?? {} }));
    if (blocks.length) blocksConfig[pageId] = { blocks };
  }
  const pageTypes = Object.fromEntries(
    config.pages.filter((p) => p.id !== p.type).map((p) => [p.id, p.type]),
  );
  const derived = deriveFlowFromBlocks(blocksConfig, config.pages, pageTypes);
  const gov = derived.governedPageIds ?? [];
  // Menu visibility is owned by the menu-item-list block; derive it so editing the
  // block updates the menu overlay (there is no separate menu-items UI).
  const menuEnabled = deriveMenuItemsEnabled(blocksConfig);
  return {
    ...config,
    flowExits:          mergeDerivedFlow(config.flowExits, derived.flowExits, gov),
    flowEnabledExits:   mergeDerivedFlow(config.flowEnabledExits, derived.flowEnabledExits, gov),
    flowButtonVariants: mergeDerivedFlow(config.flowButtonVariants, derived.flowButtonVariants, gov) as ScaffoldConfig['flowButtonVariants'],
    menuItemsEnabled:   menuEnabled ? { ...config.menuItemsEnabled, ...menuEnabled } : config.menuItemsEnabled,
  };
}

function flowRuleLabel(rule: PageFlowRule | undefined): string | null {
  if (!rule || rule.mode === 'always') return null;
  return FLOW_RULE_OPTIONS.find(o => o.value === rule.mode)?.label ?? null;
}

function resolveEntryId(config: ScaffoldConfig): string | undefined {
  if (config.flowEntry && config.pages.some(p => p.id === config.flowEntry)) return config.flowEntry;
  return config.pages[0]?.id;
}

function hasModule(config: ScaffoldConfig, name: string): boolean {
  return Array.isArray(config.modules) && config.modules.includes(name);
}

function deriveHost(config: ScaffoldConfig): string {
  const slug = (config.name || 'campaign').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'campaign';
  return `${slug}.livewall.io`;
}

// The "Start real preview" button is hidden for now — spinning up a full
// scaffold + pnpm install + vite dev from the wizard turned out to be too
// brittle (Windows spawn quirks, slow cold starts, opaque failure modes)
// for the benefit. The state/handler/server endpoint stay wired so it can
// be re-enabled by flipping this flag once the flow is more dependable.
const ENABLE_REAL_PREVIEW = false;

interface Props {
  config: ScaffoldConfig;
  /** When set, the preview follows this page id (used by the focus editor). */
  activeId?: string;
  /** Clicking a page tab opens that page's focus editor. */
  onSelectPage?: (id: string) => void;
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
export default function PreviewPane({ config: rawConfig, activeId, onSelectPage }: Props) {
  // CTA buttons are owned by the cta-group block; derive the legacy flow maps the
  // mock renderers read so editing a button's variant/target updates the preview.
  const config = useMemo(() => withDerivedFlow(rawConfig), [rawConfig]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [menuOpen, setMenuOpen]   = useState(false);
  const [realUrl, setRealUrl]     = useState<string | null>(null);
  const [realBusy, setRealBusy]   = useState(false);
  const [realError, setRealError] = useState<string | null>(null);

  // Clamp activeIdx if pages were removed.
  useEffect(() => {
    if (activeIdx >= config.pages.length) setActiveIdx(Math.max(0, config.pages.length - 1));
  }, [activeIdx, config.pages.length]);

  // When the focus editor drives the active page, follow it.
  useEffect(() => {
    if (!activeId) return;
    const i = config.pages.findIndex(p => p.id === activeId);
    if (i >= 0) setActiveIdx(i);
  }, [activeId, config.pages]);

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
  const entryId = resolveEntryId(config);
  const activeRule = config.flowRules?.[inst.id];
  const activeRuleLabel = flowRuleLabel(activeRule);
  const supported = config.supportedLanguages?.length ? config.supportedLanguages : [config.defaultLanguage].filter(Boolean);
  const showLangs = supported.length > 1;
  const regMode = deriveRegMode(config.pages);
  const isEntry = entryId === inst.id;
  const showCookieBanner = isEntry && hasModule(config, 'cookie-consent') && !menuOpen && !realUrl;
  const showAudio = hasModule(config, 'audio');
  const hasGtm = hasModule(config, 'gtm') || Boolean(config.gtmId?.trim());
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
    // 'back' is a special control (header back/close arrows) — step to the
    // previous page in the flow rather than resolving a forward exit.
    if (exitKey === 'back') {
      setActiveIdx((i) => Math.max(0, i - 1));
      return;
    }
    const next = resolveExit(instId, exitKey, defaultRule);
    if (next !== null) setActiveIdx(next);
  };

  /** Jump straight to a page by id — used by cta-group buttons, which store a
   *  destination page id directly rather than a semantic exit key. */
  const navTo = (pageId: string) => {
    const i = config.pages.findIndex((p) => p.id === pageId);
    if (i >= 0) setActiveIdx(i);
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
          const isEntryTab = p.id === entryId;
          const rule = config.flowRules?.[p.id];
          const isGated = rule && rule.mode !== 'always';
          const regTag = p.type === 'register' && regMode !== 'none' ? regMode : null;
          return (
            <button
              key={p.id}
              role="tab"
              aria-selected={i === idx}
              className={`preview-pane__tab${i === idx ? ' is-active' : ''}${isEntryTab ? ' is-entry' : ''}${isGated ? ' is-gated' : ''}`}
              onClick={() => {
                setActiveIdx(i);
                onSelectPage?.(p.id);
              }}
              title={`${p.route}${isEntryTab ? ' · entry' : ''}${isGated ? ` · ${flowRuleLabel(rule)}` : ''}${regTag ? ` · register ${regTag}` : ''}${onSelectPage ? ' · click to edit' : ''}`}
            >
              <span className="preview-pane__tab-num">{isEntryTab ? '★' : i + 1}</span>
              <span className="preview-pane__tab-label">{label}</span>
              {regTag && <span className="preview-pane__tab-reg" aria-hidden>{regTag}</span>}
              {isGated && <span className="preview-pane__tab-gate" aria-hidden>•</span>}
            </button>
          );
        })}
      </div>

      <div className={`preview-pane__frame-wrap${config.iframe ? ' is-embedded' : ''}`}>
        {config.iframe && (
          <div className="preview-pane__embed-chrome" aria-hidden>
            <span className="preview-pane__embed-dots">
              <span /><span /><span />
            </span>
            <span className="preview-pane__embed-addr">https://partner.example.com → {deriveHost(config)}</span>
            <span className="preview-pane__embed-tag">iframe</span>
          </div>
        )}
        <PhoneFrame
          route={realUrl ? realRoute : menuOpen ? '/menu' : inst.route}
          ruleLabel={realUrl || menuOpen ? null : activeRuleLabel}
          langs={showLangs ? supported : null}
          defaultLang={config.defaultLanguage}
          gtmId={hasGtm && !realUrl ? (config.gtmId?.trim() || 'GTM-XXXX') : null}
          cookieBanner={showCookieBanner}
        >
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
                  <PageRenderer config={config} instance={inst} navigate={navigate} navTo={navTo} onMenu={() => setMenuOpen(true)} showAudio={showAudio} />
                </div>
              )
          )}
        </PhoneFrame>
      </div>
    </section>
  );
}

// ─── Phone frame ─────────────────────────────────────────────────────────────

function PhoneFrame({ children, route, ruleLabel, langs, defaultLang, gtmId, cookieBanner }: {
  children: React.ReactNode;
  route: string;
  ruleLabel?: string | null;
  langs?: string[] | null;
  defaultLang?: string;
  gtmId?: string | null;
  cookieBanner?: boolean;
}) {
  return (
    <div className="phone-frame">
      <div className="phone-frame__notch" />
      {langs && langs.length > 0 && (
        <div className="phone-frame__langs" aria-hidden>
          {langs.map(code => (
            <span key={code} className={`phone-frame__lang${code === defaultLang ? ' is-default' : ''}`}>{code}</span>
          ))}
        </div>
      )}
      <div className="phone-frame__inner">
        {children}
        {cookieBanner && <CookieBanner />}
      </div>
      <div className="phone-frame__route" aria-hidden>
        <span>{route}</span>
        {ruleLabel && <span className="phone-frame__rule">{ruleLabel}</span>}
        {gtmId && <span className="phone-frame__gtm">GTM · {gtmId}</span>}
      </div>
    </div>
  );
}

function CookieBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="pp-cookie" role="dialog" aria-label="Cookie consent">
      <div className="pp-cookie__copy">
        <strong>We use cookies</strong>
        <span>Analytics and personalisation help us improve the campaign.</span>
      </div>
      <div className="pp-cookie__actions">
        <button type="button" className="pp-cookie__btn pp-cookie__btn--ghost" onClick={() => setDismissed(true)}>Reject</button>
        <button type="button" className="pp-cookie__btn pp-cookie__btn--accept" onClick={() => setDismissed(true)}>Accept</button>
      </div>
    </div>
  );
}

// ─── Renderer dispatcher ─────────────────────────────────────────────────────

type NavFn = (instId: string, exitKey: string, defaultRule?: 'next' | 'first') => void;
type NavToFn = (pageId: string) => void;

function PageRenderer({ config, instance, navigate, navTo, onMenu, showAudio }: { config: ScaffoldConfig; instance: PageInstance; navigate: NavFn; navTo: NavToFn; onMenu: () => void; showAudio?: boolean }) {
  switch (instance.type) {
    case 'landing':       return <LandingPreview      config={config} instance={instance} navigate={navigate} navTo={navTo} onMenu={onMenu} showAudio={showAudio} />;
    case 'tutorial':      return <TutorialPreview     config={config} instance={instance} navigate={navigate} />;
    case 'video':
    case 'intro-video':
    case 'ad-video':      return <VideoPreview        config={config} instance={instance} navigate={navigate} navTo={navTo} />;
    case 'loading-video': return <LoadingVideoPreview config={config} instance={instance} navigate={navigate} />;
    case 'loading':       return <LoadingPreview      config={config} instance={instance} />;
    case 'end':           return <EndPreview          config={config} instance={instance} navigate={navigate} navTo={navTo} onMenu={onMenu} showAudio={showAudio} />;
    case 'register':      return <RegisterPreview     config={config} instance={instance} navigate={navigate} />;
    case 'game':          return <GamePreview         config={config} instance={instance} navigate={navigate} showAudio={showAudio} />;
    case 'result':        return <ResultPreview       config={config} instance={instance} navigate={navigate} navTo={navTo} onMenu={onMenu} showAudio={showAudio} />;
    case 'leaderboard':   return <LeaderboardPreview  config={config} instance={instance} navigate={navigate} navTo={navTo} onMenu={onMenu} showAudio={showAudio} />;
    case 'voucher':       return <VoucherPreview      config={config} instance={instance} navigate={navigate} navTo={navTo} onMenu={onMenu} showAudio={showAudio} />;
    default:              return <PlaceholderPreview  instance={instance} />;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function instSettings(config: ScaffoldConfig, id: string): Record<string, unknown> {
  return (config.pageSettings[id] ?? {}) as Record<string, unknown>;
}

/**
 * Is a given block enabled on this page instance? Reads the live wizard config
 * (config.pageBlocks[id]) so toggling a block in the editor reflects in the
 * preview. Falls back to the page-type defaults for instances that predate the
 * block config. A block that was removed entirely is absent → treated as off.
 */
function blockOn(config: ScaffoldConfig, instance: PageInstance, name: string): boolean {
  const blocks = config.pageBlocks?.[instance.id]?.blocks ?? defaultBlocksForPage(instance.type).blocks;
  return blocks[name]?.enabled ?? false;
}

/** Read a single setting off a block (for the few settings the mock reflects). */
function blockSetting(config: ScaffoldConfig, instance: PageInstance, name: string, key: string): unknown {
  const blocks = config.pageBlocks?.[instance.id]?.blocks ?? defaultBlocksForPage(instance.type).blocks;
  return blocks[name]?.settings?.[key];
}

/**
 * Returns an `on(name)` gate. If the page type defines no blocks at all (e.g. a
 * generic `video` instance), every element renders — so unconfigured pages
 * never blank out. Otherwise it defers to the block's enabled flag.
 */
function blockGate(config: ScaffoldConfig, instance: PageInstance): (name: string) => boolean {
  const blocks = config.pageBlocks?.[instance.id]?.blocks ?? defaultBlocksForPage(instance.type).blocks;
  const hasBlocks = Object.keys(blocks).length > 0;
  return (name: string) => (hasBlocks ? (blocks[name]?.enabled ?? false) : true);
}
function exitVariant(config: ScaffoldConfig, id: string, exitKey: string, fallback: 'primary' | 'secondary' | 'tertiary' | 'dark' | 'danger') {
  return config.flowButtonVariants[`${id}.${exitKey}`] ?? fallback;
}

// ─── Per-page renderers ──────────────────────────────────────────────────────

function HeroBleed({ kind = 'image' }: { kind?: string }) {
  if (kind === 'solid') return <div className="pp-hero-bg pp-hero-bg--solid" aria-hidden />;
  if (kind === 'gradient') return <div className="pp-hero-bg pp-hero-bg--gradient" aria-hidden />;
  return (
    <>
      <img src="/hero-mobile.png" alt="" className="pp-hero-img" aria-hidden />
      <div className="pp-hero-shade" aria-hidden />
    </>
  );
}

/** One header corner control, driven by the header-chrome left/right slot. */
function HeaderSlot({ slot, onMenu, onBack }: { slot: string; onMenu?: () => void; onBack?: () => void }) {
  if (!slot || slot === 'none') return <span className="pp-slot-spacer" aria-hidden />;
  if (slot === 'menu') {
    return <button type="button" className="pp-menu" aria-label="Menu" onClick={onMenu}><HamburgerSvg /></button>;
  }
  // back/close return to the previous page; help/decorative are non-navigating.
  const glyph = slot === 'back' ? '‹' : slot === 'close' ? '×' : slot === 'help' ? '?' : '◆';
  const goesBack = slot === 'back' || slot === 'close';
  return (
    <button type="button" className="pp-menu" aria-label={slot} onClick={goesBack ? onBack : undefined}>
      {glyph}
    </button>
  );
}

/**
 * Header-chrome block. Renders left + right corner slots from the block's
 * leftSlot/rightSlot settings, so changing those in the editor moves the
 * controls here. back/close slots step to the previous page via navigate;
 * audio (a separate module) rides in the right cluster.
 */
function HeaderChrome({ config, instance, navigate, onMenu, showAudio }:
  { config: ScaffoldConfig; instance: PageInstance; navigate: NavFn; onMenu?: () => void; showAudio?: boolean }
) {
  const [muted, setMuted] = useState(false);
  const left  = (blockSetting(config, instance, 'header-chrome', 'leftSlot')  as string) ?? 'none';
  const right = (blockSetting(config, instance, 'header-chrome', 'rightSlot') as string) ?? 'none';
  const onBack = () => navigate(instance.id, 'back');
  return (
    <div className="pp-header pp-header--slots">
      <HeaderSlot slot={left} onMenu={onMenu} onBack={onBack} />
      <div className="pp-header__actions">
        {showAudio && (
          <button type="button" className="pp-menu pp-audio" aria-label={muted ? 'Unmute' : 'Mute'} aria-pressed={muted} onClick={(e) => { e.stopPropagation(); setMuted(m => !m); }}>
            {muted ? '🔇' : '🔊'}
          </button>
        )}
        <HeaderSlot slot={right} onMenu={onMenu} onBack={onBack} />
      </div>
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

// Per-page label for the FIRST (primary) cta-group button. Real labels come from
// CAPE at runtime; the preview only needs a representative placeholder.
const PRIMARY_CTA_LABEL: Record<string, string> = {
  landing: 'Play now',
  result: 'Continue',
  leaderboard: 'Continue',
  voucher: 'Continue',
  register: 'Register',
  end: 'Done',
};

type PreviewButton = { variant: string; exit: string };

const KNOWN_VARIANTS = ['primary', 'secondary', 'tertiary', 'dark', 'danger'] as const;
function normalizeVariant(v: string): (typeof KNOWN_VARIANTS)[number] {
  return (KNOWN_VARIANTS as readonly string[]).includes(v) ? (v as (typeof KNOWN_VARIANTS)[number]) : 'secondary';
}

/** Read the cta-group block's buttons for this page instance (the source of truth). */
function ctaGroupButtons(config: ScaffoldConfig, instance: PageInstance): PreviewButton[] {
  const raw = blockSetting(config, instance, 'cta-group', 'buttons');
  const list = Array.isArray(raw) ? raw : [];
  const mapped = list
    .filter((b): b is Record<string, unknown> => Boolean(b) && typeof b === 'object' && !Array.isArray(b))
    .map((b) => ({ variant: String(b.variant ?? 'primary'), exit: String(b.exit ?? '') }));
  return mapped.length ? mapped : [{ variant: 'primary', exit: '' }];
}

function ctaButtonLabel(config: ScaffoldConfig, instance: PageInstance, button: PreviewButton, index: number): string {
  if (index === 0) return PRIMARY_CTA_LABEL[instance.type] ?? 'Continue';
  // Secondary buttons: label by their destination page so the user can tell where
  // each one goes (the real button copy is authored in CAPE).
  const dest = config.pages.find((p) => p.id === button.exit);
  const meta = dest ? pageMeta(dest.type) : undefined;
  return meta?.label ?? 'Continue';
}

/**
 * Renders the page's CTA buttons straight from the cta-group block — one button
 * per entry, with its own variant and destination. This is what makes the
 * preview reflect exactly what you configured in the block editor (count,
 * variants, targets), instead of a fixed set of semantic slots.
 */
function CtaGroupPreview({ config, instance, navTo }: { config: ScaffoldConfig; instance: PageInstance; navTo: NavToFn }) {
  const buttons = ctaGroupButtons(config, instance);
  return (
    <div className="pp-actions">
      {buttons.map((b, i) => (
        <CtaButton
          key={i}
          kind={normalizeVariant(b.variant)}
          label={ctaButtonLabel(config, instance, b, i)}
          onClick={() => { if (b.exit) navTo(b.exit); }}
        />
      ))}
    </div>
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

// ── Optional add-on blocks (off by default; toggling them on shows these) ─────

function BrandChip({ size = 'md' }: { size?: string }) {
  return <div className={`pp-brand-chip pp-brand-chip--${size}`} aria-hidden>◆ brand</div>;
}

/**
 * Title block — headline plus optional kicker/subtitle. showKicker/showSubtitle
 * come from the block settings, so toggling them reflects in the preview.
 */
function TitleBlock({ config, instance, kicker, title, subtitle }:
  { config: ScaffoldConfig; instance: PageInstance; kicker: string; title: string; subtitle: string }
) {
  const showKicker   = Boolean(blockSetting(config, instance, 'title-block', 'showKicker'));
  const showSubtitle = Boolean(blockSetting(config, instance, 'title-block', 'showSubtitle'));
  return <HeroStack kicker={showKicker ? kicker : undefined} title={title} body={showSubtitle ? subtitle : undefined} />;
}
function BodyCopy({ children }: { children: React.ReactNode }) {
  return <p className="pp-body pp-body--block">{children}</p>;
}
function ScoreIllustration() {
  return <div className="pp-score-illus" aria-hidden>🏆</div>;
}
function StatsTable({ count = 3 }: { count?: number }) {
  const rows = [
    { k: 'Accuracy', v: '92%' },
    { k: 'Best combo', v: '×14' },
    { k: 'Time left', v: '0:08' },
    { k: 'Coins', v: '320' },
  ].slice(0, Math.max(1, Math.min(4, count)));
  return (
    <div className="pp-stats">
      {rows.map(r => (
        <div key={r.k} className="pp-stats__row"><span>{r.k}</span><strong>{r.v}</strong></div>
      ))}
    </div>
  );
}
function StatusChip({ kind = 'registered' }: { kind?: string }) {
  return <span className="pp-status-chip" aria-hidden>● {kind}</span>;
}
function ComplianceBadge({ kind = '18+' }: { kind?: string }) {
  return <span className="pp-compliance" aria-hidden>{kind}</span>;
}
function FooterLinks() {
  return (
    <div className="pp-footer-links" aria-hidden>
      <span>Terms</span><span>·</span><span>Privacy</span><span>·</span><span>Rules</span>
    </div>
  );
}
function SponsorStrip() {
  return <div className="pp-sponsor-strip" aria-hidden>sponsored by ◆</div>;
}
/** Segmented tab strip driven by a tabs[] setting + defaultTab. */
function SegTabs({ tabs, active }: { tabs: string[]; active?: string }) {
  const LABELS: Record<string, string> = {
    all: 'All', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly',
    webshop: 'Webshop', 'in-store': 'In-store',
  };
  const list = tabs.length ? tabs : ['all'];
  const act = active && list.includes(active) ? active : list[0];
  return (
    <div className="pp-lb-tabs" aria-hidden>
      {list.map((t) => <span key={t} className={t === act ? 'is-active' : ''}>{LABELS[t] ?? t}</span>)}
    </div>
  );
}
function PageFooter({ compliance, links, complianceKind }:
  { compliance: boolean; links: boolean; complianceKind?: string }
) {
  if (!compliance && !links) return null;
  return (
    <div className="pp-footer">
      {compliance && <ComplianceBadge kind={complianceKind} />}
      {links && <FooterLinks />}
    </div>
  );
}

// ─────────────── Landing ───────────────

function LandingPreview({ config, instance, navigate, navTo, onMenu, showAudio }: { config: ScaffoldConfig; instance: PageInstance; navigate: NavFn; navTo: NavToFn; onMenu: () => void; showAudio?: boolean }) {
  const s = instSettings(config, instance.id);
  const skipForReturning = (s.onboardingFirstRunOnly ?? true) as boolean;
  const brand = config.brand?.trim() || config.name?.trim();
  const title = brand ? `Welcome to ${brand}` : 'Welcome';
  const on = (name: string) => blockOn(config, instance, name);
  return (
    <div className="pp pp--hero">
      {on('background') && <HeroBleed kind={blockSetting(config, instance, 'background', 'kind') as string} />}
      <div className="pp-shell">
        {on('header-chrome') && <HeaderChrome config={config} instance={instance} navigate={navigate} onMenu={onMenu} showAudio={showAudio} />}
        <div className="pp-bottom">
          {on('brand-chip') && <BrandChip size={blockSetting(config, instance, 'brand-chip', 'size') as string} />}
          {on('title-block') && <TitleBlock config={config} instance={instance} kicker="LIVE EXPERIENCE" title={title} subtitle="Are you ready to play?" />}
          {skipForReturning && <span className="pp-flag">Returning players skip the tutorial</span>}
          {on('cta-group') && <CtaGroupPreview config={config} instance={instance} navTo={navTo} />}
          <PageFooter
            compliance={on('compliance-badge')}
            links={on('footer-link-list')}
            complianceKind={blockSetting(config, instance, 'compliance-badge', 'kind') as string | undefined}
          />
        </div>
      </div>
    </div>
  );
}

function TutorialPreview({ config, instance, navigate }: { config: ScaffoldConfig; instance: PageInstance; navigate: NavFn }) {
  const s = instSettings(config, instance.id);
  const layout = (s.screenLayout as string) ?? 'fullBleedHero';
  // Step count comes from the step-indicator block (falling back to the legacy
  // page setting). Clamp so we always show at least one step.
  const stepCount = Math.max(1, Math.min(6, Number(blockSetting(config, instance, 'step-indicator', 'count') ?? s.stepCount ?? 3)));
  const [step, setStep] = useState(0);
  const STEPS = Array.from({ length: stepCount }, (_, i) => ({
    title: `Step ${i + 1}`,
    body: `Instructions for step ${i + 1}.`,
  }));
  const isLast = step === STEPS.length - 1;
  const on = (name: string) => blockOn(config, instance, name);
  const content = (
    <>
      {on('brand-chip') && <BrandChip size={blockSetting(config, instance, 'brand-chip', 'size') as string} />}
      {on('title-block') && <TitleBlock config={config} instance={instance} kicker={`HOW TO PLAY · ${step + 1} / ${STEPS.length}`} title={STEPS[step].title} subtitle="Follow along to learn the game." />}
      {on('body-copy') && <BodyCopy>{STEPS[step].body}</BodyCopy>}
      {on('step-indicator') && (
        blockSetting(config, instance, 'step-indicator', 'style') === 'count'
          ? <div className="pp-step-count" aria-hidden>{step + 1} / {STEPS.length}</div>
          : (
            <div className="pp-dots">
              {STEPS.map((_, i) => (
                <button key={i} type="button" aria-label={`step ${i + 1}`} className={`pp-dot${i === step ? ' is-active' : ''}`} onClick={() => setStep(i)} />
              ))}
            </div>
          )
      )}
      {on('nav-controls') && (
        <div className="pp-actions">
          {Boolean(blockSetting(config, instance, 'nav-controls', 'showPrev')) && (
            <CtaButton kind="tertiary" label="Prev" onClick={() => setStep(Math.max(0, step - 1))} />
          )}
          <CtaButton
            kind={exitVariant(config, instance.id, 'next', 'primary')}
            label={isLast ? 'Start' : 'Continue'}
            onClick={() => isLast ? navigate(instance.id, 'next') : setStep(step + 1)}
          />
          {Boolean(s.allowSkip) && <CtaButton kind="secondary" label="Skip" onClick={() => navigate(instance.id, 'next')} />}
        </div>
      )}
      <PageFooter compliance={on('compliance-badge')} links={false} complianceKind={blockSetting(config, instance, 'compliance-badge', 'kind') as string | undefined} />
    </>
  );

  if (layout === 'card') {
    return (
      <div className="pp pp--form pp--tutorial-card">
        <div className="pp-tutorial-panel">
          <button type="button" className="pp-card-close" aria-label="Close" onClick={() => navigate(instance.id, 'next')}>×</button>
          {on('centered-art') && <div className={`pp-card-visual pp-card-visual--${blockSetting(config, instance, 'centered-art', 'size') ?? 'md'}`} aria-hidden />}
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="pp pp--hero">
      {on('background') && <HeroBleed kind={blockSetting(config, instance, 'background', 'kind') as string} />}
      <div className="pp-shell">
        {on('header-chrome') && <HeaderChrome config={config} instance={instance} navigate={navigate} onMenu={() => navigate(instance.id, 'next')} />}
        <div className="pp-bottom">{content}</div>
      </div>
    </div>
  );
}

// ─────────────── Video ───────────────

function VideoPreview({ config, instance, navigate, navTo }: { config: ScaffoldConfig; instance: PageInstance; navigate: NavFn; navTo: NavToFn }) {
  const s = instSettings(config, instance.id);
  // intro-video and ad-video default to 'intro' playback even though the shared
  // schema default is 'loadingScreen' (only loading-video uses the loader path).
  const typeDefault = instance.type === 'loading-video' ? 'loadingScreen' : 'intro';
  const mode       = (s.mode as string) ?? typeDefault;
  const alwaysSkip = Boolean(s.alwaysSkip);
  const minSec     = (s.minPlaybackSec ?? 3) as number;
  const isLoader   = mode === 'loadingScreen';
  const skippable  = alwaysSkip || !isLoader;
  const modeLabel = instance.type === 'intro-video' ? 'INTRO'
    : instance.type === 'ad-video' ? 'AD'
    : isLoader ? 'LOADER' : 'INTRO';
  const on = blockGate(config, instance);
  return (
    <div className="pp pp--video">
      <span className="pp-video-badge" aria-hidden>{modeLabel}</span>
      {on('video-player') && (
        <div className="pp-video-stage" onClick={() => navigate(instance.id, 'next')}>
          <span className="pp-video-icon">▶</span>
        </div>
      )}
      {isLoader && on('fallback-indicator') && <span className="pp-video-loading">Loading game…</span>}
      {skippable && on('skip-control') && (
        <button type="button" className="pp-video-skip" onClick={() => navigate(instance.id, 'next')}>
          {alwaysSkip ? 'Skip →' : `Skip (${minSec}s)`}
        </button>
      )}
      {on('reveal-cta') && (
        <CtaButton
          kind={normalizeVariant(String(blockSetting(config, instance, 'reveal-cta', 'variant') ?? 'primary'))}
          label="Continue"
          onClick={() => {
            const exit = blockSetting(config, instance, 'reveal-cta', 'exit') as string | undefined;
            if (exit) navTo(exit); else navigate(instance.id, 'next');
          }}
        />
      )}
    </div>
  );
}

function LoadingVideoPreview({ config, instance, navigate }: { config: ScaffoldConfig; instance: PageInstance; navigate: NavFn }) {
  const s = instSettings(config, instance.id);
  const alwaysSkip  = Boolean(s.alwaysSkip);
  const fallbackSec = (s.readyFallbackSec ?? 8) as number;
  const on = blockGate(config, instance);
  return (
    <div className="pp pp--video">
      {on('video-player') && (
        <div className="pp-video-stage">
          <span className="pp-video-icon" style={{ animation: 'spin 1.2s linear infinite' }}>⟳</span>
          <span className="pp-video-loading">Loading game…</span>
        </div>
      )}
      {on('fallback-indicator') && (
        <button type="button" className="pp-video-skip" onClick={() => navigate(instance.id, 'next')}>
          {alwaysSkip ? 'Skip →' : `Skip (${fallbackSec}s fallback)`}
        </button>
      )}
    </div>
  );
}

// ─────────────── Register ───────────────

const FIELD_META: Record<string, { label: string; required?: boolean }> = {
  firstName:      { label: 'First name', required: true },
  middleParticle: { label: 'Infix' },
  lastName:       { label: 'Last name', required: true },
  email:          { label: 'Email', required: true },
  phone:          { label: 'Phone' },
  dob:            { label: 'Date of birth' },
  postcode:       { label: 'Postcode' },
  country:        { label: 'Country' },
};
const OPTIN_LABEL: Record<string, string> = {
  terms: 'I accept the terms',
  age18: "I'm 18 or older",
  age21: "I'm 21 or older",
  marketing: 'Send me marketing updates',
  custom: 'Custom opt-in',
};

function RegisterPreview({ config, instance, navigate }: { config: ScaffoldConfig; instance: PageInstance; navigate: NavFn }) {
  const on = (name: string) => blockOn(config, instance, name);
  const fields = (blockSetting(config, instance, 'field-set', 'fields') as string[]) ?? ['firstName', 'lastName', 'email'];
  const optIns = (blockSetting(config, instance, 'opt-in-list', 'optIns') as string[]) ?? ['terms'];
  const required = (blockSetting(config, instance, 'opt-in-list', 'required') as boolean) ?? true;
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const allTicked = optIns.every((o) => consents[o]);
  const canSubmit = !required || optIns.length === 0 || allTicked;
  const toggle = (o: string) => setConsents((prev) => ({ ...prev, [o]: !prev[o] }));
  return (
    <div className="pp pp--form">
      <div className="pp-shell pp-shell--scroll">
        {on('brand-chip') && <BrandChip size={blockSetting(config, instance, 'brand-chip', 'size') as string} />}
        {on('title-block') && <TitleBlock config={config} instance={instance} kicker="REGISTER" title="Join the game" subtitle="It only takes a minute." />}
        {on('body-copy') && <BodyCopy>Fill in your details to play.</BodyCopy>}
        <div className="pp-form">
          {on('field-set') && fields.map((f) => (
            <Field key={f} label={FIELD_META[f]?.label ?? f} required={FIELD_META[f]?.required} />
          ))}
          {on('opt-in-list') && optIns.map((o) => (
            <Checkbox key={o} label={OPTIN_LABEL[o] ?? o} checked={Boolean(consents[o])} required={required} onChange={() => toggle(o)} />
          ))}
          {on('cta-group') && (
            <CtaButton
              kind={exitVariant(config, instance.id, 'next', 'primary')}
              label={canSubmit ? 'Register' : 'Accept all to continue'}
              onClick={canSubmit ? () => navigate(instance.id, 'next') : undefined}
            />
          )}
        </div>
        <PageFooter compliance={false} links={on('footer-link-list')} />
      </div>
    </div>
  );
}
function Field({ label, narrow = false, required = false }: { label: string; narrow?: boolean; required?: boolean }) {
  return (
    <div className={`pp-field${narrow ? ' is-narrow' : ''}`}>
      <span className="pp-field__label">{label}{required && <span className="pp-req">*</span>}</span>
      <span className="pp-field__input" />
    </div>
  );
}
function Checkbox({ label, checked = false, required = false, onChange }: { label: string; checked?: boolean; required?: boolean; onChange?: () => void }) {
  return (
    <label className="pp-check">
      <span className={`pp-check__box${checked ? ' is-checked' : ''}`} onClick={onChange} role="checkbox" aria-checked={checked} />
      <span>{label}{required && <span className="pp-req">*</span>}</span>
    </label>
  );
}

// ─────────────── Game ───────────────

function GamePreview({ config, instance, navigate, showAudio }: { config: ScaffoldConfig; instance: PageInstance; navigate: NavFn; showAudio?: boolean }) {
  const s = instSettings(config, instance.id);
  const bootMode  = (s.unityBootMode as string) ?? 'entry';
  const isUnity   = config.game === 'unity';
  const on = (name: string) => blockOn(config, instance, name);
  // Timer block drives the clock + mode; fall back to the legacy page settings.
  const timerMode = (blockSetting(config, instance, 'timer', 'mode') as string) ?? 'countdown';
  const timerSec  = Number(blockSetting(config, instance, 'timer', 'durationSec') ?? s.timerSec ?? 60);
  const m = Math.floor(timerSec / 60);
  const r = timerSec % 60;
  const clock = timerMode === 'countup' ? '0:00' : `${m}:${r.toString().padStart(2, '0')}`;
  const [muted, setMuted] = useState(false);
  return (
    <div className="pp pp--game">
      {on('timer') && timerSec > 0 && (
        <div className="pp-timer">
          <span className="pp-timer__label">{timerMode === 'countup' ? 'Elapsed' : 'Time'}</span>
          <span className="pp-timer__value">{clock}</span>
        </div>
      )}
      {showAudio && on('audio-toggle') && (
        <button type="button" className="pp-game-audio" aria-pressed={muted} aria-label={muted ? 'Unmute' : 'Mute'} onClick={() => setMuted(m => !m)}>
          {muted ? '🔇' : '🔊'}
        </button>
      )}
      {on('score-readout') && (
        <div className="pp-game-score" aria-hidden>
          Score 1,240
          {Boolean(blockSetting(config, instance, 'score-readout', 'showHighScore')) && <span className="pp-game-highscore"> · Best 3,980</span>}
        </div>
      )}
      <div className="pp-game-canvas">
        <div className="pp-game-grid" aria-hidden>
          {Array.from({ length: 16 }).map((_, i) => <div key={i} className="pp-game-tile" />)}
        </div>
        <CtaButton kind={exitVariant(config, instance.id, 'next', 'tertiary')} label="Simulate game end" onClick={() => navigate(instance.id, 'next')} />
      </div>
      {on('sponsor-footer-strip') && <SponsorStrip />}
      <div className="pp-game-engine">
        {config.gameId || config.game}
        {isUnity && <span className="pp-game-boot">{bootMode === 'entry' ? 'preload from entry' : 'load on /game'}</span>}
      </div>
    </div>
  );
}

// ─────────────── Result ───────────────

function ResultPreview({ config, instance, navigate, navTo, onMenu, showAudio }: { config: ScaffoldConfig; instance: PageInstance; navigate: NavFn; navTo: NavToFn; onMenu: () => void; showAudio?: boolean }) {
  const s = instSettings(config, instance.id);
  const autoNavSec = Number(s.autoNavSec ?? 0);
  const brand = config.brand?.trim() || config.name?.trim();
  const [remaining, setRemaining] = useState(autoNavSec);
  useEffect(() => {
    setRemaining(autoNavSec);
    if (!autoNavSec) return;
    const id = setInterval(() => setRemaining(r => (r > 0 ? r - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [autoNavSec, instance.id]);
  const on = (name: string) => blockOn(config, instance, name);
  return (
    <div className="pp pp--hero">
      {on('background') && <HeroBleed kind={blockSetting(config, instance, 'background', 'kind') as string} />}
      <div className="pp-shell">
        {on('header-chrome') && <HeaderChrome config={config} instance={instance} navigate={navigate} onMenu={onMenu} showAudio={showAudio} />}
        <div className="pp-bottom">
          {on('brand-chip') && <BrandChip size={blockSetting(config, instance, 'brand-chip', 'size') as string} />}
          {on('title-block') && <TitleBlock config={config} instance={instance} kicker="RESULT" title="Well done!" subtitle="Here's how you did." />}
          {on('body-copy') && <BodyCopy>{brand ? `Thanks for playing ${brand}.` : 'Thanks for playing.'}</BodyCopy>}
          {on('score-illustration') && <ScoreIllustration />}
          {on('score-readout') && (
            <div className="pp-score-plate">
              <span className="pp-score-plate__label">Score</span>
              <span className="pp-score-plate__value">2,480</span>
              {Boolean(blockSetting(config, instance, 'score-readout', 'showHighScore')) && (
                <span className="pp-score-plate__rank">Best 3,120</span>
              )}
            </div>
          )}
          {on('stats-table') && <StatsTable count={Number(blockSetting(config, instance, 'stats-table', 'count') ?? 3)} />}
          {on('status-chip') && <StatusChip kind={blockSetting(config, instance, 'status-chip', 'kind') as string | undefined} />}
          {autoNavSec > 0 && (
            <span className="pp-flag pp-flag--ticking">
              <span className="pp-flag__dot" aria-hidden />
              Auto-continue in {remaining}s
            </span>
          )}
          {on('cta-group') && <CtaGroupPreview config={config} instance={instance} navTo={navTo} />}
          <PageFooter
            compliance={on('compliance-badge')}
            links={on('footer-link-list')}
            complianceKind={blockSetting(config, instance, 'compliance-badge', 'kind') as string | undefined}
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────── Leaderboard ───────────────

const LB_NAMES = ['Alex P.', 'Sam V.', 'Jordan K.', 'Morgan L.', 'Taylor B.', 'Riley C.', 'Casey M.', 'Jamie T.', 'Drew S.', 'Quinn R.'];

function LeaderboardPreview({ config, instance, navigate, navTo, onMenu, showAudio }: { config: ScaffoldConfig; instance: PageInstance; navigate: NavFn; navTo: NavToFn; onMenu: () => void; showAudio?: boolean }) {
  const on = (name: string) => blockOn(config, instance, name);
  const topN = Number(blockSetting(config, instance, 'top-n-highlight', 'count') ?? 3);
  // rank-list `rows` controls how many entries render (clamped to a sane mock).
  const rows = Math.max(3, Math.min(8, Number(blockSetting(config, instance, 'rank-list', 'rows') ?? 5)));
  const mock = Array.from({ length: rows }, (_, i) => ({
    rank: i + 1,
    name: LB_NAMES[i % LB_NAMES.length],
    score: 4830 - i * 180,
    you: i === 2,
  }));
  return (
    <div className="pp pp--hero">
      {on('background') && <HeroBleed kind={blockSetting(config, instance, 'background', 'kind') as string} />}
      <div className="pp-shell">
        {on('header-chrome') && <HeaderChrome config={config} instance={instance} navigate={navigate} onMenu={onMenu} showAudio={showAudio} />}
        <div className="pp-bottom">
          {on('brand-chip') && <BrandChip size={blockSetting(config, instance, 'brand-chip', 'size') as string} />}
          {on('title-block') && <TitleBlock config={config} instance={instance} kicker="LEADERBOARD" title="Top players" subtitle="See where you rank." />}
          {on('leaderboard-tabs') && (
            <SegTabs
              tabs={(blockSetting(config, instance, 'leaderboard-tabs', 'tabs') as string[]) ?? ['all', 'daily', 'weekly']}
              active={blockSetting(config, instance, 'leaderboard-tabs', 'defaultTab') as string}
            />
          )}
          {on('rank-list') && (
            <ol className="pp-lb">
              {mock.map(r => (
                <li key={r.rank} className={`pp-lb__row${r.you ? ' is-you' : ''}${on('top-n-highlight') && r.rank <= topN ? ' is-top' : ''}`}>
                  <span className="pp-lb__rank">#{r.rank}</span>
                  <span className="pp-lb__name">{r.name}{r.you ? ' (you)' : ''}</span>
                  <span className="pp-lb__score">{r.score.toLocaleString()}</span>
                </li>
              ))}
            </ol>
          )}
          {on('personal-best-row') && (
            <div className="pp-lb__personal" aria-hidden>
              <span className="pp-lb__rank">#3</span>
              <span className="pp-lb__name">Your best</span>
              <span className="pp-lb__score">4,501</span>
            </div>
          )}
          {on('cta-group') && <CtaGroupPreview config={config} instance={instance} navTo={navTo} />}
        </div>
      </div>
    </div>
  );
}

// ─────────────── Voucher ───────────────

function VoucherPreview({ config, instance, navigate, navTo, onMenu, showAudio }: { config: ScaffoldConfig; instance: PageInstance; navigate: NavFn; navTo: NavToFn; onMenu: () => void; showAudio?: boolean }) {
  const s = instSettings(config, instance.id);
  // QR shows when both the setting allows it AND the qr-display block is on.
  const showQrSetting = (s.showQr ?? true) as boolean;
  const codeLength = ((s.codeLength as number) || 8);
  const sample = 'LIVEWALL-2025-CAMPAIGN'.replace(/-/g, '');
  const code = sample.slice(0, codeLength).padEnd(codeLength, 'X');
  const on = (name: string) => blockOn(config, instance, name);
  return (
    <div className="pp pp--hero">
      {on('background') && <HeroBleed kind={blockSetting(config, instance, 'background', 'kind') as string} />}
      <div className="pp-shell">
        {on('header-chrome') && <HeaderChrome config={config} instance={instance} navigate={navigate} onMenu={onMenu} showAudio={showAudio} />}
        <div className="pp-bottom pp-bottom--center">
          {on('brand-chip') && <BrandChip size={blockSetting(config, instance, 'brand-chip', 'size') as string} />}
          {on('title-block') && <TitleBlock config={config} instance={instance} kicker="REWARD" title="Your voucher" subtitle="Your reward is ready." />}
          {on('body-copy') && <BodyCopy>Show this code at checkout.</BodyCopy>}
          {on('channel-tabs') && (
            <SegTabs
              tabs={(blockSetting(config, instance, 'channel-tabs', 'tabs') as string[]) ?? ['webshop', 'in-store']}
              active={blockSetting(config, instance, 'channel-tabs', 'defaultTab') as string}
            />
          )}
          {(on('code-box') || (on('qr-display') && showQrSetting)) && (
            <div className="pp-voucher">
              {on('code-box') && <span className="pp-voucher__code">{code}</span>}
              {on('qr-display') && showQrSetting && <div className="pp-voucher__qr" aria-hidden>▦</div>}
            </div>
          )}
          {on('cta-group') && <CtaGroupPreview config={config} instance={instance} navTo={navTo} />}
          <PageFooter
            compliance={on('compliance-badge')}
            links={on('footer-link-list')}
            complianceKind={blockSetting(config, instance, 'compliance-badge', 'kind') as string | undefined}
          />
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

// ─────────────── Loading (pre-entry) ───────────────

function LoadingPreview({ config, instance }: { config: ScaffoldConfig; instance: PageInstance }) {
  const on = (name: string) => blockOn(config, instance, name);
  const indicatorKind = (blockSetting(config, instance, 'loading-indicator', 'kind') as string) ?? 'ring';
  return (
    <div className="pp pp--hero">
      {on('background') && <HeroBleed kind={blockSetting(config, instance, 'background', 'kind') as string} />}
      <div className="pp-shell">
        <div className="pp-bottom pp-bottom--center">
          {on('brand-chip') && <BrandChip size={blockSetting(config, instance, 'brand-chip', 'size') as string} />}
          {on('centered-art') && <div className={`pp-card-visual pp-card-visual--${blockSetting(config, instance, 'centered-art', 'size') ?? 'md'}`} aria-hidden />}
          {on('tagline') && <p className="pp-body" style={{ textAlign: 'center' }}>Loading your experience…</p>}
          {on('loading-indicator') && (
            indicatorKind === 'bar'
              ? <div className="pp-load-bar" aria-hidden><span /></div>
              : <span className="pp-video-icon" style={{ animation: 'spin 1.2s linear infinite', alignSelf: 'center' }}>⟳</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────── End / thank-you ───────────────

function EndPreview({ config, instance, navigate, navTo, onMenu, showAudio }: { config: ScaffoldConfig; instance: PageInstance; navigate: NavFn; navTo: NavToFn; onMenu: () => void; showAudio?: boolean }) {
  const brand = config.brand?.trim() || config.name?.trim();
  return (
    <div className="pp pp--hero">
      <HeroBleed />
      <div className="pp-shell">
        <HeaderChrome config={config} instance={instance} navigate={navigate} onMenu={onMenu} showAudio={showAudio} />
        <div className="pp-bottom pp-bottom--center">
          <HeroStack kicker="THANK YOU" title="See you next time!" body={brand ? `Thanks for playing ${brand}.` : undefined} />
          {blockOn(config, instance, 'cta-group') && <CtaGroupPreview config={config} instance={instance} navTo={navTo} />}
        </div>
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
