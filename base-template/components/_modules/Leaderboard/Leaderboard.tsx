'use client';

import { useQuery } from '@tanstack/react-query';
import { getLeaderboard } from '@/app/actions/get-leaderboard/action';
import LeaderboardRow from './LeaderboardRow';
import type { LeaderboardType } from '@/types/actions/leaderboard';
import { useGameContext } from '@hooks/useGameContext';

interface LeaderboardProps {
  type?: LeaderboardType;
  limit?: number;
}

export default function Leaderboard({ type = 'total', limit = 10 }: LeaderboardProps) {
  const { token } = useGameContext();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['leaderboard', type],
    queryFn: () => getLeaderboard({ type, limit, token: token ?? undefined }),
    enabled: true,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded bg-white/10" />
        ))}
      </div>
    );
  }

  if (isError || !data?.success) {
    return <p className="text-center opacity-50">Could not load leaderboard.</p>;
  }

  return (
    <div className="space-y-2">
      {data.data?.entries.map((entry) => (
        <LeaderboardRow key={entry.rank} entry={entry} />
      ))}
      {data.data?.personalBest && (
        <LeaderboardRow entry={data.data.personalBest} isPersonal />
      )}
    </div>
  );
}
