import { cn } from '@utils/helpers';
import type { LeaderboardEntry } from '@/types/actions/leaderboard';

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  isPersonal?: boolean;
  /** Animate in with a staggered delay (capped at 300ms) */
  index?: number;
}

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function LeaderboardRow({
  entry,
  isPersonal,
  index = 0,
}: LeaderboardRowProps) {
  const delayMs = Math.min(index * 40, 300);

  return (
    <div
      className={cn(
        'animate-fadeInUp flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors',
        isPersonal
          ? 'bg-[var(--color-primary)] text-[var(--text-primary)] font-semibold shadow-[var(--shadow-card)]'
          : 'bg-[var(--surface-elevated)] border border-[var(--line-soft)] hover:bg-white',
      )}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      {/* Rank badge */}
      <span className="w-8 shrink-0 text-center text-sm font-bold">
        {MEDAL[entry.rank] ?? `#${entry.rank}`}
      </span>

      {/* Name */}
      <span className="flex-1 truncate font-bold">
        {entry.name}
        {isPersonal && (
          <span className="ml-2 text-xs font-normal opacity-70">(you)</span>
        )}
      </span>

      {/* Score */}
      <span className="shrink-0 font-bold tabular-nums">
        {entry.score.toLocaleString()}
      </span>
    </div>
  );
}
