import { useEffect, useMemo, useState } from 'react';
import {
  blockLabel,
  settingDefault,
  settingLabel,
  settingOptions,
  type BlockCatalogItem,
  type BlockSettingDef,
} from '../shared/blocksCatalogue.ts';
import { BUTTON_VARIANTS, type BlockSetting, type FlowPageOption, type PageBlockConfig } from '../shared/config.ts';

interface Props {
  name: string;
  block?: BlockCatalogItem;
  config: PageBlockConfig;
  index: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  /** Other pages in the flow — destinations for cta-group button exits. */
  pageOptions: FlowPageOption[];
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
  pageOptions,
  onToggle,
  onMove,
  onRemove,
  onSettingChange,
  onResetSettings,
}: Props) {
  const settingKeys = useMemo(
    () => [...new Set([...Object.keys(block?.settings ?? {}), ...Object.keys(config.settings ?? {})])]
      // `count` is legacy for cta-group (now derived from buttons.length) — don't
      // surface a stray, no-op control for projects opened before the migration.
      .filter((key) => !(name === 'cta-group' && key === 'count')),
    [block?.settings, config.settings, name],
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
                pageOptions={pageOptions}
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
  pageOptions,
  onChange,
}: {
  settingKey: string;
  def?: BlockSettingDef;
  value: BlockSetting;
  pageOptions: FlowPageOption[];
  onChange: (value: BlockSetting) => void;
}) {
  const kind = controlKind(def, value);
  const label = settingLabel(settingKey);

  if (kind === 'cta-buttons') {
    return (
      <div className="block-setting block-setting--cta">
        <span>{label}</span>
        <CtaButtonsControl def={def} value={value} pageOptions={pageOptions} onChange={onChange} />
      </div>
    );
  }

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

type CtaButton = { variant: string; exit: string };

function asButtonList(value: BlockSetting): CtaButton[] {
  if (!Array.isArray(value)) return [{ variant: 'primary', exit: '' }];
  return value.map((b) => {
    const obj = (b && typeof b === 'object' && !Array.isArray(b)) ? (b as Record<string, BlockSetting>) : {};
    return { variant: String(obj.variant ?? 'primary'), exit: String(obj.exit ?? '') };
  });
}

// Structured editor for cta-group's `buttons` (array-of-objects). Each row is one
// stacked button: a style variant + a destination page. Labels are NOT edited
// here — they come from CAPE at runtime. Count is derived from the row count
// (clamped to the manifest min/max).
function CtaButtonsControl({
  def,
  value,
  pageOptions,
  onChange,
}: {
  def?: BlockSettingDef;
  value: BlockSetting;
  pageOptions: FlowPageOption[];
  onChange: (value: BlockSetting) => void;
}) {
  const buttons = asButtonList(value);
  const min = def?.min ?? 1;
  const max = def?.max ?? 4;
  const itemVariantOptions = settingOptions(def?.item?.variant);
  const variantOptions = itemVariantOptions.length
    ? itemVariantOptions
    : BUTTON_VARIANTS.map((v) => ({ value: v.value, label: v.label }));

  const commit = (next: CtaButton[]) => onChange(next as unknown as BlockSetting);
  const update = (i: number, patch: Partial<CtaButton>) =>
    commit(buttons.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  const remove = (i: number) => commit(buttons.filter((_, idx) => idx !== i));
  const add = () => commit([...buttons, { variant: 'primary', exit: pageOptions[0]?.id ?? '' }]);

  return (
    <div className="cta-buttons">
      {buttons.map((button, i) => {
        // Surface an unknown stored target so the select isn't silently blank.
        const hasOption = pageOptions.some((o) => o.id === button.exit);
        return (
          <div className="cta-buttons__row" key={i}>
            <span className="cta-buttons__index" aria-hidden>{i + 1}</span>
            <select
              className="cta-buttons__variant"
              value={button.variant}
              onChange={(e) => update(i, { variant: e.target.value })}
              aria-label={`Button ${i + 1} style`}
            >
              {variantOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select
              className="cta-buttons__exit"
              value={button.exit}
              onChange={(e) => update(i, { exit: e.target.value })}
              aria-label={`Button ${i + 1} destination`}
            >
              <option value="">Select destination…</option>
              {!hasOption && button.exit && <option value={button.exit}>{button.exit} (not in flow)</option>}
              {pageOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            <button
              type="button"
              className="cta-buttons__remove"
              onClick={() => remove(i)}
              disabled={buttons.length <= min}
              title="Remove button"
              aria-label={`Remove button ${i + 1}`}
            >
              ×
            </button>
          </div>
        );
      })}
      <button
        type="button"
        className="cta-buttons__add"
        onClick={add}
        disabled={buttons.length >= max}
      >
        + Add button
      </button>
    </div>
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

function controlKind(def: BlockSettingDef | undefined, value: BlockSetting): 'boolean' | 'number' | 'select' | 'multiselect' | 'cta-buttons' | 'json' | 'text' {
  // Manifest vocabulary first: enum → dropdown, array-of-enum → chip multiselect.
  // array-of-objects → structured per-item editor (cta-group buttons). Must come
  // before the value-based array→json inference below.
  if (def?.kind === 'array-of-objects') return 'cta-buttons';
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
