import { useEffect, useRef, useState } from 'react';
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
  pagesForStack, pageMeta, PAGE_SETTINGS_SCHEMA, nextInstanceId, BUTTON_VARIANTS, defaultRouteForType, deriveRegMode,
  type ScaffoldConfig, type PageSettings, type StepProps, type PageInstance, type ButtonVariant,
} from '../shared/config.ts';
import PageSettingsCard from './PageSettingsCard.tsx';
import PreviewPane from './PreviewPane.tsx';

export default function StepPages({ config, setConfig }: StepProps) {
  const inFlow      = config.pages;
  const availablePages = pagesForStack(config.stack);

  // `regMode` is now derived from where Register sits relative to Result in
  // the flow — no separate UI control. Sync the config field whenever the
  // derived value drifts (page added / removed / reordered) so downstream
  // consumers (Build summary, scaffold submission) read a fresh value.
  useEffect(() => {
    const derived = deriveRegMode(inFlow);
    if (derived !== config.regMode) {
      setConfig({ ...config, regMode: derived });
    }
  }, [inFlow, config, setConfig]);

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
    const route = availablePages.find((page) => page.id === type)?.route ?? defaultRouteForType(type);

    // Insert at a position that matches the canonical flow order
    // (ALL_PAGES ordering), so adding e.g. `tutorial` to `[landing, game]`
    // lands at index 1 instead of being appended after game. The user can
    // still drag it elsewhere — this is just a better default than "end".
    const canonical = (t: string) => availablePages.findIndex((p) => p.id === t);
    const newCanonical = canonical(type);

    let insertAt = inFlow.length;
    if (newCanonical >= 0) {
      const idx = inFlow.findIndex((p) => {
        const c = canonical(p.type);
        return c >= 0 && c > newCanonical;
      });
      if (idx >= 0) insertAt = idx;
    }

    const next = [...inFlow];
    next.splice(insertAt, 0, { id, type, route });
    setConfig({ ...config, pages: next });
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
          Drag the cards to reorder. Click <em>Settings</em> on a card to tweak its options inline.
        </p>
      </div>

      <div className="pages-layout">
      <section className="pages-col">
        {inFlow.length === 0 && (
          <p className="step__hint">No pages yet — start by adding one below.</p>
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
                  pageSettings={config.pageSettings}
                  setPageSettings={(next) => setConfig({ ...config, pageSettings: next })}
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

        <AddPageMenu
          availablePages={availablePages}
          typeCounts={typeCounts}
          onAdd={addInstance}
        />
      </section>

      <div className="pages-layout__preview">
        <PreviewPane config={config} />
      </div>
      </div>

      {/* Menu visibility lives in CAPE (settings.menu.show*). The CLI hard-
          gates items whose target route wasn't generated, so we don't ship a
          duplicate UI here. */}
    </>
  );
}

// ─── Add Page menu ───────────────────────────────────────────────────────────

interface AddPageMenuProps {
  availablePages: ReturnType<typeof pagesForStack>;
  typeCounts:     Record<string, number>;
  onAdd:          (type: string) => void;
}

/**
 * Bottom-of-flow "+ Add page" button with a popover of unused page types.
 * Replaces the old left-hand Available column — saves vertical space and
 * removes the duplicate-add foot-gun (already-added pages don't surface here).
 */
function AddPageMenu({ availablePages, typeCounts, onAdd }: AddPageMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Click-outside to close. Bound once while open.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Singleton page types disappear once added; nothing in ALL_PAGES allows
  // multiple instances at the picker level. (Duplicate "video" instances are
  // a CLI-only construct — there's no `video` entry in ALL_PAGES.)
  const addable = availablePages.filter((p) => (typeCounts[p.id] ?? 0) === 0);
  const allAdded = addable.length === 0;

  return (
    <div className="add-page" ref={wrapRef}>
      <button
        type="button"
        className="add-page__trigger"
        onClick={() => setOpen((v) => !v)}
        disabled={allAdded}
        title={allAdded ? 'Every page type is already in the flow.' : 'Add a page to the flow'}
      >
        <span className="add-page__plus" aria-hidden>+</span>
        <span>{allAdded ? 'All pages added' : 'Add page'}</span>
      </button>

      {open && !allAdded && (
        <div className="add-page__menu" role="menu">
          {addable.map((p) => (
            <button
              key={p.id}
              type="button"
              role="menuitem"
              className="add-page__item"
              onClick={() => { onAdd(p.id); setOpen(false); }}
            >
              <strong>{p.label}</strong>
              <span className="add-page__hint">{p.hint}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Flow card ──────────────────────────────────────────────────────────────

interface FlowCardProps {
  instance:         PageInstance;
  index:            number;
  isLast:           boolean;
  inFlow:           PageInstance[];
  flowExits:        Record<string, string>;
  enabledExits:     Record<string, boolean>;
  buttonVariants:   Record<string, ButtonVariant>;
  pageSettings:     PageSettings;
  setPageSettings:  (next: PageSettings) => void;
  onChangeExit:     (pageId: string, exitKey: string, target: string) => void;
  onToggleExit:     (pageId: string, exitKey: string, enabled: boolean) => void;
  onChangeVariant:  (pageId: string, exitKey: string, variant: ButtonVariant) => void;
  onRemove:         () => void;
  onChangeRoute:    (instanceId: string, raw: string) => void;
  onBlurRoute:      (instanceId: string, raw: string) => void;
}

function FlowCard({
  instance, index, isLast, inFlow, flowExits, enabledExits, buttonVariants,
  pageSettings, setPageSettings,
  onChangeExit, onToggleExit, onChangeVariant, onRemove, onChangeRoute, onBlurRoute,
}: FlowCardProps) {
  const meta = pageMeta(instance.type);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: instance.id });
  // Settings disclosure is per-card local state. Survives reorder because
  // dnd-kit keeps the React element identity (key=instance.id).
  const [expanded, setExpanded] = useState(false);

  const style = {
    transform:  CSS.Transform.toString(transform),
    transition,
    opacity:    isDragging ? 0.5 : 1,
  };

  if (!meta) return null;

  const exits = meta.exits ?? [];
  const hasSettings = Boolean(PAGE_SETTINGS_SCHEMA[instance.type]?.length);

  const takenRoutes = new Set(inFlow.filter(p => p.id !== instance.id).map(p => p.route));
  const isDuplicate = takenRoutes.has(instance.route);

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

  const resolveDefault = (rule: 'next-in-flow' | 'first-in-flow' | undefined): string | null => {
    if (rule === 'first-in-flow') return inFlow[0]?.id ?? null;
    return inFlow[index + 1]?.id ?? null;
  };

  const title = instance.id === instance.type ? meta.label : `${meta.label} · ${instance.id}`;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flow-card${isDragging ? ' is-dragging' : ''}${expanded ? ' is-expanded' : ''}`}
    >
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

      <div className="flow-card__actions">
        {hasSettings && (
          <button
            type="button"
            className={`flow-card__settings-btn${expanded ? ' is-active' : ''}`}
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls={`settings-${instance.id}`}
            title={expanded ? 'Hide settings' : 'Show settings'}
          >
            <span aria-hidden>⚙</span>
            <span className="flow-card__settings-btn-label">Settings</span>
            <span className={`flow-card__chev${expanded ? ' is-open' : ''}`} aria-hidden>▾</span>
          </button>
        )}
        <button
          type="button"
          className="flow-card__remove"
          onClick={onRemove}
          aria-label={`Remove ${title}`}
        >
          ×
        </button>
      </div>

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

      {hasSettings && expanded && (
        <div
          className="flow-card__settings"
          id={`settings-${instance.id}`}
          role="region"
          aria-label={`${title} settings`}
        >
          <PageSettingsCard
            pageId={instance.id}
            schemaType={instance.type}
            pageLabel={title}
            settings={pageSettings}
            setSettings={setPageSettings}
          />
        </div>
      )}

      {!isLast && <div className="flow-card__arrow" aria-hidden>↓</div>}
    </li>
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
