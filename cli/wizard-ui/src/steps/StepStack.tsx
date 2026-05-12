import { useState } from 'react';
import { STACK_OPTIONS, type StackOption, type StepProps } from '../shared/config.ts';
import { autoNameVersion } from '../shared/projectNameDefaults.ts';

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
                  setConfig({ ...config, stack: opt.id, game: opt.engine, name });
                }}
                style={{ position: 'relative' }}
              >
                <div className="card__label">{opt.label}</div>
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
