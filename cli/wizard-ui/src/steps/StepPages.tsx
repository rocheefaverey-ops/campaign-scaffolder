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
  pagesForStack, pageMeta, PAGE_SETTINGS_SCHEMA, nextInstanceId, BUTTON_VARIANTS, defaultRouteForType, deriveRegMode,
  FLOW_RULE_OPTIONS, FLOW_RULES_BY_PAGE, defaultFlowRuleForType,
  PHASE_LABELS, phaseForType, pageIcon,
  type ScaffoldConfig, type PageSettings, type StepProps, type PageInstance, type ButtonVariant, type PageFlowRule, type FlowRuleMode,
  type Phase,
} from '../shared/config.ts';
import PageSettingsCard from './PageSettingsCard.tsx';
import PreviewPane from './PreviewPane.tsx';

/** Position-aware phase resolver — pages around `game` get bucketed by index, not by canonical type. */
function phaseForInstance(pages: PageInstance[], idx: number): Phase {
  const gameIdx = pages.findIndex(p => p.type === 'game');
  const page = pages[idx];
  if (gameIdx >= 0) {
    if (page.type === 'game') return 'game';
    if (idx < gameIdx) return 'before';
    return 'after';
  }
  return phaseForType(page.type);
}

function resolveEntryId(pages: PageInstance[], flowEntry?: string): string | undefined {
  if (flowEntry && pages.some(p => p.id === flowEntry)) return flowEntry;
  return pages[0]?.id;
}

