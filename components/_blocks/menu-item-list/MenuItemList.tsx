import styles from './MenuItemList.module.scss';

type Item = { label?: string; href?: string; id?: string };
type Props = { items?: unknown; targets?: Record<string, string> };

const LABEL_TO_ID: Record<string, string> = {
  home: 'home',
  start: 'home',
  resume: 'resume',
  'how to play': 'howToPlay',
  howtoplay: 'howToPlay',
  tutorial: 'howToPlay',
  leaderboard: 'leaderboard',
  scores: 'leaderboard',
  voucher: 'voucher',
  terms: 'terms',
  privacy: 'privacy',
  faq: 'faq',
  leave: 'leave',
  close: 'leave',
};

function routeHref(value?: string) {
  if (!value) return '#';
  if (value.startsWith('/') || value.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(value)) return value;
  return `/${value.replace(/^\/+/, '')}`;
}

function normalizeItem(item: Item | string): Item | null {
  if (typeof item === 'string') return item.trim() ? { label: item } : null;
  return item?.label?.trim() ? item : null;
}

function itemEntries(value: unknown): Array<Item | string> {
  if (Array.isArray(value)) return value as Array<Item | string>;
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value as Record<string, unknown>).reduce<Array<Item | string>>((acc, [key, entry]) => {
    if (typeof entry === 'string') {
      acc.push({ id: key, label: entry });
      return acc;
    }
    if (entry && typeof entry === 'object') {
      const item = entry as Record<string, unknown>;
      const label = item.label ?? item.title ?? item.text ?? item.value;
      const href = item.href ?? item.url ?? item.route ?? item.target;
      acc.push({
        id: typeof item.id === 'string' ? item.id : key,
        label: typeof label === 'string' ? label : key,
        href: typeof href === 'string' ? href : undefined,
      });
    }
    return acc;
  }, []);
}

function inferItemId(item: Item) {
  if (item.id) return item.id;
  const labelKey = item.label?.trim().toLowerCase().replace(/\s+/g, ' ');
  if (labelKey && LABEL_TO_ID[labelKey]) return LABEL_TO_ID[labelKey];
  const hrefKey = item.href?.replace(/^\/+/, '').replace(/[-_]/g, '').toLowerCase();
  if (hrefKey && LABEL_TO_ID[hrefKey]) return LABEL_TO_ID[hrefKey];
  return undefined;
}

export function MenuItemList({ items, targets }: Props) {
  const valid = itemEntries(items).map(normalizeItem).filter((i): i is Item => Boolean(i));
  const list = valid.length ? valid : DEFAULT_ITEMS;
  const resolved = targets
    ? list.map((item) => {
        const itemId = inferItemId(item);
        const override = itemId ? targets[itemId] : undefined;
        return override ? { ...item, href: override } : item;
      })
    : list;
  return (
    <nav className={styles.nav}>
      {resolved.map((item) => {
        const href = routeHref(item.href);
        return <a key={`${item.label}-${href}`} href={href}>{item.label}</a>;
      })}
    </nav>
  );
}

const DEFAULT_ITEMS: Item[] = [
  { id: 'home', label: 'Home', href: '/landing' },
  { id: 'howToPlay', label: 'How to play', href: '/tutorial' },
  { id: 'leaderboard', label: 'Leaderboard', href: '/leaderboard' },
  { id: 'terms', label: 'Terms', href: '/terms' },
];
