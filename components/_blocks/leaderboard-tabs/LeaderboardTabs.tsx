import { useState } from 'react';
import styles from './LeaderboardTabs.module.scss';

type Props = { tabs?: string[]; defaultTab?: string; onChange?: (tab: string) => void };

export function LeaderboardTabs({ tabs = ['all', 'daily', 'weekly'], defaultTab, onChange }: Props) {
  const [active, setActive] = useState(defaultTab ?? tabs[0] ?? '');
  return (
    <div className={styles.tabs} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          className={active === tab ? styles.active : undefined}
          onClick={() => {
            setActive(tab);
            onChange?.(tab);
          }}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
