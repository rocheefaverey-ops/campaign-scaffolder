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
        {schema.map((def) => (
          <SettingControl
            key={def.key}
            def={def}
            value={pageValues[def.key] ?? def.default}
            onChange={(v) => update(def.key, v)}
          />
        ))}
      </div>
    </section>
  );
}

function SettingControl({
  def, value, onChange,
}: {
  def:      SettingDef;
  value:    SettingValue;
  onChange: (v: SettingValue) => void;
}) {
  return (
    <div className="page-setting">
      <div className="page-setting__head">
        <label className="page-setting__label">{def.label}</label>
        <code className="page-setting__key">{def.key}</code>
      </div>
      {def.hint && <p className="page-setting__hint">{def.hint}</p>}

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
            <span>{Boolean(value) ? 'On' : 'Off'}</span>
          </label>
        )}
      </div>
    </div>
  );
}
