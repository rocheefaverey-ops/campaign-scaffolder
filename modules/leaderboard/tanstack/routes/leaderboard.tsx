import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { PageContainer } from '~/components/containers/PageContainer.tsx';
import { StyledButton } from '~/components/buttons/StyledButton.tsx';
import { loadLeaderboardData } from '~/loaders/LeaderboardLoader.ts';
import { getLeaderboardRequest } from '~/server/api/endpoints/Leaderboard.ts';
import { useGameNavigation } from '~/hooks/useGameNavigation.ts';

type LbTab = 'daily' | 'weekly' | 'total';

interface LbRow { rank: number; name: string; score: number; isYou?: boolean }

export const Route = createFileRoute('/leaderboard')({
  component: LeaderboardPage,
  loader: async ({ context }) => await loadLeaderboardData(context.language),
});

function LeaderboardPage() {
  const { copy } = Route.useLoaderData();
  const { navigate } = useGameNavigation();
  const [tab,  setTab]  = useState<LbTab>('total');
  const [rows, setRows] = useState<LbRow[]>([]);

  useEffect(() => {
    getLeaderboardRequest({ data: { type: tab, offset: 0, limit: 10 } })
      .then((res: any) => { if (res?.data) setRows(res.data); })
      .catch(() => {});
  }, [tab]);

  return (
    <PageContainer className="campaign-screen">
      <div className="campaign-shell">
        <section className="campaign-stack" style={{ animation: 'fadeIn 0.4s ease both' }}>
          {copy.kicker && <p className="campaign-kicker">{copy.kicker}</p>}
          <h1 className="campaign-title campaign-title--compact">{copy.headline || 'Leaderboard'}</h1>
          {copy.subline && <p className="campaign-copy">{copy.subline}</p>}
        </section>

        <div className="lb-tabs" role="tablist">
          {(['daily', 'weekly', 'total'] as LbTab[]).map(t => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              className={`lb-tab${tab === t ? ' is-active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <section
          className="campaign-panel flex-1 min-h-0 p-3"
          style={{ animation: 'fadeIn 0.4s 0.1s ease both' }}
        >
          <ol className="lb-list">
            {rows.map((row, i) => (
              <li key={i} className={`lb-row${row.isYou ? ' is-you' : ''}`}>
                <span className="lb-row__rank">#{row.rank}</span>
                <span className="lb-row__name">{row.name}{row.isYou ? ' (you)' : ''}</span>
                <span className="lb-row__score">{row.score.toLocaleString()}</span>
              </li>
            ))}
            {rows.length === 0 && (
              <li className="lb-row lb-row--empty">No scores yet.</li>
            )}
          </ol>
        </section>

        <div className="campaign-actions" style={{ animation: 'fadeIn 0.4s 0.2s ease both' }}>
          <StyledButton onClick={navigate}>
            {copy.ctaDone || 'Done'}
          </StyledButton>
        </div>
      </div>
    </PageContainer>
  );
}
