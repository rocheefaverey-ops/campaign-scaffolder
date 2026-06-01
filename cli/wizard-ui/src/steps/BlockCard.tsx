import { useEffect, useMemo, useState } from 'react';
import {
  blockLabel,
  settingDefault,
  settingLabel,
  settingOptions,
  type BlockCatalogItem,
  type BlockSettingDef,
} from '../shared/blocksCatalogue.ts';
import type { BlockSetting, PageBlockConfig } from '../shared/config.ts';

interface Props {
  name: string;
  block?: BlockCatalogItem;
  config: PageBlockConfig;
  index: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onToggle: (enabled: boolean) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  onSettingChange: (key: string, value: BlockSetting) => void;
  onResetSettings: () => void;
}

export default function BlockCard({
  name,
  block,
  config,
  index: _index,
  canMoveUp,
  canMoveDown,
  onToggle,
  onMove,
  onRemove,
  onSettingChange,
  onResetSettings,
}: Props) {
  const settingKeys = useMemo(
    () => [...new Set([...Object.keys(block?.settings ?? {}), ...Object.keys(config.settings ?? {})])],
    [block?.settings, config.settings],
  );
  const hasSettings = settingKeys.length > 0;
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <article className={`block-card${config.enabled ? '' : ' is-disabled'}`}>
      <header className="block-card__head">
        <label className="block-card__toggle">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(event) => onToggle(event.target.checked)}
          />
          <span aria-hidden />
        </label>

        <div className="block-card__title">
          <strong>{blockLabel(block ?? { name, displayName: '' })}</strong>
          <code>{name}</code>
          {block?.description && (
            <span className="block-card__desc">{block.description}</span>
          )}
        </div>

        <div className="block-card__actions">
          {hasSettings && (
            <button
              type="button"
              className={`block-card__expand${settingsOpen ? ' is-open' : ''}`}
              onClick={() => setSettingsOpen((v) => !v)}
              aria-expanded={settingsOpen}
              title={settingsOpen ? 'Hide settings' : 'Show settings'}
              aria-label={`${settingsOpen ? 'Hide' : 'Show'} settings for ${name}`}
            >
              ▾
            </button>
          )}
          <button type="button" onClick={() => onMove(-1)} disabled={!canMoveUp} title="Move up" aria-label={`Move ${name} up`}>
            ↑
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={!canMoveDown} title="Move down" aria-label={`Move ${name} down`}>
            ↓
          </button>
          <button type="button" onClick={onRemove} title="Remove block" aria-label={`Remove ${name}`}>
            ×
          </button>
        </div>
      </header>

      {hasSettings && settingsOpen && (
        <div className="block-card__settings">
          <div className="block-card__settings-head">
            <button type="button" onClick={onResetSettings}>Reset to defaults</button>
          </div>
          {settingKeys.map((key) => {
            const def = block?.settings?.[key];
            const value = config.settings[key] ?? settingDefault(def) ?? '';
            return (
              <BlockSettingControl
                key={key}
                settingKey={key}
                def={def}
                value={value}
                onChange={(next) => onSettingChange(key, next)}
              />
            );
          })}
        </div>
      )}
    </article>
  );
}

function BlockSettingControl({
  settingKey,
  def,
  value,
  onChange,
}: {
  settingKey: string;
  def?: BlockSettingDef;
  value: BlockSetting;
  onChange: (value: BlockSetting) => void;
}) {
  const kind = controlKind(def, value);
  const label = settingLabel(settingKey);

  if (kind === 'boolean') {
    return (
      <label className="block-setting block-setting--bool">
        <input
          type="checkbox"
          className="block-setting__switch-input"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="block-setting__switch" aria-hidden />
        <span className="block-setting__bool-label">{label}</span>
      </label>
    );
  }

  if (kind === 'number') {
    return (
      <label className="block-setting">
        <span>{label}</span>
        <div className="block-setting__number">
          <input
            type="number"
            min={def?.min}
            max={def?.max}
            value={Number(value)}
            onChange={(event) => onChange(Number(event.target.value))}
          />
          {def?.unit && <small>{def.unit}</small>}
          {(def?.min !== undefined || def?.max !== undefined) && (
            <small className="block-setting__range">{def?.min ?? 0}–{def?.max ?? '∞'}</small>
          )}
        </div>
      </label>
    );
  }

  if (kind === 'select') {
    const options = settingOptions(def);
    return (
      <label className="block-setting">
        <span>{label}</span>
        <select value={String(value)} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
    );
  }

  if (kind === 'multiselect') {
    const options = settingOptions(def);
    const selected = Array.isArray(value) ? (value as string[]) : [];
    const toggle = (v: string) => {
      const next = selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v];
      onChange(next);
    };
    return (
      <div className="block-setting">
        <span>{label}</span>
        <div className="block-setting__chips" role="group" aria-label={label}>
          {options.map((option) => {
            const on = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                className={`block-chip${on ? ' is-on' : ''}`}
                aria-pressed={on}
                onClick={() => toggle(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (kind === 'json') {
    return (
      <label className="block-setting">
        <span>{label}</span>
        <JsonSetting value={value} onChange={onChange} />
      </label>
    );
  }

  return (
    <label className="block-setting">
      <span>{label}</span>
      <input
        type="text"
        value={String(value)}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function JsonSetting({ value, onChange }: { value: BlockSetting; onChange: (value: BlockSetting) => void }) {
  const [text, setText] = useState(() => formatJson(value));
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setText(formatJson(value));
    setInvalid(false);
  }, [value]);

  const commit = () => {
    try {
      const parsed = JSON.parse(text) as BlockSetting | null;
      if (parsed === null) throw new Error('null is not a valid block setting value');
      onChange(parsed);
      setInvalid(false);
    } catch {
      setInvalid(true);
    }
  };

  return (
    <>
      <textarea
        className={invalid ? 'is-invalid' : ''}
        value={text}
        rows={Math.min(6, Math.max(2, text.split('\n').length))}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
      />
      {invalid && <small className="block-setting__error">Invalid JSON</small>}
    </>
  );
}

function controlKind(def: BlockSettingDef | undefined, value: BlockSetting): 'boolean' | 'number' | 'select' | 'multiselect' | 'json' | 'text' {
  // Manifest vocabulary first: enum → dropdown, array-of-enum → chip multiselect.
  if (def?.kind === 'array-of-enum') return 'multiselect';
  if (def?.kind === 'enum' || def?.kind === 'select' || def?.options?.length || def?.of?.length) return 'select';
  if (def?.kind === 'boolean') return 'boolean';
  if (def?.kind === 'number') return 'number';
  if (def?.kind === 'string') return 'text';
  if (def?.kind === 'json') return 'json';
  // No def (or unknown kind): infer from the current value.
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (Array.isArray(value) || (value && typeof value === 'object')) return 'json';
  return 'text';
}

function formatJson(value: BlockSetting): string {
  return JSON.stringify(value, null, 2);
}
