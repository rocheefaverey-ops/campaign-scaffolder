import styles from './MenuItemList.module.scss';

type Item = { label?: string; href?: string; id?: string };
type Props = { items?: Item[]; targets?: Record<string, string> };

export function MenuItemList({ items, targets }: Props) {
  const valid = (items ?? []).filter((i) => i?.label?.trim());
  const list = valid.length ? valid : DEFAULT_ITEMS;
  // Apply per-item target overrides from wizard config (if provided).
  const resolved = targets
    ? list.map((item) => {
        const override = item.id ? targets[item.id] : undefined;
        return override ? { ...item, href: override } : item;
      })
    : list;
  return (
    <nav className={styles.nav}>
      {resolved.map((item) => (
        <a key={`${item.label}-${item.href}`} href={item.href || '#'}>{item.label}</a>
      ))}
    </nav>
  );
}

const DEFAULT_ITEMS: Item[] = [
  { label: 'Home', href: '/landing' },
  { label: 'How to play', href: '/tutorial' },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'Terms', href: '/terms' },
];
