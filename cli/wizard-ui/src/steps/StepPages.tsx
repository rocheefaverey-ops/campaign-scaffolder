import { Fragment, useEffect, useRef, useState } from 'react';
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
  pagesForStack, pageMeta, PAGE_SETTINGS_SCHEMA, nextInstanceId, defaultRouteForType, deriveRegMode,
  FLOW_RULE_OPTIONS, FLOW_RULES_BY_PAGE, defaultFlowRuleForType, defaultBlocksForPage,
  groupPagesByPhase, PHASE_LABELS, pageIcon,
  type BlockSetting, type ScaffoldConfig, type StepProps, type PageInstance, type PageFlowRule, type FlowRuleMode,
} from '../shared/config.ts';
import PageSettingsCard from './PageSettingsCard.tsx';
import PreviewPane from './PreviewPane.tsx';

export default function StepPages({ config, setConfig }: StepProps) {
  const inFlow      = config.pages;
  const availablePages = pagesForStack(config.stack);

  // Which page (if any) is open in the full-width focus editor. Lifted to the
  // step so the editor can replace the flow list and offer Prev/Next nav.
  const [focusId, setFocusId] = useState<string | null>(null);
  const focusIdx = focusId ? inFlow.findIndex((p) => p.id === focusId) : -1;
  const focusInstance = focusIdx >= 0 ? inFlow[focusIdx] : null;
  const entryId = resolveEntryId(config);
  const warnings = flowWarnings(config);

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

  useEffect(() => {
    const migrated = migrateLegacyResultVoucherCta(config);
    if (migrated) setConfig(migrated);
  }, [config, setConfig]);

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

  const moveInstance = (id: string, direction: -1 | 1) => {
    const oldIdx = inFlow.findIndex(i => i.id === id);
    const newIdx = oldIdx + direction;
    if (oldIdx < 0 || newIdx < 0 || newIdx >= inFlow.length) return;
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
    setConfig({
      ...config,
      pages: next,
      pageBlocks: {
        ...(config.pageBlocks ?? {}),
        [id]: defaultBlocksForPage(type),
      },
      flowRules: {
        ...(config.flowRules ?? {}),
        [id]: defaultFlowRuleForType(type),
      },
    });
  };
  const removeInstance = (id: string) => {
    const nextRules = { ...(config.flowRules ?? {}) };
    const nextPageBlocks = { ...(config.pageBlocks ?? {}) };
    const nextPageSettings = { ...(config.pageSettings ?? {}) };
    delete nextRules[id];
    delete nextPageBlocks[id];
    delete nextPageSettings[id];

    // Prune flow wiring keyed `${id}.${exitKey}`, and any other page's exit
    // whose *target* was the removed page — otherwise the wiring goes stale and
    // (worse) re-adding a page with the same id silently resurrects old exits,
    // variants, and settings.
    const isOwnKey = (key: string) => key.split('.')[0] === id;
    const nextExits = Object.fromEntries(
      Object.entries(config.flowExits ?? {}).filter(([k, target]) => !isOwnKey(k) && target !== id),
    );
    const nextEnabled = Object.fromEntries(
      Object.entries(config.flowEnabledExits ?? {}).filter(([k]) => !isOwnKey(k)),
    );
    const nextVariants = Object.fromEntries(
      Object.entries(config.flowButtonVariants ?? {}).filter(([k]) => !isOwnKey(k)),
    );

    setConfig({
      ...config,
      pages: inFlow.filter(i => i.id !== id),
      flowEntry: config.flowEntry === id ? undefined : config.flowEntry,
      flowRules: nextRules,
      pageBlocks: nextPageBlocks,
      pageSettings: nextPageSettings,
      flowExits: nextExits,
      flowEnabledExits: nextEnabled,
      flowButtonVariants: nextVariants,
    });
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
          {focusInstance
            ? 'Editing one page. Adjust its blocks, behavior and content, then step to the next page.'
            : <>Build the campaign journey in order. Use <em>Edit page</em> for content and button destinations; route slugs live under Advanced.</>}
        </p>
      </div>

      <div className="pages-layout">
      <section className="pages-col">
        {focusInstance ? (
          <PageFocusEditor
            instance={focusInstance}
            index={focusIdx}
            total={inFlow.length}
            config={config}
            setConfig={setConfig}
            onClose={() => setFocusId(null)}
            onNavigate={(dir) => {
              const next = inFlow[focusIdx + dir];
              if (next) setFocusId(next.id);
            }}
          />
        ) : (
        <>
        {inFlow.length === 0 && (
          <EmptyFlow onAdd={() => addInstance('landing')} />
        )}
        {inFlow.length > 0 && (
          <FlowToolbar config={config} entryId={entryId} warnings={warnings} />
        )}
        {warnings.length > 0 && (
          <div className="flow-warnings" role="status">
            {warnings.map((warning) => <span key={warning}>{warning}</span>)}
          </div>
        )}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={inFlow.map(i => i.id)} strategy={verticalListSortingStrategy}>
            <ol className="flow-list">
              {groupPagesByPhase(inFlow).map((group) => (
                <Fragment key={group.phase}>
                  <li className={`flow-phase flow-phase--${group.phase}`}>
                    <span className="flow-phase__label">{PHASE_LABELS[group.phase]}</span>
                    <span className="flow-phase__rule" aria-hidden />
                  </li>
                  {group.pages.map((instance) => {
                    const i = inFlow.findIndex(p => p.id === instance.id);
                    return (
                      <FlowCard
                        key={instance.id}
                        instance={instance}
                        index={i}
                        isLast={i === inFlow.length - 1}
                        isEntry={entryId === instance.id}
                        inFlow={inFlow}
                        config={config}
                        onFocus={() => setFocusId(instance.id)}
                        onMove={(direction) => moveInstance(instance.id, direction)}
                        onSetEntry={() => setConfig({ ...config, flowEntry: instance.id === inFlow[0]?.id ? undefined : instance.id })}
                        flowRules={config.flowRules ?? {}}
                        onChangeRule={(pageId, rule) => {
                          setConfig({
                            ...config,
                            flowRules: {
                              ...(config.flowRules ?? {}),
                              [pageId]: rule,
                            },
                          });
                        }}
                        onRemove={() => removeInstance(instance.id)}
                        onChangeRoute={onChangeRoute}
                        onBlurRoute={onBlurRoute}
                      />
                    );
                  })}
                </Fragment>
              ))}
            </ol>
          </SortableContext>
        </DndContext>

        <AddPageMenu
          availablePages={availablePages}
          typeCounts={typeCounts}
          onAdd={addInstance}
        />
        </>
        )}
      </section>

      <div className="pages-layout__preview">
        <PreviewPane
          config={config}
          activeId={focusId ?? undefined}
          onSelectPage={(id) => setFocusId(id)}
        />
      </div>
      </div>

      {/* Menu visibility lives in CAPE (settings.menu.show*). The CLI hard-
          gates items whose target route wasn't generated, so we don't ship a
          duplicate UI here. */}
    </>
  );
}

