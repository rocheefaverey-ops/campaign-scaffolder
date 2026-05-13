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
  ALL_PAGES, pageMeta, PAGE_SETTINGS_SCHEMA, nextInstanceId, MENU_ITEMS, BUTTON_VARIANTS, defaultRouteForType,
  type ScaffoldConfig, type RegMode, type StepProps, type PageInstance, type ButtonVariant,
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
    const id    = nextInstanceId(type, inFlow);
    const route = defaultRouteForType(type);
    setConfig({ ...config, pages: [...inFlow, { id, type, route }] });
  };
  const removeInstance = (id: string) => {
    setConfig({ ...config, pages: inFlow.filter(i => i.id !== id) });
  };

  const onChangeRoute = (instanceId: string, raw: string) => {
    setConfig({
      ...config,
      pages: config.pages.map(p =>
        p.id === instanceId ? { ...p, route: raw } : p
      ),
    });
  };

  const onBlurRoute = (instanceId: string, raw: string) => {
    const slug = raw.startsWith('/') ? raw : `/${raw}`;
    setConfig({
      ...config,
      pages: config.pages.map(p =>
        p.id === instanceId ? { ...p, route: slug } : p
      ),
    });
  };

  return (
    <>
      <div>
        <h2 className="step__title">Pages &amp; flow</h2>
        <p className="step__hint">
          Click an available page to add it to your flow. Drag the cards in your flow to reorder them.
        </p>
      </div>

      <div className="pages-grid">
        <section className="pages-col">
          <h3 className="pages-col__title">Available</h3>
          {ALL_PAGES.map(p => {
            const count = typeCounts[p.id] ?? 0;
            const canAdd = count === 0;
            return (
              <button
                key={p.id}
                className="page-card page-card--available"
                onClick={() => addInstance(p.id)}
                disabled={!canAdd}
                title={!canAdd ? 'Already in flow' : 'Click to add'}
              >
                <div className="page-card__row">
                  <strong>{p.label}</strong>
                  <span className="page-card__add">
                    {!canAdd ? 'In flow' : '+ Add'}
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
                    buttonVariants={config.flowButtonVariants}
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
                    onChangeVariant={(pageId, exitKey, variant) => {
                      const k = `${pageId}.${exitKey}`;
                      setConfig({ ...config, flowButtonVariants: { ...config.flowButtonVariants, [k]: variant } });
                    }}
                    onRemove={() => removeInstance(instance.id)}
                    onChangeRoute={onChangeRoute}
                    onBlurRoute={onBlurRoute}
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
            const variant = config.menuButtonVariants[item.id] ?? item.kind;
            return (
              <div key={item.id} className={`menu-picker__row${enabled ? ' is-enabled' : ''}`}>
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
                  <select
                    className="menu-picker__variant"
                    value={variant}
                    onChange={(e) => setConfig({
                      ...config,
                      menuButtonVariants: { ...config.menuButtonVariants, [item.id]: e.target.value as ButtonVariant },
                    })}
                    aria-label={`Button variant for ${item.label}`}
                  >
                    {BUTTON_VARIANTS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                  </select>
                  <code className="menu-picker__row-target">{item.target}</code>
                </div>
              </div>
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
  buttonVariants:   Record<string, ButtonVariant>;
  onChangeExit:     (pageId: string, exitKey: string, target: string) => void;
  onToggleExit:     (pageId: string, exitKey: string, enabled: boolean) => void;
  onChangeVariant:  (pageId: string, exitKey: string, variant: ButtonVariant) => void;
  onRemove:         () => void;
  onChangeRoute:    (instanceId: string, raw: string) => void;
  onBlurRoute:      (instanceId: string, raw: string) => void;
}

function FlowCard({ instance, index, isLast, inFlow, flowExits, enabledExits, buttonVariants, onChangeExit, onToggleExit, onChangeVariant, onRemove, onChangeRoute, onBlurRoute }: FlowCardProps) {
  const meta = pageMeta(instance.type);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: instance.id });

  const style = {
    transform:  CSS.Transform.toString(transform),
    transition,
    opacity:    isDragging ? 0.5 : 1,
  };

  if (!meta) return null;

  const exits = meta.exits ?? [];

  const takenRoutes = new Set(inFlow.filter(p => p.id !== instance.id).map(p => p.route));
  const isDuplicate = takenRoutes.has(instance.route);

  // Other instances in the flow — pickable as exit destinations. Each gets a
  // display label that combines the page-type label and the instance id (so
  // "Video · video-intro" reads better than just "Video").
  const otherInstances = inFlow
    .filter((i) => i.id !== instance.id)
    .map((i) => {
      const m = pageMeta(i.type);
      return m ? {
        id: i.id,
        type: i.type,
        label: i.id === i.type ? m.label : `${m.label} · ${i.id}`,
        route: i.route,
      } : null;
    })
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  /** Resolve the default destination instance id for an exit, given its rule. */
  const resolveDefault = (rule: 'next-in-flow' | 'first-in-flow' | undefined): string | null => {
    if (rule === 'first-in-flow') return inFlow[0]?.id ?? null;
    return inFlow[index + 1]?.id ?? null;
  };

  // Title: bare type label for a singleton instance, "Type · id" for duplicates.
  const title = instance.id === instance.type ? meta.label : `${meta.label} · ${instance.id}`;

  return (
    <li ref={setNodeRef} style={style} className={`flow-card${isDragging ? ' is-dragging' : ''}`}>
      <div className="flow-card__handle" {...attributes} {...listeners} aria-label="Drag handle">⋮⋮</div>
      <div className="flow-card__index">{index + 1}</div>
      <div className="flow-card__body">
        <div className="flow-card__row">
          <strong>{title}</strong>
        </div>
        <div className="page-card__hint">{meta.hint}</div>
        <div className="flow-card__route">
          <label
            className="flow-card__route-label"
            htmlFor={`route-${instance.id}`}
          >
            Route
          </label>
          <input
            id={`route-${instance.id}`}
            className={`flow-card__route-input${isDuplicate ? ' flow-card__route-input--error' : ''}`}
            type="text"
            value={instance.route}
            onChange={e => onChangeRoute(instance.id, e.target.value)}
            onBlur={e => onBlurRoute(instance.id, e.target.value)}
            title={isDuplicate ? `Route "${instance.route}" is already used by another page` : undefined}
          />
        </div>
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
            const variant = buttonVariants[choiceKey] ?? exit.defaultVariant ?? 'primary';

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

                <div className="flow-card__exit-controls">
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
                <select
                  className="flow-card__variant"
                  value={variant}
                  onChange={(e) => onChangeVariant(instance.id, exit.key, e.target.value as ButtonVariant)}
                  disabled={!enabled}
                  aria-label={`Button variant for ${title} ${exit.label}`}
                >
                  {BUTTON_VARIANTS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                </select>
                </div>
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
  const ids = c.pages.map((p) => p.id);
  if (c.game === 'none' && c.pages.some((p) => p.type === 'game')) {
    return '`game` page requires an engine. Pick an engine or remove the game page.';
  }
  for (const page of c.pages) {
    const match = page.id.match(/^([a-z]+)-(\d+)$/);
    if (match && !ids.includes(match[1])) {
      return `\`${page.id}\` is a duplicate instance and requires a \`${match[1]}\` page first.`;
    }
    if (match && match[1] !== 'video') {
      return `Only video supports duplicate instances. Remove \`${page.id}\`.`;
    }
  }
  return null;
};
