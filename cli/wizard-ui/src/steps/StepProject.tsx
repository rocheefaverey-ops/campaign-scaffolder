import { useMemo, useState } from 'react';
import { LANGUAGES, type ScaffoldConfig, type Market, type StepProps, type LanguageOption } from '../shared/config.ts';

const NAME_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

export default function StepProject({ config, setConfig }: StepProps) {
  const toggleSupported = (code: string) => {
    const has = config.supportedLanguages.includes(code);
    let next = has
      ? config.supportedLanguages.filter(c => c !== code)
      : [...config.supportedLanguages, code];
    // Always keep the default in supported.
    if (!next.includes(config.defaultLanguage)) next = [config.defaultLanguage, ...next];
    setConfig({ ...config, supportedLanguages: next });
  };

  const setDefault = (code: string) => {
    const supported = config.supportedLanguages.includes(code)
      ? config.supportedLanguages
      : [...config.supportedLanguages, code];
    setConfig({ ...config, defaultLanguage: code, supportedLanguages: supported });
  };

  return (
    <>
      <div>
        <h2 className="step__title">Project basics</h2>
        <p className="step__hint">These get baked into the scaffolded files (folder name, env vars, CAPE binding).</p>
      </div>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
        <div className="field">
          <label htmlFor="name">Project name</label>
          <input
            id="name" type="text" placeholder="hema-handdoek-2025"
            value={config.name}
            onChange={(e) => setConfig({ ...config, name: e.target.value.trim() })}
          />
        </div>

        <div className="field">
          <label htmlFor="market">Market</label>
          <select
            id="market"
            value={config.market}
            onChange={(e) => setConfig({ ...config, market: e.target.value as Market })}
          >
            <option value="NL">NL — Netherlands</option>
            <option value="BE">BE — Belgium</option>
            <option value="FR">FR — France</option>
            <option value="DE">DE — Germany</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="brand">Brand (optional)</label>
          <input
            id="brand" type="text" placeholder="e.g. Hema, Heineken, Proximus"
            value={config.brand}
            onChange={(e) => setConfig({ ...config, brand: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="department">Department (optional)</label>
          <input
            id="department" type="text" placeholder="e.g. Marketing, Loyalty"
            value={config.department}
            onChange={(e) => setConfig({ ...config, department: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="timezone">Timezone</label>
          <select
            id="timezone"
            value={config.timezone}
            onChange={(e) => setConfig({ ...config, timezone: e.target.value })}
          >
            <option value="Europe/Brussels">Europe/Brussels</option>
            <option value="Europe/Amsterdam">Europe/Amsterdam</option>
            <option value="Europe/Paris">Europe/Paris</option>
            <option value="Europe/Berlin">Europe/Berlin</option>
            <option value="Europe/London">Europe/London</option>
            <option value="Europe/Madrid">Europe/Madrid</option>
            <option value="Europe/Rome">Europe/Rome</option>
            <option value="Europe/Stockholm">Europe/Stockholm</option>
            <option value="Europe/Helsinki">Europe/Helsinki</option>
            <option value="Europe/Warsaw">Europe/Warsaw</option>
            <option value="UTC">UTC</option>
          </select>
        </div>

        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="output">Output folder (optional)</label>
          <input
            id="output" type="text" placeholder="(default: sibling dir of scaffolder)"
            value={config.outputDir ?? ''}
            onChange={(e) => setConfig({ ...config, outputDir: e.target.value || undefined })}
          />
        </div>
      </div>

      <p className="step__hint" style={{ marginTop: 4 }}>
        CAPE campaign setup happens at the end — by default we'll create a fresh campaign for you. No need to enter an ID here.
      </p>

      <LanguagesPicker config={config} toggleSupported={toggleSupported} setDefault={setDefault} />
    </>
  );
}

// ─── Languages picker (with grouping, search, and "Selected first") ────────

const OTHER = 'Other';

function LanguagesPicker({
  config, toggleSupported, setDefault,
}: {
  config:          ScaffoldConfig;
  toggleSupported: (code: string) => void;
  setDefault:      (code: string) => void;
}) {
  const [filter, setFilter] = useState('');

  const groups = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const matches = (l: LanguageOption) =>
      !q || l.code.toLowerCase().includes(q) || l.label.toLowerCase().includes(q);

    // Always-on "Selected" group at the top so the user can see what they
    // already picked even when searching.
    const selected = LANGUAGES.filter(l =>
      config.supportedLanguages.includes(l.code) && matches(l));

    const byGroup = new Map<string, LanguageOption[]>();
    for (const l of LANGUAGES) {
      if (!matches(l)) continue;
      const g = l.group ?? OTHER;
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g)!.push(l);
    }
    return { selected, byGroup };
  }, [filter, config.supportedLanguages]);

  return (
    <section className="lang-block">
      <header>
        <h3 className="pages-col__title">Languages</h3>
        <p className="step__hint">
          The <strong>default</strong> is the language the site loads in (used for <code>&lt;html lang&gt;</code> and <code>NEXT_PUBLIC_CAPE_LANGUAGE</code>).
          Click a language to toggle it as supported · click ☆/★ to set the default · the default is always supported.
        </p>
        <p className="step__hint" style={{ marginTop: 4 }}>
          <strong>{config.supportedLanguages.length}</strong> selected · default <code>{config.defaultLanguage}</code>
        </p>
      </header>

      <div className="lang-search">
        <input
          type="search"
          placeholder="Filter by code or name (e.g. NL, English, 中文)…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {groups.selected.length > 0 && filter && (
        <LangGroup
          title="Selected"
          items={groups.selected}
          config={config}
          toggleSupported={toggleSupported}
          setDefault={setDefault}
        />
      )}

      {Array.from(groups.byGroup.entries()).map(([groupName, items]) => (
        <LangGroup
          key={groupName}
          title={groupName}
          items={items}
          config={config}
          toggleSupported={toggleSupported}
          setDefault={setDefault}
        />
      ))}

      {Array.from(groups.byGroup.values()).every(arr => arr.length === 0) && (
        <p className="step__hint">No languages match "{filter}".</p>
      )}
    </section>
  );
}

function LangGroup({
  title, items, config, toggleSupported, setDefault,
}: {
  title:           string;
  items:           LanguageOption[];
  config:          ScaffoldConfig;
  toggleSupported: (code: string) => void;
  setDefault:      (code: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="lang-group">
      <h4 className="lang-group__title">{title}</h4>
      <div className="lang-grid">
        {items.map((lang) => {
          const isDefault   = config.defaultLanguage === lang.code;
          const isSupported = config.supportedLanguages.includes(lang.code);
          return (
            <div key={lang.code} className={`lang-cell${isDefault ? ' is-default' : ''}${isSupported ? ' is-supported' : ''}`}>
              <button
                type="button"
                className="lang-cell__main"
                onClick={() => toggleSupported(lang.code)}
                aria-pressed={isSupported}
                title={isSupported ? 'Remove from supported' : 'Add to supported'}
              >
                <span className="lang-cell__code">{lang.code}</span>
                <span className="lang-cell__name">{lang.label}</span>
              </button>
              <button
                type="button"
                className="lang-cell__star"
                onClick={() => setDefault(lang.code)}
                aria-label={`Set ${lang.label} as default`}
                aria-pressed={isDefault}
                title="Set as default"
              >
                {isDefault ? '★' : '☆'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

StepProject.validate = (c: ScaffoldConfig): string | null => {
  if (!c.name)             return 'Project name is required.';
  if (!NAME_RE.test(c.name)) return 'Project name must be lowercase letters, numbers, and hyphens (e.g. hema-handdoek-2025).';
  return null;
};
