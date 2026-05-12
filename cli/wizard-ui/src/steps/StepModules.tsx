import { useEffect, useMemo, useState } from 'react';
import { ALL_PAGES, type StepProps } from '../shared/config.ts';
import { listModules, type ModuleInfo } from '../bridge.ts';

const FALLBACK_MODULES: ModuleInfo[] = [
  { id: 'leaderboard', name: 'Leaderboard', description: 'Leaderboard page and score display.', implies: ['scoring'], packages: [] },
  { id: 'registration', name: 'Registration', description: 'Player registration form and opt-ins.', implies: [], packages: [] },
  { id: 'scoring', name: 'Scoring', description: 'Create/end session actions for scores.', implies: [], packages: [] },
  { id: 'gtm', name: 'Google Tag Manager', description: 'Inject a GTM container.', implies: [], packages: [] },
  { id: 'voucher', name: 'Voucher', description: 'Voucher page and QR code support.', implies: [], packages: [] },
  { id: 'video', name: 'Video Interlude', description: 'Video intro/loading page.', implies: [], packages: [] },
];

export default function StepModules({ config, setConfig }: StepProps) {
  const [catalog, setCatalog] = useState<ModuleInfo[]>(FALLBACK_MODULES);

  useEffect(() => {
    let cancelled = false;
    listModules().then((modules) => {
      if (!cancelled && modules.length > 0) setCatalog(modules);
    });
    return () => { cancelled = true; };
  }, []);

  const pageTypes = useMemo(() => config.pages.map((p) => p.type), [config.pages]);
  const auto = useMemo(() => autoModulesForPages(pageTypes, catalog), [pageTypes, catalog]);
  const selected = new Set(config.modules);

  const visibleCatalog = catalog.filter((module) => {
    const engineOk = !module.engine || module.engine === config.game;
    if (!engineOk) return false;
    if (auto.has(module.id) || selected.has(module.id)) return true;
    return moduleSupportedByPages(module.id, pageTypes);
  });

  useEffect(() => {
    const allowed = new Set(visibleCatalog.map((module) => module.id));
    const nextModules = config.modules.filter((id) => allowed.has(id));
    if (nextModules.length !== config.modules.length) {
      setConfig({ ...config, modules: nextModules });
    }
  }, [config, setConfig, visibleCatalog]);

  const toggle = (id: string) => {
    if (auto.has(id)) return;
    const next = selected.has(id)
      ? config.modules.filter((m) => m !== id)
      : [...config.modules, id];
    setConfig({ ...config, modules: next });
  };

  return (
    <>
      <div>
        <h2 className="step__title">Modules</h2>
        <p className="step__hint">
          Only modules supported by your selected pages are shown. Required modules are selected and locked.
        </p>
      </div>

      <div className="module-grid">
        {visibleCatalog.map((module) => {
          const checked = selected.has(module.id) || auto.has(module.id);
          const locked = auto.has(module.id);
          return (
            <label key={module.id} className={`module-card${checked ? ' is-selected' : ''}${locked ? ' is-locked' : ''}`}>
              <input
                type="checkbox"
                checked={checked}
                disabled={locked}
                onChange={() => toggle(module.id)}
              />
              <div className="module-card__body">
                <div className="module-card__head">
                  <strong>{module.name || module.id}</strong>
                  <code>{module.id}</code>
                </div>
                {module.description && <p className="step__hint">{module.description}</p>}
                <div className="module-card__badges">
                  {locked && <span className="module-badge">added by {auto.get(module.id)}</span>}
                  {module.implies.length > 0 && <span className="module-badge">implies: {module.implies.join(', ')}</span>}
                  {module.packages.length > 0 && <span className="module-badge">packages: {module.packages.length}</span>}
                </div>

                {module.id === 'gtm' && checked && (
                  <div className="field module-card__inline">
                    <label htmlFor="gtmId">GTM ID</label>
                    <input
                      id="gtmId"
                      type="text"
                      placeholder="GTM-XXXXXX"
                      value={config.gtmId}
                      onChange={(e) => setConfig({ ...config, gtmId: e.target.value.trim() })}
                    />
                    <p className="step__hint">Leave blank to fill in the generated .env later.</p>
                  </div>
                )}
              </div>
            </label>
          );
        })}
      </div>
    </>
  );
}

StepModules.validate = () => null;

const GLOBAL_MODULES = new Set(['audio', 'cookie-consent', 'gtm']);
const MODULE_PAGE_SUPPORT: Record<string, string[]> = {
  leaderboard: ['leaderboard'],
  registration: ['register'],
  scoring: ['game', 'result', 'register', 'leaderboard'],
  voucher: ['voucher'],
  video: ['video', 'intro-video', 'loading-video', 'ad-video'],
};

function moduleSupportedByPages(moduleId: string, pageTypes: string[]): boolean {
  if (GLOBAL_MODULES.has(moduleId)) return true;
  const supported = MODULE_PAGE_SUPPORT[moduleId];
  if (!supported) return false;
  return supported.some((pageType) => pageTypes.includes(pageType));
}

function autoModulesForPages(pageTypes: string[], catalog: ModuleInfo[]): Map<string, string> {
  const auto = new Map<string, string>();
  for (const pageType of pageTypes) {
    const meta = ALL_PAGES.find((page) => page.id === pageType);
    if (meta?.requires) auto.set(meta.requires, pageType);
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const module of catalog) {
      if (!auto.has(module.id)) continue;
      for (const implied of module.implies) {
        if (!auto.has(implied)) {
          auto.set(implied, module.id);
          changed = true;
        }
      }
    }
  }
  return auto;
}
