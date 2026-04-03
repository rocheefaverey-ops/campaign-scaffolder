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
    <div className="flex rounded-full bg-white/10 p-1">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'flex-1 rounded-full py-2 text-sm font-brand font-bold transition-all duration-200',
            active === tab.value
              ? 'bg-[var(--color-primary)] text-[var(--color-secondary)]'
              : 'text-white/60 hover:text-white',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
