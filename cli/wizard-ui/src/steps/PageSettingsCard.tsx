import {
  PAGE_SETTINGS_SCHEMA,
  type PageSettings,
  type SettingDef,
  type SettingValue,
} from '../shared/config.ts';

interface Props {
  /** Instance id — what settings are keyed by (e.g. "video", "video-2"). */
  pageId:      string;
  /**
   * Page TYPE — what the schema is looked up by (e.g. "video"). For singleton
   * instances `pageId === schemaType`; for duplicates they differ.
   */
  schemaType:  string;
  pageLabel:   string;
  settings:    PageSettings;
  setSettings: (next: PageSettings) => void;
}

/**
 * Renders the configurable settings for a single page instance.
 * Returns null if the type has no schema entry — the caller can blindly map
 * over flow instances and only the ones with settings surface.
 */
export default function PageSettingsCard({ pageId, schemaType, pageLabel, settings, setSettings }: Props) {
  const schema = PAGE_SETTINGS_SCHEMA[schemaType];
  if (!schema || schema.length === 0) return null;

  const pageValues = settings[pageId] ?? {};
  const resolvedValues = Object.fromEntries(
    schema.map((def) => [def.key, pageValues[def.key] ?? def.default]),
  ) as Record<string, SettingValue>;
  const visibleSettings = schema.filter((def) => isVisible(def, resolvedValues));

  const update = (key: string, value: SettingValue) => {
    setSettings({
      ...settings,
      [pageId]: { ...pageValues, [key]: value },
    });
  };

  return (
    <section className="page-settings-card">
      <header className="page-settings-card__head">
        <h4 className="page-settings-card__title">{pageLabel}</h4>
        <code className="page-settings-card__path">settings.pages.{pageId}</code>
      </header>

      <div className="page-settings-card__body">
        {visibleSettings.map((def) => (
          <SettingControl
            key={def.key}
            def={def}
            value={pageValues[def.key] ?? def.default}
            isDefault={(pageValues[def.key] ?? def.default) === def.default}
            onChange={(v) => update(def.key, v)}
            onReset={() => update(def.key, def.default)}
          />
        ))}
      </div>
    </section>
  );
}

function SettingControl({
  def, value, isDefault, onChange, onReset,
}: {
  def:      SettingDef;
  value:    SettingValue;
  isDefault: boolean;
  onChange: (v: SettingValue) => void;
  onReset:  () => void;
}) {
  const hint = cleanHint(def.hint);

  return (
    <div className="page-setting">
      <div className="page-setting__head">
        <div>
          <label className="page-setting__label">{def.label}</label>
          {hint && <p className="page-setting__hint">{hint}</p>}
        </div>
        <div className="page-setting__meta">
          {isDefault && <span className="page-setting__default">Default</span>}
          <button type="button" className="page-setting__reset" onClick={onReset} disabled={isDefault}>
            Reset
          </button>
        </div>
      </div>

      <div className="page-setting__control">
        {def.kind === 'select' && (
          <select
            value={String(value)}
            onChange={(e) => onChange(e.target.value)}
          >
            {(def.options ?? []).map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}

        {def.kind === 'number' && (
          <div className="page-setting__number">
            <input
              type="number"
              value={Number(value)}
              min={def.min}
              max={def.max}
              onChange={(e) => onChange(Number(e.target.value))}
            />
            {def.unit && <span className="page-setting__unit">{def.unit}</span>}
          </div>
        )}

        {def.kind === 'boolean' && (
          <label className="page-setting__bool">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
            />
            <span className="page-setting__switch" aria-hidden="true" />
            <span>{Boolean(value) ? 'On' : 'Off'}</span>
          </label>
        )}
      </div>
    </div>
  );
}

function isVisible(def: SettingDef, values: Record<string, SettingValue>): boolean {
  if (!def.showWhen?.length) return true;
  return def.showWhen.every((rule) => values[rule.key] === rule.value);
}

function cleanHint(hint?: string): string {
  return (hint ?? '')
    .replace(/^âœ“\s*/, '')
    .replace(/^✓\s*/, '');
}
