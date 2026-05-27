import { cn } from '@utils/helpers';
import type { LeaderboardType } from '@/types/actions/leaderboard';

const TABS: { label: string; value: LeaderboardType }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'All time', value: 'total' },
];

interface LeaderboardTabsProps {
  active: LeaderboardType;
  onChange: (type: LeaderboardType) => void;
}

export default function LeaderboardTabs({ active, onChange }: LeaderboardTabsProps) {
  return (
    <div
      className="grid grid-cols-3 gap-1 rounded-xl p-1"
      style={{ background: 'rgba(26, 26, 26, 0.06)', border: '1px solid var(--line-soft)' }}
    >
      {TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={cn(
            'min-h-10 rounded-lg px-2 text-xs font-bold uppercase tracking-[0.14em] transition-all duration-200',
            active === tab.value
              ? 'bg-[var(--surface-ink)] text-[var(--text-inverse)] shadow-[var(--shadow-card)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
