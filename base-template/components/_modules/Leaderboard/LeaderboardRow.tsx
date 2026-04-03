import { cn } from '@utils/helpers';
import type { LeaderboardEntry } from '@/types/actions/leaderboard';

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  isPersonal?: boolean;
}

export default function LeaderboardRow({ entry, isPersonal }: LeaderboardRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-lg px-4 py-3',
        isPersonal
          ? 'bg-[var(--color-primary)] text-[var(--color-secondary)]'
          : 'bg-white/5',
      )}
    >
      <span className="w-6 text-center font-bold opacity-60">#{entry.rank}</span>
      <span className="flex-1 truncate font-brand font-bold">{entry.name}</span>
      <span className="font-mono font-bold">{entry.score.toLocaleString()}</span>
    </div>
  );
}
