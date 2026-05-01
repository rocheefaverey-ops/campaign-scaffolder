import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import {
  ALL_PAGES, pageMeta, PAGE_SETTINGS_SCHEMA, nextInstanceId, MENU_ITEMS,
  type ScaffoldConfig, type RegMode, type StepProps, type PageInstance,
} from '../shared/config.ts';
import PageSettingsCard from './PageSettingsCard.tsx';
import PreviewPane from './PreviewPane.tsx';

export default function StepPages({ config, setConfig }: StepProps) {
  const inFlow      = config.pages;
  const hasRegister = inFlow.some(i => i.type === 'register');

  /** Number of instances of each type currently in the flow. */
  const typeCounts: Record<string, number> = {};
  for (const i of inFlow) typeCounts[i.type] = (typeCounts[i.type] ?? 0) + 1;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = inFlow.findIndex(i => i.id === String(active.id));
    const newIdx = inFlow.findIndex(i => i.id === String(over.id));
    if (oldIdx < 0 || newIdx < 0) return;
    setConfig({ ...config, pages: arrayMove(inFlow, oldIdx, newIdx) });
  };

  const addInstance = (type: string) => {
    const id = nextInstanceId(type, inFlow);
    setConfig({ ...config, pages: [...inFlow, { id, type }] });
  };
  const removeInstance = (id: string) => {
    setConfig({ ...config, pages: inFlow.filter(i => i.id !== id) });
  };

  return (
    <>
      <div>
        <h2 className="step__title">Pages &amp; flow</h2>
        <p className="step__hint">
          Click an available page to add it to your flow. The same page type can be added multiple times —
          a second video gets the route <code>/video-2</code>, a third <code>/video-3</code>, etc.
          Drag the cards in your flow to reorder them.
        </p>
      </div>

      <div className="pages-grid">
        <section className="pages-col">
          <h3 className="pages-col__title">Available</h3>
          {ALL_PAGES.map(p => {
            const count = typeCounts[p.id] ?? 0;
            return (
              <button
                key={p.id}
                className="page-card page-card--available"
                onClick={() => addInstance(p.id)}
                title={count === 0 ? 'Click to add' : 'Click to add another instance'}
              >
                <div className="page-card__row">
                  <strong>{p.label}</strong>
                  <span className="page-card__add">
                    {count === 0 ? '+ Add' : `+ Add another (${count} in flow)`}
                  </span>
                </div>
                <div className="page-card__hint">{p.hint}</div>
              </button>
            );
          })}
        </section>

        <section className="pages-col">
          <h3 className="pages-col__title">Your flow</h3>
          {inFlow.length === 0 && (
            <p className="step__hint">Pick at least one page from the left to get started.</p>
          )}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext items={inFlow.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <ol className="flow-list">
                {inFlow.map((instance, i) => (
                  <FlowCard
                    key={instance.id}
                    instance={instance}
                    index={i}
                    isLast={i === inFlow.length - 1}
                    inFlow={inFlow}
                    flowExits={config.flowExits}
                    enabledExits={config.flowEnabledExits}
                    onChangeExit={(pageId, exitKey, target) => {
                      const k = `${pageId}.${exitKey}`;
                      const next = { ...config.flowExits };
                      if (target === '') delete next[k]; else next[k] = target;
                      setConfig({ ...config, flowExits: next });
                    }}
                    onToggleExit={(pageId, exitKey, enabled) => {
                      const k = `${pageId}.${exitKey}`;
                      setConfig({ ...config, flowEnabledExits: { ...config.flowEnabledExits, [k]: enabled } });
                    }}
                    onRemove={() => removeInstance(instance.id)}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        </section>
      </div>

      <PreviewPane config={config} />

      {hasRegister && (
        <div className="reg-mode">
          <div>
            <strong>Registration timing</strong>
            <p className="step__hint" style={{ marginTop: 2 }}>
              Where in the flow should the register screen appear?
            </p>
          </div>
          <div className="reg-mode__opts">
            <RegOption mode="gate"  label="Before the game"  hint="Registration is required before play. Acts as a gate."  current={config.regMode} onClick={(m) => setConfig({ ...config, regMode: m })} />
            <RegOption mode="after" label="After the result" hint="Players play first, then register to claim their reward." current={config.regMode} onClick={(m) => setConfig({ ...config, regMode: m })} />
          </div>
        </div>
      )}

      {/* Page settings — one card per flow INSTANCE that has a schema entry.
          Settings are keyed by instance id (e.g. video, video-2, video-3),
          so multiple instances of the same type each get their own card. */}
      {inFlow.some(i => PAGE_SETTINGS_SCHEMA[i.type]?.length) && (
        <section className="page-settings">
          <header className="page-settings__head">
            <h3 className="pages-col__title">Page settings</h3>
            <p className="step__hint">
              Tweak per-instance behavior. Each instance has its own settings stored at
              <code> settings.pages.&#123;id&#125;</code>.
            </p>
          </header>

          <div className="page-settings__list">
            {inFlow.map(instance => {
              const meta = pageMeta(instance.type);
              if (!meta) return null;
              if (!PAGE_SETTINGS_SCHEMA[instance.type]?.length) return null;
              const label = instance.id === instance.type
                ? meta.label
                : `${meta.label} · ${instance.id}`;
              return (
                <PageSettingsCard
                  key={instance.id}
                  pageId={instance.id}
                  schemaType={instance.type}
                  pageLabel={label}
                  settings={config.pageSettings}
                  setSettings={(next) => setConfig({ ...config, pageSettings: next })}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Menu items — global, single set per campaign. The hamburger button on
          every hero page routes to /menu, which renders only the items ticked
          here. Saved at settings.menu.show{Id} in CAPE. */}
      <section className="menu-picker">
        <header>
          <h3 className="pages-col__title">Menu items</h3>
          <p className="step__hint">
            Pick which links appear in the hamburger menu. Click the menu button in any preview to see the menu render live.
          </p>
        </header>
        <div className="menu-picker__list">
          {MENU_ITEMS.map(item => {
            const enabled = config.menuItemsEnabled[item.id] ?? item.defaultEnabled;
            return (
              <label key={item.id} className={`menu-picker__row${enabled ? ' is-enabled' : ''}`}>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setConfig({
                    ...config,
                    menuItemsEnabled: { ...config.menuItemsEnabled, [item.id]: e.target.checked },
                  })}
                />
                <div className="menu-picker__row-body">
                  <span className="menu-picker__row-label">{item.label}</span>
                  <span className={`menu-picker__row-kind menu-picker__row-kind--${item.kind}`}>{item.kind}</span>
                  <code className="menu-picker__row-target">{item.target}</code>
                </div>
              </label>
            );
          })}
        </div>
      </section>
    </>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface FlowCardProps {
  instance:         PageInstance;
  index:            number;
  isLast:           boolean;
  inFlow:           PageInstance[];
  flowExits:        Record<string, string>;
  enabledExits:     Record<string, boolean>;
  onChangeExit:     (pageId: string, exitKey: string, target: string) => void;
  onToggleExit:     (pageId: string, exitKey: string, enabled: boolean) => void;
  onRemove:         () => void;
}

function FlowCard({ instance, index, isLast, inFlow, flowExits, enabledExits, onChangeExit, onToggleExit, onRemove }: FlowCardProps) {
  const meta = pageMeta(instance.type);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: instance.id });

  const style = {
    transform:  CSS.Transform.toString(transform),
    transition,
    opacity:    isDragging ? 0.5 : 1,
  };

  if (!meta) return null;

  const exits = meta.exits ?? [];

  // Other instances in the flow — pickable as exit destinations. Each gets a
  // display label that combines the page-type label and the instance id (so
  // "Video · video-intro" reads better than just "Video").
  const otherInstances = inFlow
    .filter((i) => i.id !== instance.id)
    .map((i) => {
      const m = pageMeta(i.type);
      return m ? { id: i.id, type: i.type, label: i.id === i.type ? m.label : `${m.label} · ${i.id}`, route: `/${i.id}` } : null;
    })
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  /** Resolve the default destination instance id for an exit, given its rule. */
  const resolveDefault = (rule: 'next-in-flow' | 'first-in-flow' | undefined): string | null => {
    if (rule === 'first-in-flow') return inFlow[0]?.id ?? null;
    return inFlow[index + 1]?.id ?? null;
  };

  // Display the route as /{instance-id} (which is what the scaffolder generates).
  const route = `/${instance.id}`;
  // Title: bare type label for a singleton instance, "Type · id" for duplicates.
  const title = instance.id === instance.type ? meta.label : `${meta.label} · ${instance.id}`;

  return (
    <li ref={setNodeRef} style={style} className={`flow-card${isDragging ? ' is-dragging' : ''}`}>
      <div className="flow-card__handle" {...attributes} {...listeners} aria-label="Drag handle">⋮⋮</div>
      <div className="flow-card__index">{index + 1}</div>
      <div className="flow-card__body">
        <div className="flow-card__row">
          <strong>{title}</strong>
          <code className="flow-card__route">{route}</code>
        </div>
        <div className="page-card__hint">{meta.hint}</div>
      </div>
      <button className="flow-card__remove" onClick={onRemove} aria-label={`Remove ${title}`}>×</button>

      {exits.length > 0 && otherInstances.length > 0 && (
        <div className="flow-card__exits">
          {exits.map((exit) => {
            const choiceKey = `${instance.id}.${exit.key}`;
            const choice    = flowExits[choiceKey] ?? '';
            const defId     = resolveDefault(exit.defaultRule);
            const defLabel  = defId
              ? (otherInstances.find(o => o.id === defId)?.label ?? defId)
              : '—';

            const isOptional = Boolean(exit.optional);
            const enabled    = isOptional
              ? (enabledExits[choiceKey] ?? exit.defaultEnabled ?? false)
              : true;

            return (
              <div key={exit.key} className={`flow-card__exit${isOptional && !enabled ? ' is-disabled' : ''}`}>
                {isOptional ? (
                  <label className="flow-card__exit-toggle">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => onToggleExit(instance.id, exit.key, e.target.checked)}
                      aria-label={`Show ${exit.label}`}
                    />
                    <span className="flow-card__exit-label">{exit.label}</span>
                  </label>
                ) : (
                  <span className="flow-card__exit-label">→ {exit.label}</span>
                )}

                <select
                  value={choice}
                  onChange={(e) => onChangeExit(instance.id, exit.key, e.target.value)}
                  disabled={!enabled}
                  aria-label={`Destination for ${title} ${exit.label}`}
                >
                  <option value="">{`Default · ${defLabel}`}</option>
                  {otherInstances.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}

      {!isLast && <div className="flow-card__arrow" aria-hidden>↓</div>}
    </li>
  );
}

function RegOption({ mode, label, hint, current, onClick }:
  { mode: RegMode; label: string; hint: string; current: RegMode; onClick: (m: RegMode) => void }
) {
  return (
    <button className={`card${current === mode ? ' is-selected' : ''}`} onClick={() => onClick(mode)}>
      <div className="card__label">{label}</div>
      <div className="card__hint">{hint}</div>
    </button>
  );
}

StepPages.validate = (c: ScaffoldConfig): string | null => {
  if (c.pages.length === 0) return 'Pick at least one page for the flow.';
  return null;
};