// ─── Add Page menu ───────────────────────────────────────────────────────────

function EmptyFlow({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flow-empty">
      <span className="flow-empty__icon" aria-hidden>+</span>
      <strong>No campaign journey yet</strong>
      <p>Start with a landing page, then add tutorial, game, result and reward pages in the order visitors should experience them.</p>
      <button type="button" className="btn btn--secondary" onClick={onAdd}>Add landing page</button>
      <span className="flow-empty__or">or use Add page below</span>
    </div>
  );
}

function FlowToolbar({ config, entryId, warnings }: { config: ScaffoldConfig; entryId: string; warnings: string[] }) {
  const regMode = deriveRegMode(config.pages);
  const entry = config.pages.find(p => p.id === entryId);
  const entryLabel = entry ? pageTitle(entry) : 'first page';
  const hasMenu = config.pages.some(p => p.type === 'menu');

  return (
    <div className="flow-toolbar" aria-label="Campaign journey summary">
      <span className="flow-toolbar__stat">
        <strong>{config.pages.length}</strong> pages
      </span>
      <span className="flow-toolbar__stat">
        Entry <code>{entryLabel}</code>
      </span>
      {regMode !== 'none' && (
        <span className={`flow-toolbar__chip flow-toolbar__chip--${regMode}`}>
          Register {regMode === 'gate' ? 'before result' : 'after result'}
        </span>
      )}
      {hasMenu && <span className="flow-toolbar__chip">Menu enabled</span>}
      {warnings.length > 0 && (
        <span className="flow-toolbar__chip flow-toolbar__chip--warn">{warnings.length} warning{warnings.length === 1 ? '' : 's'}</span>
      )}
    </div>
  );
}

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
  const groupedAddable = groupPagesByPhase(addable.map(p => ({ id: p.id, type: p.id, route: p.route })));
  const allAdded = addable.length === 0;

  return (
    <div className={`add-page${open ? ' is-open' : ''}`} ref={wrapRef}>
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
          {groupedAddable.map((group) => (
            <div key={group.phase} className="add-page__group">
              <span className="add-page__group-label">{PHASE_LABELS[group.phase]}</span>
              {group.pages.map((page) => {
                const p = availablePages.find(item => item.id === page.id);
                if (!p) return null;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="menuitem"
                    className="add-page__item"
                    onClick={() => { onAdd(p.id); setOpen(false); }}
                  >
                    <span className="add-page__item-icon" aria-hidden>{pageIcon(p.id)}</span>
                    <span className="add-page__item-copy">
                      <strong>{p.label}</strong>
                      <span className="add-page__hint">{p.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page focus editor ───────────────────────────────────────────────────────

interface PageFocusEditorProps {
  instance:  PageInstance;
  index:     number;
  total:     number;
  config:    ScaffoldConfig;
  setConfig: (next: ScaffoldConfig) => void;
  onClose:   () => void;
  onNavigate: (dir: -1 | 1) => void;
}

/**
 * Full-width, single-page editor. Replaces the flow list while open so one
 * page's options + blocks get the whole column, with Prev/Next to walk the
 * flow page by page instead of scrolling one giant stack.
 */
function PageFocusEditor({ instance, index, total, config, setConfig, onClose, onNavigate }: PageFocusEditorProps) {
  const meta = pageMeta(instance.type);
  const title = meta ? (instance.id === instance.type ? meta.label : `${meta.label} · ${instance.id}`) : instance.id;

  return (
    <div className="page-focus">
      <header className="page-focus__bar">
        <button type="button" className="page-focus__back" onClick={onClose}>
          ‹ Back to flow
        </button>
        <span className="page-focus__count">Page {index + 1} of {total}</span>
        <div className="page-focus__nav">
          <button type="button" onClick={() => onNavigate(-1)} disabled={index <= 0} aria-label="Previous page">
            ‹ Prev
          </button>
          <button type="button" onClick={() => onNavigate(1)} disabled={index >= total - 1} aria-label="Next page">
            Next ›
          </button>
        </div>
      </header>

      <div className="page-focus__heading">
        <strong>{title}</strong>
        {meta?.hint && <span>{meta.hint}</span>}
      </div>

      <PageSettingsCard
        pageId={instance.id}
        schemaType={instance.type}
        pageLabel={title}
        config={config}
        setConfig={setConfig}
      />
    </div>
  );
}

// ─── Flow card ──────────────────────────────────────────────────────────────

interface FlowCardProps {
  instance:         PageInstance;
  index:            number;
  isLast:           boolean;
  isEntry:          boolean;
  inFlow:           PageInstance[];
  config:           ScaffoldConfig;
  onFocus:          () => void;
  onMove:           (direction: -1 | 1) => void;
  onSetEntry:       () => void;
  flowRules:        Record<string, PageFlowRule>;
  onChangeRule:     (pageId: string, rule: PageFlowRule) => void;
  onRemove:         () => void;
  onChangeRoute:    (instanceId: string, raw: string) => void;
  onBlurRoute:      (instanceId: string, raw: string) => void;
}

function FlowCard({
  instance, index, isLast, isEntry, inFlow, config,
  onFocus, onMove, onSetEntry, flowRules, onChangeRule,
  onRemove, onChangeRoute, onBlurRoute,
}: FlowCardProps) {
  const meta = pageMeta(instance.type);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [behaviorOpen, setBehaviorOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: instance.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (!meta) return null;

  const defaultBlocks = defaultBlocksForPage(instance.type);
  const hasSettings = Boolean(
    PAGE_SETTINGS_SCHEMA[instance.type]?.length ||
    Object.keys(defaultBlocks.blocks).length,
  );

  const takenRoutes = new Set(inFlow.filter(p => p.id !== instance.id).map(p => p.route));
  const isDuplicate = takenRoutes.has(instance.route);
  const otherInstances = inFlow
    .filter((i) => i.id !== instance.id)
    .map((i) => {
      const m = pageMeta(i.type);
      return m ? {
        id: i.id,
        type: i.type,
        label: i.id === i.type ? m.label : `${m.label} - ${i.id}`,
        route: i.route,
      } : null;
    })
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  const title = pageTitle(instance);
  const currentRule = flowRules[instance.id] ?? defaultFlowRuleForType(instance.type);
  const supportedRuleModes = FLOW_RULES_BY_PAGE[instance.type] ?? ['always'];
  const ruleOptions = FLOW_RULE_OPTIONS.filter((option) => supportedRuleModes.includes(option.value));
  const selectedRule = FLOW_RULE_OPTIONS.find((option) => option.value === currentRule.mode);
  const defaultSkipId = inFlow[index + 1]?.id ?? inFlow[0]?.id ?? '';
  const skipChoice = currentRule.skipTo ?? '';
  const connections = pageConnections(config, instance, index);
  const hasCustomRule = currentRule.mode !== 'always';

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flow-card${isDragging ? ' is-dragging' : ''}${isEntry ? ' is-entry' : ''}`}
    >
      <div className="flow-card__rail">
        <div className="flow-card__handle" {...attributes} {...listeners} aria-label="Drag handle">::</div>
        <div className="flow-card__index">{index + 1}</div>
        <div className="flow-card__nudge">
          <button type="button" className="flow-card__nudge-btn" onClick={() => onMove(-1)} disabled={index <= 0} aria-label={`Move ${title} earlier`}>^</button>
          <button type="button" className="flow-card__nudge-btn" onClick={() => onMove(1)} disabled={isLast} aria-label={`Move ${title} later`}>v</button>
        </div>
      </div>

      <div className="flow-card__body">
        <div className="flow-card__row">
          <span className="flow-card__type-icon" aria-hidden>{pageIcon(instance.type)}</span>
          <strong>{title}</strong>
          {isEntry && <span className="flow-card__pill flow-card__pill--entry">Entry</span>}
          {isDuplicate && <span className="flow-card__pill flow-card__pill--warn">Duplicate route</span>}
        </div>
        <div className="page-card__hint">{meta.hint}</div>
        <span className="flow-card__route">{instance.route}</span>
        <ExitSummary connections={connections} />
      </div>

      <div className="flow-card__actions">
        {!isEntry && (
          <button type="button" className="flow-card__action-btn" onClick={onSetEntry} title="Use this page as the campaign entry route">
            <span aria-hidden>*</span>
            <span className="flow-card__action-label">Start here</span>
          </button>
        )}
        {hasSettings && (
          <button type="button" className="flow-card__settings-btn" onClick={onFocus} title="Edit this page's options and blocks">
            <span aria-hidden>...</span>
            <span className="flow-card__settings-btn-label">Edit page</span>
            <span className="flow-card__chev" aria-hidden>&gt;</span>
          </button>
        )}
        <button type="button" className="flow-card__remove" onClick={onRemove} aria-label={`Remove ${title}`}>x</button>
      </div>

      {ruleOptions.length > 1 && otherInstances.length > 0 && (
        <div className="flow-card__behavior-wrap">
          <button
            type="button"
            className={`flow-card__behavior-trigger${hasCustomRule ? ' is-custom' : ''}`}
            onClick={() => setBehaviorOpen(v => !v)}
            aria-expanded={behaviorOpen}
          >
            <span className="flow-card__behavior-trigger-label">When to show</span>
            <span className="flow-card__behavior-trigger-value">{selectedRule?.label ?? 'Always show'}</span>
          </button>
          {behaviorOpen && (
            <div className="flow-card__behavior">
              <div className="flow-card__behavior-copy">
                <strong>Page behavior</strong>
                <span>{selectedRule?.hint ?? 'Choose when this page should appear.'}</span>
              </div>
              <div className="flow-card__behavior-controls">
                <label className="flow-card__behavior-field">
                  <span>When to show</span>
                  <select
                    value={currentRule.mode}
                    onChange={(e) => {
                      const mode = e.target.value as FlowRuleMode;
                      onChangeRule(instance.id, {
                        ...currentRule,
                        mode,
                        skipTo: mode === 'always' ? undefined : currentRule.skipTo,
                      });
                    }}
                    aria-label={`Behavior for ${title}`}
                  >
                    {ruleOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                {currentRule.mode !== 'always' && (
                  <label className="flow-card__behavior-field">
                    <span>If skipped, go to</span>
                    <select
                      value={skipChoice}
                      onChange={(e) => {
                        onChangeRule(instance.id, {
                          ...currentRule,
                          skipTo: e.target.value || undefined,
                        });
                      }}
                      aria-label={`Skip destination for ${title}`}
                    >
                      <option value="">{`Default - ${otherInstances.find(o => o.id === defaultSkipId)?.label ?? 'next page'}`}</option>
                      {otherInstances.map((o) => (
                        <option key={o.id} value={o.id}>{o.label}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flow-card__advanced">
        <button
          type="button"
          className={`flow-card__behavior-trigger${advancedOpen || isDuplicate ? ' is-custom' : ''}`}
          onClick={() => setAdvancedOpen(v => !v)}
          aria-expanded={advancedOpen}
        >
          <span className="flow-card__behavior-trigger-label">Advanced</span>
          {(advancedOpen || isDuplicate) && <span className="flow-card__behavior-trigger-value">{instance.route}</span>}
        </button>
        {advancedOpen && (
          <div className="flow-card__advanced-panel">
            <label className="flow-card__route-edit">
              <span>Route slug</span>
              <input
                id={`route-${instance.id}`}
                className={`flow-card__route-input${isDuplicate ? ' flow-card__route-input--error' : ''}`}
                type="text"
                value={instance.route}
                onChange={e => onChangeRoute(instance.id, e.target.value)}
                onBlur={e => onBlurRoute(instance.id, e.target.value)}
                title={isDuplicate ? `Route "${instance.route}" is already used by another page` : undefined}
              />
            </label>
            {isDuplicate && <span className="flow-card__advanced-warning">This route is already used by another page.</span>}
          </div>
        )}
      </div>

      {!isLast && <div className="flow-card__arrow" aria-hidden>v</div>}
    </li>
  );
}

interface PageConnection {
  key: string;
  targetId: string | null;
  targetLabel: string;
  status: 'ok' | 'dead' | 'end' | 'disabled';
}

function ExitSummary({ connections }: { connections: PageConnection[] }) {
  if (connections.length === 0) return null;
  return (
    <ul className="flow-card__exit-summary" aria-label="Page navigation">
      {connections.map((connection) => (
        <li key={`${connection.key}-${connection.targetLabel}`} className={`flow-card__exit-chip flow-card__exit-chip--${connection.status}`}>
          <span className="flow-card__exit-chip-key">{connection.key}</span>
          <span className="flow-card__exit-chip-arrow" aria-hidden>-&gt;</span>
          <span className="flow-card__exit-chip-target">{connection.targetLabel}</span>
        </li>
      ))}
    </ul>
  );
}

function pageConnections(config: ScaffoldConfig, instance: PageInstance, index: number): PageConnection[] {
  const blocks = config.pageBlocks?.[instance.id]?.blocks ?? defaultBlocksForPage(instance.type).blocks;
  const pages = config.pages;
  const connections: PageConnection[] = [];
  const add = (key: string, targetId: string | null | undefined, disabled = false) => {
    if (disabled) {
      connections.push({ key, targetId: null, targetLabel: 'hidden', status: 'disabled' });
      return;
    }
    const resolved = targetId || pages[index + 1]?.id || null;
    if (!resolved) {
      connections.push({ key, targetId: null, targetLabel: 'end', status: 'end' });
      return;
    }
    const target = pages.find(p => p.id === resolved);
    connections.push({
      key,
      targetId: resolved,
      targetLabel: target ? pageTitle(target) : `${resolved} missing`,
      status: target ? 'ok' : 'dead',
    });
  };

  const cta = blocks['cta-group'];
  if (cta?.enabled) {
    const buttons = Array.isArray(cta.settings?.buttons) ? cta.settings.buttons : [];
    buttons.forEach((button, i) => {
      const exit = objectSetting(button as BlockSetting, 'exit');
      add(i === 0 ? 'primary' : `button ${i + 1}`, typeof exit === 'string' ? exit : null);
    });
    return connections;
  }

  const nav = blocks['nav-controls'];
  if (nav?.enabled) {
    const nextExit = nav.settings?.nextExit;
    add('continue', typeof nextExit === 'string' ? nextExit : null);
    return connections;
  }

  const skip = blocks['skip-control'];
  if (skip?.enabled) {
    const exit = skip.settings?.exit;
    add('skip', typeof exit === 'string' ? exit : null);
  }

  const player = blocks['video-player'];
  if (player?.enabled && player.settings?.onEnd === 'auto-advance') {
    const exit = player.settings?.exit;
    add('video end', typeof exit === 'string' ? exit : null);
  }

  if (connections.length === 0 && instance.type !== 'menu') add('next', null);
  return connections;
}

function objectSetting(value: BlockSetting, key: string): BlockSetting | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return (value as Record<string, BlockSetting>)[key];
}

function pageTitle(page: PageInstance): string {
  const meta = pageMeta(page.type);
  if (!meta) return page.id;
  return page.id === page.type ? meta.label : `${meta.label} - ${page.id}`;
}

function resolveEntryId(config: ScaffoldConfig): string {
  if (config.flowEntry && config.pages.some(p => p.id === config.flowEntry)) return config.flowEntry;
  return config.pages[0]?.id ?? '';
}

function flowWarnings(config: ScaffoldConfig): string[] {
  const warnings = new Set<string>();
  const routes = new Map<string, string>();
  for (const page of config.pages) {
    const existing = routes.get(page.route);
    if (existing) warnings.add(`${page.route} is used by both ${existing} and ${page.id}.`);
    else routes.set(page.route, page.id);
  }
  for (const [index, page] of config.pages.entries()) {
    for (const connection of pageConnections(config, page, index)) {
      if (connection.status === 'dead') warnings.add(`${pageTitle(page)} points to missing page ${connection.targetId}.`);
    }
  }
  const hasTutorial = config.pages.some(p => p.type === 'tutorial');
  if (menuHasItem(config, 'howToPlay') && !hasTutorial) warnings.add('Menu includes How to play, but Tutorial is not in the flow.');
  return [...warnings];
}

function menuHasItem(config: ScaffoldConfig, itemId: string): boolean {
  const menuPage = config.pages.find(p => p.type === 'menu');
  if (!menuPage) return false;
  const menuBlock = config.pageBlocks?.[menuPage.id]?.blocks?.['menu-item-list'];
  if (!menuBlock || !menuBlock.enabled) return false;
  const items = menuBlock.settings?.items;
  return Array.isArray(items) ? items.includes(itemId) : itemId === 'howToPlay';
}

function migrateLegacyResultVoucherCta(config: ScaffoldConfig): ScaffoldConfig | null {
  if (config.pages.some(p => p.type === 'voucher')) return null;
  const resultPage = config.pages.find(p => p.type === 'result');
  if (!resultPage) return null;
  const pageBlocks = config.pageBlocks?.[resultPage.id];
  const cta = pageBlocks?.blocks?.['cta-group'];
  const buttons = cta?.settings?.buttons;
  if (!cta || !Array.isArray(buttons) || buttons.length !== 2) return null;
  const first = buttons[0];
  const second = buttons[1];
  if (objectSetting(first as BlockSetting, 'exit') !== 'voucher') return null;
  if (objectSetting(second as BlockSetting, 'exit') !== 'game') return null;

  return {
    ...config,
    pageBlocks: {
      ...(config.pageBlocks ?? {}),
      [resultPage.id]: {
        ...pageBlocks,
        blocks: {
          ...pageBlocks.blocks,
          'cta-group': {
            ...cta,
            settings: {
              ...cta.settings,
              buttons: [{ variant: 'primary', exit: 'game' }],
            },
          },
        },
      },
    },
  };
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
