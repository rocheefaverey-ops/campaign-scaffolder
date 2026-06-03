import styles from './MenuItemList.module.scss';

type Item = { label?: string; href?: string };
type Props = { items?: Item[] };

export function MenuItemList({ items }: Props) {
  const valid = (items ?? []).filter((i) => i?.label?.trim());
  const list = valid.length ? valid : DEFAULT_ITEMS;
  return (
    <nav className={styles.nav}>
      {list.map((item) => (
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
