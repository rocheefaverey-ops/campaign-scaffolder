import styles from './MenuItemList.module.scss';

type Item = { label: string; href: string };
type Props = { items?: Item[] };

export function MenuItemList({ items = [] }: Props) {
  return (
    <nav className={styles.nav}>
      {(items.length ? items : defaultItems).map((item) => (
        <a key={`${item.label}-${item.href}`} href={item.href}>{item.label}</a>
      ))}
    </nav>
  );
}

const defaultItems = [
  { label: 'Home', href: '/landing' },
  { label: 'How to play', href: '/tutorial' },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'Terms', href: '/terms' },
];
