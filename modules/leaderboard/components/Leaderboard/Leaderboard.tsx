'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getLeaderboard } from '@/app/actions/get-leaderboard/action';
import LeaderboardRow from './LeaderboardRow';
import LeaderboardTabs from './LeaderboardTabs';
import type { LeaderboardEntry, LeaderboardType } from '@/types/actions/leaderboard';
import { useGameContext } from '@hooks/useGameContext';

const PAGE_SIZE = 100;

export default function Leaderboard() {
  const { token } = useGameContext();
  const [activeType, setActiveType] = useState<LeaderboardType>('total');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [personalBest, setPersonalBest] = useState<LeaderboardEntry | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(
    async (type: LeaderboardType, pageOffset: number, replace: boolean) => {
      setLoading(true);
      const result = await getLeaderboard({
        type,
        offset: pageOffset,
        limit: PAGE_SIZE,
        token: token ?? undefined,
      });
      setLoading(false);

      if (!result.success || !result.data) return;

      const { entries: newEntries, personalBest: pb, total } = result.data;

      setEntries((prev) => (replace ? newEntries : [...prev, ...newEntries]));
      if (pb) setPersonalBest(pb);
      setHasMore(pageOffset + newEntries.length < total);
    },
    [token],
  );

  // Reload when tab changes
  useEffect(() => {
    setEntries([]);
    setOffset(0);
    setHasMore(true);
    fetchPage(activeType, 0, true);
  }, [activeType, fetchPage]);

  // Infinite scroll
  const handleScroll = useCallback(() => {
    if (!listRef.current || loading || !hasMore) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    if (scrollHeight - scrollTop - clientHeight < 120) {
      const nextOffset = offset + PAGE_SIZE;
      setOffset(nextOffset);
      fetchPage(activeType, nextOffset, false);
    }
  }, [loading, hasMore, offset, activeType, fetchPage]);

  return (
    <div className="flex h-full flex-col gap-4">
      <LeaderboardTabs active={activeType} onChange={setActiveType} />

      {/* Scrollable list */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="relative flex-1 overflow-y-auto"
      >
        {/* Top fade */}
        <div
          className="pointer-events-none sticky top-0 h-6"
          style={{ background: 'linear-gradient(to bottom, var(--surface-strong), transparent)' }}
        />

        <div className="space-y-2 px-1 pb-4">
          {entries.map((entry, i) => (
            <LeaderboardRow
              key={`${entry.rank}-${entry.name}`}
              entry={entry}
              isPersonal={entry.isCurrentPlayer}
              index={i}
            />
          ))}

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
            <p className="py-8 text-center text-[var(--text-secondary)]">No scores yet.</p>
          )}
        </div>

        {/* Bottom fade */}
        <div
          className="pointer-events-none sticky bottom-0 h-6"
          style={{ background: 'linear-gradient(to top, var(--surface-strong), transparent)' }}
        />
      </div>

      {/* Personal best — pinned at bottom */}
      {personalBest && (
        <div className="shrink-0">
          <LeaderboardRow entry={personalBest} isPersonal />
        </div>
      )}
    </div>
  );
}
