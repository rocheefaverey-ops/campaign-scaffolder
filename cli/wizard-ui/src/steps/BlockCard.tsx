import { useEffect, useMemo, useState } from 'react';
import {
  blockLabel,
  settingDefault,
  settingLabel,
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
  index,
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
        </div>

        <div className="block-card__actions">
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

      {block?.description && <p className="block-card__description">{block.description}</p>}

      {settingKeys.length > 0 ? (
        <div className="block-card__settings">
          <div className="block-card__settings-head">
            <span>{index + 1}</span>
            <button type="button" onClick={onResetSettings}>Reset settings</button>
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
      ) : (
        <div className="block-card__empty">No block-level settings.</div>
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
      <label className="block-setting block-setting--inline">
        <span>{label}</span>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />
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
        </div>
      </label>
    );
  }

  if (kind === 'select' && def?.options?.length) {
    return (
      <label className="block-setting">
        <span>{label}</span>
        <select value={String(value)} onChange={(event) => onChange(event.target.value)}>
          {def.options.map((option) => (
            <option key={option.value} value={option.value}>{option.label ?? option.value}</option>
          ))}
        </select>
      </label>
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

function controlKind(def: BlockSettingDef | undefined, value: BlockSetting): 'boolean' | 'number' | 'select' | 'json' | 'text' {
  if (def?.options?.length) return 'select';
  if (def?.kind === 'boolean') return 'boolean';
  if (def?.kind === 'number') return 'number';
  if (def?.kind === 'select') return 'select';
  if (def?.kind === 'json') return 'json';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (Array.isArray(value) || (value && typeof value === 'object')) return 'json';
  return 'text';
}

function formatJson(value: BlockSetting): string {
  return JSON.stringify(value, null, 2);
}
