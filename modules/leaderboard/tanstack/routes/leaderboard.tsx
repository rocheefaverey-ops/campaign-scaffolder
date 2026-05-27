import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { PageContainer } from '~/components/containers/PageContainer.tsx';
import { StyledButton } from '~/components/buttons/StyledButton.tsx';
import { loadLeaderboardData } from '~/loaders/LeaderboardLoader.ts';
import { getLeaderboardRequest } from '~/server/api/endpoints/Leaderboard.ts';

type LbTab = 'daily' | 'weekly' | 'total';

interface LbRow {
  rank: number;
  name: string;
  score: number;
  isYou?: boolean;
  isCurrentPlayer?: boolean;
}

export const Route = createFileRoute('/leaderboard')({
  component: LeaderboardPage,
  loader: async ({ context }) => await loadLeaderboardData(context.language),
});

function LeaderboardPage() {
  const { copy } = Route.useLoaderData();
  const router = useRouter();
  const goNext = () => void router.navigate({ to: '{{NEXT_AFTER_LEADERBOARD}}' as never, replace: true });
  const [tab, setTab] = useState<LbTab>('total');
  const [rows, setRows] = useState<LbRow[]>([]);
  const [personalBest, setPersonalBest] = useState<LbRow | null>(null);
  const [loading, setLoading] = useState(false);
  const topRows = useMemo(() => rows.slice(0, 3), [rows]);

  useEffect(() => {
    setLoading(true);
    getLeaderboardRequest({ data: { type: tab, offset: 0, limit: 12 } })
      .then((res: any) => {
        const data = res?.data;

        if (Array.isArray(data)) {
          setRows(data);
          setPersonalBest(data.find((row: LbRow) => row.isYou || row.isCurrentPlayer) ?? null);
          return;
        }

        setRows(data?.entries ?? []);
        setPersonalBest(data?.personalBest ?? null);
      })
      .catch(() => {
        setRows([]);
        setPersonalBest(null);
      })
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <PageContainer className="campaign-screen">
      <div className="campaign-shell">
        <section className="campaign-stack" style={{ animation: 'fadeIn 0.4s ease both' }}>
          {copy.kicker && <p className="campaign-kicker">{copy.kicker}</p>}
          <h1 className="campaign-title campaign-title--compact">{copy.headline || 'Leaderboard'}</h1>
          {copy.subline && <p className="campaign-copy">{copy.subline}</p>}
        </section>

        <div className="lb-tabs" role="tablist" aria-label="Leaderboard period">
          {(['daily', 'weekly', 'total'] as LbTab[]).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={tab === item}
              className={`lb-tab${tab === item ? ' is-active' : ''}`}
              onClick={() => setTab(item)}
            >
              {item === 'total' ? 'All time' : item.charAt(0).toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>

        <section
          className="campaign-panel campaign-panel--strong flex-1 min-h-0 p-3"
          style={{ animation: 'fadeIn 0.4s 0.1s ease both' }}
        >
          {topRows.length > 0 && (
            <div className="lb-podium" aria-label="Top players">
              {topRows.map((row) => (
                <article key={`top-${row.rank}`} className="lb-podium__item">
                  <span className="lb-podium__rank">#{row.rank}</span>
                  <strong className="lb-podium__name">{row.name}</strong>
                  <span className="lb-podium__score">{row.score.toLocaleString()}</span>
                </article>
              ))}
            </div>
          )}

          <ol className="lb-list">
            {rows.map((row, i) => (
              <li key={`${row.rank}-${row.name}-${i}`} className={`lb-row${row.isYou || row.isCurrentPlayer ? ' is-you' : ''}`}>
                <span className="lb-row__rank">#{row.rank}</span>
                <span className="lb-row__name">{row.name}{row.isYou || row.isCurrentPlayer ? ' (you)' : ''}</span>
                <span className="lb-row__score">{row.score.toLocaleString()}</span>
              </li>
            ))}
            {loading && (
              <li className="lb-row lb-row--empty">Loading scores...</li>
            )}
            {!loading && rows.length === 0 && (
              <li className="lb-row lb-row--empty">{copy.emptyState || 'No scores yet.'}</li>
            )}
          </ol>

          {personalBest && (
            <div className="lb-personal" aria-label="Personal best">
              <span className="lb-personal__label">Your best</span>
              <strong>#{personalBest.rank}</strong>
              <span>{personalBest.score.toLocaleString()}</span>
            </div>
          )}
        </section>

        <div className="campaign-actions" style={{ animation: 'fadeIn 0.4s 0.2s ease both' }}>
          <StyledButton onClick={goNext}>
            {copy.ctaDone || 'Continue'}
          </StyledButton>
        </div>
      </div>
    </PageContainer>
  );
}