export default function StepPages({ config, setConfig }: StepProps) {
  const inFlow      = config.pages;
  const availablePages = pagesForStack(config.stack);
  const entryId = resolveEntryId(inFlow, config.flowEntry);

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
    setConfig({
      ...config,
      pages: next,
      flowRules: {
        ...(config.flowRules ?? {}),
        [id]: defaultFlowRuleForType(type),
      },
    });
  };
  const removeInstance = (id: string) => {
    const nextRules = { ...(config.flowRules ?? {}) };
    delete nextRules[id];
    setConfig({ ...config, pages: inFlow.filter(i => i.id !== id), flowRules: nextRules });
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

  const moveInstance = (id: string, dir: -1 | 1) => {
    const idx = inFlow.findIndex(p => p.id === id);
    if (idx < 0) return;
    const next = idx + dir;
    if (next < 0 || next >= inFlow.length) return;
    setConfig({ ...config, pages: arrayMove(inFlow, idx, next) });
    // Restore focus to the same direction button on the moved card so
    // keyboard users can keep nudging it without re-hunting for the button.
    requestAnimationFrame(() => {
      const sel = `[data-flow-id="${window.CSS.escape(id)}"] [data-nudge="${dir === -1 ? 'up' : 'down'}"]`;
      const el = document.querySelector<HTMLButtonElement>(sel);
      el?.focus();
    });
  };

  const setEntry = (id: string) => {
    setConfig({ ...config, flowEntry: id === inFlow[0]?.id ? undefined : id });
  };

  const seedRecommendedFlow = () => {
    const starter: PageInstance[] = [
      { id: 'landing',  type: 'landing',  route: '/landing'  },
      { id: 'tutorial', type: 'tutorial', route: '/tutorial' },
      { id: 'game',     type: 'game',     route: '/gameplay' },
      { id: 'result',   type: 'result',   route: '/result'   },
    ];
    setConfig({
      ...config,
      pages: starter,
      flowRules: Object.fromEntries(starter.map(p => [p.id, defaultFlowRuleForType(p.type)])),
    });
  };

  const regModeDerived = deriveRegMode(inFlow);
  const dupRoutes = (() => {
    const seen = new Map<string, number>();
    for (const p of inFlow) seen.set(p.route, (seen.get(p.route) ?? 0) + 1);
    return new Set(Array.from(seen.entries()).filter(([, n]) => n > 1).map(([r]) => r));
  })();

  return (
    <>
      <div>
        <h2 className="step__title">Pages &amp; flow</h2>
        <p className="step__hint">
          Drag to reorder, or use the ↑/↓ buttons. Click a page's <em>Settings</em> for inline options.
        </p>
      </div>

      <div className="pages-layout">
      <section className="pages-col">
        <FlowToolbar
          pages={inFlow}
          entryId={entryId}
          regMode={regModeDerived}
          dupRoutes={dupRoutes}
        />

        {inFlow.length === 0 ? (
          <EmptyFlow onSeed={seedRecommendedFlow} />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext items={inFlow.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <ol className="flow-list">
                {inFlow.map((instance, i) => {
                  const phase = phaseForInstance(inFlow, i);
                  const prevPhase = i > 0 ? phaseForInstance(inFlow, i - 1) : null;
                  const showDivider = phase !== prevPhase;
                  return (
                    <Fragment key={instance.id}>
                      {showDivider && <PhaseDivider phase={phase} />}
                      <FlowCard
                        instance={instance}
                        index={i}
                        isLast={i === inFlow.length - 1}
                        isEntry={instance.id === entryId}
                        inFlow={inFlow}
                        flowExits={config.flowExits}
                        enabledExits={config.flowEnabledExits}
                        buttonVariants={config.flowButtonVariants}
                        pageSettings={config.pageSettings}
                        flowRules={config.flowRules ?? {}}
                        dupRoute={dupRoutes.has(instance.route)}
                        canMoveUp={i > 0}
                        canMoveDown={i < inFlow.length - 1}
                        setPageSettings={(next) => setConfig({ ...config, pageSettings: next })}
                        onChangeRule={(pageId, rule) => {
                          setConfig({
                            ...config,
                            flowRules: {
                              ...(config.flowRules ?? {}),
                              [pageId]: rule,
                            },
                          });
                        }}
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
                        onMoveUp={() => moveInstance(instance.id, -1)}
                        onMoveDown={() => moveInstance(instance.id, 1)}
                        onMakeEntry={() => setEntry(instance.id)}
                        onChangeRoute={onChangeRoute}
                        onBlurRoute={onBlurRoute}
                      />
                    </Fragment>
                  );
                })}
              </ol>
            </SortableContext>
          </DndContext>
        )}

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

// ─── Flow toolbar ───────────────────────────────────────────────────────────

function FlowToolbar({ pages, entryId, regMode, dupRoutes }: {
  pages: PageInstance[];
  entryId: string | undefined;
  regMode: 'none' | 'gate' | 'after';
  dupRoutes: Set<string>;
}) {
  const entry = pages.find(p => p.id === entryId);
  const skippable = pages.filter(p => p.id !== entryId).length;
  const issues: string[] = [];
  if (dupRoutes.size) issues.push(`${dupRoutes.size} duplicate route${dupRoutes.size === 1 ? '' : 's'}`);
  if (!pages.some(p => p.type === 'landing')) issues.push('no landing page');
  if (!pages.some(p => p.type === 'game')) issues.push('no gameplay page');

  return (
    <div className="flow-toolbar" role="region" aria-label="Flow summary">
      <span className="flow-toolbar__stat">
        <strong>{pages.length}</strong>
        <span>page{pages.length === 1 ? '' : 's'}</span>
      </span>
      {entry && (
        <span className="flow-toolbar__stat">
          <span className="flow-toolbar__icon" aria-hidden>★</span>
          <span>Entry</span>
          <code>{entry.route}</code>
        </span>
      )}
      {regMode !== 'none' && (
        <span className={`flow-toolbar__chip flow-toolbar__chip--${regMode}`}>
          Registration · {regMode === 'gate' ? 'before game' : 'after result'}
        </span>
      )}
      {skippable > 0 && (
        <span className="flow-toolbar__stat flow-toolbar__stat--muted">
          <span>{skippable} downstream</span>
        </span>
      )}
      {issues.length > 0 && (
        <span className="flow-toolbar__chip flow-toolbar__chip--warn" role="status">
          ⚠ {issues.join(' · ')}
        </span>
      )}
    </div>
  );
}

function PhaseDivider({ phase }: { phase: Phase }) {
  return (
    <li className={`flow-phase flow-phase--${phase}`} aria-hidden>
      <span className="flow-phase__label">{PHASE_LABELS[phase]}</span>
      <span className="flow-phase__rule" />
    </li>
  );
}

function EmptyFlow({ onSeed }: { onSeed: () => void }) {
  return (
    <div className="flow-empty">
      <div className="flow-empty__icon" aria-hidden>◌</div>
      <strong>No pages in the flow yet</strong>
      <p>Start with the recommended four-page flow (landing → tutorial → game → result) or build your own from scratch.</p>
      <button type="button" className="btn btn--primary" onClick={onSeed}>Start with recommended flow</button>
      <span className="flow-empty__or">or use <em>Add page</em> below</span>
    </div>
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
          {(['before', 'game', 'after'] as Phase[]).map(phase => {
            const items = addable.filter(p => phaseForType(p.id) === phase);
            if (items.length === 0) return null;
            return (
              <div key={phase} className="add-page__group">
                <div className="add-page__group-label">{PHASE_LABELS[phase]}</div>
                {items.map((p) => (
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
                ))}
              </div>
            );
          })}
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
  isEntry:          boolean;
  inFlow:           PageInstance[];
  flowExits:        Record<string, string>;
  enabledExits:     Record<string, boolean>;
  buttonVariants:   Record<string, ButtonVariant>;
  pageSettings:     PageSettings;
  flowRules:        Record<string, PageFlowRule>;
  dupRoute:         boolean;
  canMoveUp:        boolean;
  canMoveDown:      boolean;
  setPageSettings:  (next: PageSettings) => void;
  onChangeRule:     (pageId: string, rule: PageFlowRule) => void;
  onChangeExit:     (pageId: string, exitKey: string, target: string) => void;
  onToggleExit:     (pageId: string, exitKey: string, enabled: boolean) => void;
  onChangeVariant:  (pageId: string, exitKey: string, variant: ButtonVariant) => void;
  onRemove:         () => void;
  onMoveUp:         () => void;
  onMoveDown:       () => void;
  onMakeEntry:      () => void;
  onChangeRoute:    (instanceId: string, raw: string) => void;
  onBlurRoute:      (instanceId: string, raw: string) => void;
}

function FlowCard({
  instance, index, isLast, isEntry, inFlow, flowExits, enabledExits, buttonVariants,
  pageSettings, flowRules, dupRoute, canMoveUp, canMoveDown,
  setPageSettings, onChangeRule, onChangeExit, onToggleExit, onChangeVariant,
  onRemove, onMoveUp, onMoveDown, onMakeEntry, onChangeRoute, onBlurRoute,
}: FlowCardProps) {
  const meta = pageMeta(instance.type);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: instance.id });
  // Settings disclosure is per-card local state. Survives reorder because
  // dnd-kit keeps the React element identity (key=instance.id).
  const [expanded, setExpanded] = useState(false);
  // Behavior controls are collapsed by default; clicking the rule chip opens.
  // Initialized below from `ruleIsCustom` (we don't know it at this point yet).
  const [behaviorOpen, setBehaviorOpen] = useState(false);

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
  const currentRule = flowRules[instance.id] ?? defaultFlowRuleForType(instance.type);
  const supportedRuleModes = FLOW_RULES_BY_PAGE[instance.type] ?? ['always'];
  const ruleOptions = FLOW_RULE_OPTIONS.filter((option) => supportedRuleModes.includes(option.value));
  const selectedRule = FLOW_RULE_OPTIONS.find((option) => option.value === currentRule.mode);
  const defaultSkipId = inFlow[index + 1]?.id ?? inFlow[0]?.id ?? '';
  const skipChoice = currentRule.skipTo ?? '';
  const ruleIsCustom = currentRule.mode !== defaultFlowRuleForType(instance.type).mode || Boolean(currentRule.skipTo);
  // Auto-open behavior when rule becomes custom so the controls are visible
  // alongside the state. User can still close via the trigger.
  useEffect(() => {
    if (ruleIsCustom) setBehaviorOpen(true);
  }, [ruleIsCustom]);

  /**
   * Build the read-only summary chips for exits.
   *
   * `dead` is reserved for truly unresolvable exits: an optional CTA pointing
   * to a removed page, etc. The required `next` exit on the *last* page
   * legitimately has no successor — surface it as "end of flow" with the
   * informational `tone: 'end'` instead of a warning.
   *
   * Disabled optional exits still appear (dimmed) so users see what the page
   * could expose without having to scroll to the dropdowns below.
   */
  type ChipTone = 'live' | 'disabled' | 'end' | 'dead';
  const exitTargets = exits.map((exit) => {
    const k = `${instance.id}.${exit.key}`;
    const isOptional = Boolean(exit.optional);
    const enabled    = isOptional ? (enabledExits[k] ?? exit.defaultEnabled ?? false) : true;
    const chosen = flowExits[k];
    const targetId = chosen || resolveDefault(exit.defaultRule);
    let tone: ChipTone;
    let target: string;
    if (!enabled) {
      tone = 'disabled';
      target = 'off';
    } else if (targetId) {
      tone = 'live';
      target = otherInstances.find(o => o.id === targetId)?.label ?? targetId;
    } else if (isLast && !isOptional) {
      tone = 'end';
      target = 'end of flow';
    } else {
      tone = 'dead';
      target = '—';
    }
    return { key: exit.key, label: exit.label, target, tone };
  });

  const hasDeadExit = exitTargets.some(t => t.tone === 'dead');

  return (
    <li
      ref={setNodeRef}
      style={style}
      data-flow-id={instance.id}
      className={`flow-card${isDragging ? ' is-dragging' : ''}${expanded ? ' is-expanded' : ''}${isEntry ? ' is-entry' : ''}`}
    >
      <div className="flow-card__rail">
        <button
          type="button"
          className="flow-card__handle"
          {...attributes}
          {...listeners}
          aria-label={`Drag ${title}`}
          title="Drag to reorder"
        >⋮⋮</button>
        <div className="flow-card__index" aria-hidden>{isEntry ? '★' : index + 1}</div>
        <div className="flow-card__nudge">
          <button
            type="button"
            className="flow-card__nudge-btn"
            data-nudge="up"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            aria-label={`Move ${title} up`}
            title="Move up"
          >▲</button>
          <button
            type="button"
            className="flow-card__nudge-btn"
            data-nudge="down"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            aria-label={`Move ${title} down`}
            title="Move down"
          >▼</button>
        </div>
      </div>
      <div className="flow-card__body">
        <div className="flow-card__row">
          <span className="flow-card__type-icon" aria-hidden>{pageIcon(instance.type)}</span>
          <strong>{title}</strong>
          {isEntry && <span className="flow-card__pill flow-card__pill--entry" title="This is the entry route">Entry</span>}
          {dupRoute && <span className="flow-card__pill flow-card__pill--warn" title="Another page in the flow uses the same route">⚠ Duplicate route</span>}
          {hasDeadExit && <span className="flow-card__pill flow-card__pill--warn" title="One or more exits have no destination">⚠ Dead-end exit</span>}
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

        {exitTargets.length > 0 && (
          <ul className="flow-card__exit-summary" aria-label="Where this page navigates next">
            {exitTargets.map(t => (
              <li key={t.key} className={`flow-card__exit-chip flow-card__exit-chip--${t.tone}`}>
                <span className="flow-card__exit-chip-key">{t.label}</span>
                <span className="flow-card__exit-chip-arrow" aria-hidden>→</span>
                <span className="flow-card__exit-chip-target">{t.target}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flow-card__actions">
        {!isEntry && (
          <button
            type="button"
            className="flow-card__action-btn"
            onClick={onMakeEntry}
            title="Make this the entry page"
          >
            <span aria-hidden>★</span>
            <span className="flow-card__action-label">Set as entry</span>
          </button>
        )}
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
          title="Remove from flow"
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

      {ruleOptions.length > 1 && otherInstances.length > 0 && (
        <div className={`flow-card__behavior-wrap${behaviorOpen || ruleIsCustom ? ' is-open' : ''}`}>
          <button
            type="button"
            className={`flow-card__behavior-trigger${ruleIsCustom ? ' is-custom' : ''}`}
            onClick={() => setBehaviorOpen(v => !v)}
            aria-expanded={behaviorOpen || ruleIsCustom}
            aria-controls={`behavior-${instance.id}`}
          >
            <span aria-hidden>⏵</span>
            <span className="flow-card__behavior-trigger-label">Behavior</span>
            <span className="flow-card__behavior-trigger-value">{selectedRule?.label ?? 'Always show'}</span>
            <span className={`flow-card__chev${behaviorOpen || ruleIsCustom ? ' is-open' : ''}`} aria-hidden>▾</span>
          </button>

          {(behaviorOpen || ruleIsCustom) && (
            <div className="flow-card__behavior" id={`behavior-${instance.id}`}>
              <div className="flow-card__behavior-copy">
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
                      <option value="">{`Default · ${otherInstances.find(o => o.id === defaultSkipId)?.label ?? 'next page'}`}</option>
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
