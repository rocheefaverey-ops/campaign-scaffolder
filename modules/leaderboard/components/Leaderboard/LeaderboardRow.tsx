import { cn } from '@utils/helpers';
import type { LeaderboardEntry } from '@/types/actions/leaderboard';

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  isPersonal?: boolean;
  index?: number;
}

const RANK_LABEL: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd' };

export default function LeaderboardRow({
  entry,
  isPersonal,
  index = 0,
}: LeaderboardRowProps) {
  const delayMs = Math.min(index * 40, 300);

  return (
    <div
      className={cn(
        'animate-fadeInUp grid grid-cols-[3rem_1fr_auto] items-center gap-3 rounded-xl px-3.5 py-3 transition-colors',
        isPersonal
          ? 'bg-[var(--color-primary)] text-[var(--text-primary)] font-semibold shadow-[var(--shadow-lime)]'
          : entry.rank <= 3
            ? 'border border-[color-mix(in_srgb,var(--color-primary)_42%,transparent)] bg-[color-mix(in_srgb,var(--color-primary)_14%,white)] shadow-[var(--shadow-card)]'
            : 'border border-[var(--line-soft)] bg-white/72 hover:bg-white',
      )}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <span
        className={cn(
          'inline-flex h-9 min-w-11 items-center justify-center rounded-lg px-2 text-xs font-black tabular-nums',
          isPersonal || entry.rank <= 3
            ? 'bg-[var(--surface-ink)] text-[var(--text-inverse)]'
            : 'bg-[rgba(26,26,26,0.06)] text-[var(--text-secondary)]',
        )}
      >
        {RANK_LABEL[entry.rank] ?? `#${entry.rank}`}
      </span>

      <span className="min-w-0 truncate font-bold">
        {isPersonal ? 'Your best' : entry.name}
        {isPersonal && (
          <span className="ml-2 text-xs font-normal opacity-70">#{entry.rank}</span>
        )}
      </span>

      <span className="font-black tabular-nums">
        {entry.score.toLocaleString()}
      </span>
    </div>
  );
}
