import { useEffect, useState } from 'react';
import { type StepProps } from '../shared/config.ts';
import { listGames, type GameInfo } from '../bridge.ts';
import { autoNameVersion } from '../shared/projectNameDefaults.ts';

export default function StepGames({ config, setConfig }: StepProps) {
  const [openInfoIdx, setOpenInfoIdx] = useState<number | null>(null);
  const [games, setGames] = useState<GameInfo[]>([]);

  useEffect(() => {
    let cancelled = false;
    listGames(config.stack).then((loaded) => {
      if (!cancelled) setGames(loaded);
    });
    return () => { cancelled = true; };
  }, [config.stack]);

  // Clear a stale gameId when the user switches engine (e.g. Unity→R3F).
  useEffect(() => {
    if (config.gameId !== undefined) {
      const match = games.find(g => g.id === config.gameId);
      if (match && match.engine !== config.game) setConfig({ ...config, gameId: undefined });
    }
  }, [config.game]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedGameId = config.gameId;
  const visibleGames   = games.filter((game) => game.engine === config.game);

  return (
    <>
      <div>
        <h2 className="step__title">Game</h2>
        <p className="step__hint">
          Select a pre-built game definition from <code>games/*/game.json</code>.
          Leave empty to use the {config.game} engine without game-specific defaults.
        </p>
      </div>

      <div className="card-grid">
        {/* "No specific game" option */}
        <div key="none" className="stack-cell">
          <button
            className={`card${selectedGameId === undefined ? ' is-selected' : ''}`}
            onClick={() => setConfig({ ...config, gameId: undefined })}
          >
            <div className="card__label">No specific game</div>
            <div className="card__hint">Use {config.game} engine settings only</div>
          </button>
        </div>

        {visibleGames.map((game, i) => {
          const selected = selectedGameId === game.id;
          const showInfo = openInfoIdx === i;
          return (
            <div key={game.id} className="stack-cell">
              <button
                className={`card${selected ? ' is-selected' : ''}`}
                onClick={() => {
                  const v = autoNameVersion(config.name);
                  const name = v ? `${config.stack}-${config.game}-${game.id}-scaf-v${v}` : config.name;
                  setConfig({ ...config, gameId: game.id, game: game.engine as any, name });
                }}
              >
                <div className="card__label">{game.name}</div>
                <div className="card__hint">{game.description}</div>
                <span className="card__badge">{game.engine}</span>
              </button>

              {showInfo && (
                <div className="stack-info-panel">
                  <header className="stack-info-panel__head">
                    <strong>{game.name}</strong>
                    <button className="stack-info-panel__close" aria-label="Close" onClick={() => setOpenInfoIdx(null)}>×</button>
                  </header>
                  <p className="step__hint">{game.description}</p>
                  <div className="stack-info-panel__section">
                    <h5>Engine</h5>
                    <p>{game.engine}</p>
                  </div>
                  {game.cdn && (
                    <div className="stack-info-panel__section">
                      <h5>CDN</h5>
                      <p className="step__hint">
                        <code>{game.cdn.baseUrl || 'not set'}</code>
                        {game.cdn.gameName && <> · build <code>{game.cdn.gameName}</code></>}
                        {game.cdn.compression && <> · {game.cdn.compression}</>}
                      </p>
                    </div>
                  )}
                  {game.dpr && (
                    <div className="stack-info-panel__section">
                      <h5>DPR</h5>
                      <p>{game.dpr.min ?? 'default'} - {game.dpr.max ?? 'default'}</p>
                    </div>
                  )}
                  {game.boot && (
                    <div className="stack-info-panel__section">
                      <h5>Boot</h5>
                      <p className="step__hint">
                        scene <code>{game.boot.defaultScene ?? 'Game'}</code>
                        {game.boot.startMethod && <> · start <code>{game.boot.startMethod}</code></>}
                      </p>
                    </div>
                  )}
                  {game.env && Object.keys(game.env).length > 0 && (
                    <div className="stack-info-panel__section">
                      <h5>Env vars</h5>
                      <p className="step__hint">{Object.keys(game.env).join(' · ')}</p>
                    </div>
                  )}
                  <div className="stack-info-panel__section">
                    <h5>Game ID</h5>
                    <code>{game.id}</code>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedGameId && (
        <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-secondary)', borderRadius: 8 }}>
          <h4 style={{ margin: '0 0 8px' }}>Selected: {games.find(g => g.id === selectedGameId)?.name ?? selectedGameId}</h4>
          <p className="step__hint" style={{ margin: 0 }}>
            Game settings will be loaded from <code>games/{selectedGameId}/game.json</code> during scaffold.
            This includes CDN configuration, DPR bounds, boot methods, and environment variables.
          </p>
        </div>
      )}
    </>
  );
}
