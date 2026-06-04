import { useState } from 'react';
import { STACK_OPTIONS, defaultPagesForStack, defaultEnabledExits, defaultFlowButtonVariants, defaultMenuItemsEnabled, defaultFlowRulesForPages, defaultPageBlocksForPages, type StackOption, type StepProps, type Engine } from '../shared/config.ts';
import { autoNameVersion } from '../shared/projectNameDefaults.ts';

function EngineIcon({ engine }: { engine: Engine }) {
  const s = { width: 20, height: 20, flexShrink: 0 } as const;
  switch (engine) {
    case 'unity': return (
      <svg {...s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2L17 6v8l-7 4-7-4V6l7-4z" /><path d="M10 10v8M10 10l7-4M10 10L3 6" />
      </svg>
    );
    case 'r3f': return (
      <svg {...s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <ellipse cx="10" cy="10" rx="8" ry="3" /><ellipse cx="10" cy="10" rx="8" ry="3" transform="rotate(60 10 10)" /><ellipse cx="10" cy="10" rx="8" ry="3" transform="rotate(120 10 10)" /><circle cx="10" cy="10" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    );
    case 'phaser': return (
      <svg {...s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="6" width="12" height="9" rx="2" /><path d="M8 10h4M10 8v4" /><circle cx="7" cy="4" r="1" fill="currentColor" stroke="none" /><circle cx="13" cy="4" r="1" fill="currentColor" stroke="none" /><path d="M7 5v1M13 5v1" />
      </svg>
    );
    case 'memory': return (
      <svg {...s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="7" height="7" rx="1.5" /><rect x="11" y="2" width="7" height="7" rx="1.5" /><rect x="2" y="11" width="7" height="7" rx="1.5" /><rect x="11" y="11" width="7" height="7" rx="1.5" />
      </svg>
    );
    case 'none': return (
      <svg {...s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M4 10h12" /><circle cx="10" cy="10" r="7" />
      </svg>
    );
  }
}

export default function StepStack({ config, setConfig }: StepProps) {
  const [openInfoIdx, setOpenInfoIdx] = useState<number | null>(null);

  return (
    <>
      <div>
        <h2 className="step__title">Engine</h2>
        <p className="step__hint">Pick the runtime engine and base stack. You can change modules later.</p>
      </div>

      <div className="card-grid">
        {STACK_OPTIONS.map((opt, i) => {
          const selected = config.stack === opt.id && config.game === opt.engine;
          const showInfo = openInfoIdx === i;
          return (
            <div key={i} className="stack-cell">
              <button
                className={`card${selected ? ' is-selected' : ''}`}
                onClick={() => {
                  const v = autoNameVersion(config.name);
                  const name = v ? `${opt.id}-${opt.engine}-scaf-v${v}` : config.name;
                  const pages = defaultPagesForStack(opt.id);
                  setConfig({
                    ...config,
                    stack: opt.id,
                    game: opt.engine,
                    gameId: opt.id === 'tanstack' && opt.engine === 'unity' ? 'nhl-crush' : undefined,
                    name,
                    pages,
                    regMode: 'after',
                    modules: opt.id === 'tanstack' ? [] : config.modules,
                    flowExits: {},
                    flowEnabledExits: defaultEnabledExits(),
                    flowButtonVariants: defaultFlowButtonVariants(),
                    flowRules: defaultFlowRulesForPages(pages),
                    pageBlocks: defaultPageBlocksForPages(pages),
                    menuItemsEnabled: defaultMenuItemsEnabled(),
                  });
                }}
                style={{ position: 'relative' }}
              >
                <div className="card__label"><span className="stack-icon"><EngineIcon engine={opt.engine} /></span>{opt.label}</div>
                <div className="card__hint">{opt.hint}</div>

                <span
                  role="button"
                  tabIndex={0}
                  className="stack-info-btn"
                  aria-label={`More info about ${opt.label}`}
                  aria-expanded={showInfo}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenInfoIdx(showInfo ? null : i);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      setOpenInfoIdx(showInfo ? null : i);
                    }
                  }}
                >
                  i
                </span>
              </button>

              {showInfo && <StackInfoPanel opt={opt} onClose={() => setOpenInfoIdx(null)} />}
            </div>
          );
        })}
      </div>
    </>
  );
}

function StackInfoPanel({ opt, onClose }: { opt: StackOption; onClose: () => void }) {
  return (
    <div className="stack-info-panel">
      <header className="stack-info-panel__head">
        <strong>{opt.label}</strong>
        <button className="stack-info-panel__close" aria-label="Close" onClick={onClose}>x</button>
      </header>

      <p className="step__hint">{opt.hint}</p>

      <div className="stack-info-panel__section">
        <h5>Strengths</h5>
        <ul>
          {opt.strengths.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </div>

      <div className="stack-info-panel__section">
        <h5>Reference projects</h5>
        <p className="step__hint">{opt.references.join(' / ')}</p>
      </div>

      {opt.notes && (
        <div className="stack-info-panel__section">
          <h5>When to pick</h5>
          <p className="step__hint">{opt.notes}</p>
        </div>
      )}
    </div>
  );
}
