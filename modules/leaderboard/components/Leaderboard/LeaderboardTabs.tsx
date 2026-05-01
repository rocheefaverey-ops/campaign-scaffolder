import { cn } from '@utils/helpers';
import type { LeaderboardType } from '@/types/actions/leaderboard';

const TABS: { label: string; value: LeaderboardType }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'All Time', value: 'total' },
];

interface LeaderboardTabsProps {
  active: LeaderboardType;
  onChange: (type: LeaderboardType) => void;
}

export default function LeaderboardTabs({ active, onChange }: LeaderboardTabsProps) {
  return (
    <div
      className="flex rounded-full p-1"
      style={{ background: 'var(--surface-elevated)', border: '1px solid var(--line-soft)' }}
    >
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'flex-1 rounded-full py-2 text-sm font-bold uppercase tracking-wider transition-all duration-200',
            active === tab.value
              ? 'bg-[var(--color-primary)] text-[var(--text-primary)] shadow-[var(--shadow-card)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
