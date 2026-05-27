'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getLeaderboard } from '@/app/actions/get-leaderboard/action';
import LeaderboardRow from './LeaderboardRow';
import LeaderboardTabs from './LeaderboardTabs';
import type { LeaderboardEntry, LeaderboardType } from '@/types/actions/leaderboard';
import { useGameContext } from '@hooks/useGameContext';

const PAGE_SIZE = 12;

export default function Leaderboard() {
  const { token } = useGameContext();
  const [activeType, setActiveType] = useState<LeaderboardType>('total');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [personalBest, setPersonalBest] = useState<LeaderboardEntry | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(
    async (type: LeaderboardType, pageOffset: number, replace: boolean) => {
      setLoading(true);
      setError(null);

      const result = await getLeaderboard({
        type,
        offset: pageOffset,
        limit: PAGE_SIZE,
        token: token ?? undefined,
      });

      setLoading(false);

      if (!result.success || !result.data) {
        setError(result.error ?? 'Leaderboard unavailable.');
        return;
      }

      const { entries: newEntries, personalBest: pb, total } = result.data;
      setEntries((prev) => (replace ? newEntries : [...prev, ...newEntries]));
      if (pb) setPersonalBest(pb);
      setHasMore(pageOffset + newEntries.length < total);
    },
    [token],
  );

  useEffect(() => {
    setEntries([]);
    setOffset(0);
    setHasMore(true);
    fetchPage(activeType, 0, true);
  }, [activeType, fetchPage]);

  const loadNextPage = useCallback(() => {
    if (loading || !hasMore) return;
    const nextOffset = offset + PAGE_SIZE;
    setOffset(nextOffset);
    fetchPage(activeType, nextOffset, false);
  }, [activeType, fetchPage, hasMore, loading, offset]);

  const handleScroll = useCallback(() => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    if (scrollHeight - scrollTop - clientHeight < 120) loadNextPage();
  }, [loadNextPage]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <LeaderboardTabs active={activeType} onChange={setActiveType} />

      {entries.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {entries.slice(0, 3).map((entry) => (
            <div
              key={`podium-${entry.rank}`}
              className="rounded-xl border border-[var(--line-soft)] bg-white/70 p-3 text-center shadow-[var(--shadow-card)]"
            >
              <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                #{entry.rank}
              </p>
              <p className="mt-1 truncate text-sm font-black">{entry.name}</p>
              <p className="mt-1 text-xs font-bold tabular-nums text-[var(--text-secondary)]">
                {entry.score.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}

      <div
        ref={listRef}
        onScroll={handleScroll}
        className="relative min-h-0 flex-1 overflow-y-auto pr-1"
      >
        <div
          className="pointer-events-none sticky top-0 z-10 h-5"
          style={{ background: 'linear-gradient(to bottom, var(--surface-strong), transparent)' }}
        />

        <div className="space-y-2 pb-4">
          {entries.map((entry, i) => (
            <LeaderboardRow
              key={`${entry.rank}-${entry.name}`}
              entry={entry}
              isPersonal={entry.isCurrentPlayer}
              index={i}
            />
          ))}

          {error && (
            <p className="rounded-xl border border-[var(--line-soft)] bg-white/70 px-4 py-3 text-center text-sm font-semibold text-[var(--text-secondary)]">
              {error}
            </p>
          )}

          {loading && (
            <div className="flex justify-center py-4">
              <div
                className="h-5 w-5 animate-spin rounded-full border-2"
                style={{
                  borderColor: 'var(--line-soft)',
                  borderTopColor: 'var(--color-primary)',
                }}
              />
            </div>
          )}

          {!loading && entries.length === 0 && (
            <p className="py-8 text-center text-sm font-semibold text-[var(--text-secondary)]">No scores yet.</p>
          )}

          {!loading && hasMore && entries.length > 0 && (
            <button
              type="button"
              onClick={loadNextPage}
              className="min-h-11 w-full rounded-xl border border-[var(--line-soft)] bg-white/70 text-sm font-black text-[var(--text-primary)]"
            >
              Load more
            </button>
          )}
        </div>

        <div
          className="pointer-events-none sticky bottom-0 h-6"
          style={{ background: 'linear-gradient(to top, var(--surface-strong), transparent)' }}
        />
      </div>

      {personalBest && (
        <div className="shrink-0">
          <LeaderboardRow entry={personalBest} isPersonal />
        </div>
      )}
    </div>
  );
}
