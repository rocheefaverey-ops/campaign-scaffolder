import styles from './StatsTable.module.scss';

type Row = { label: string; value: string | number };
type Props = { rows?: Row[]; count?: number };

export function StatsTable({ rows = [], count }: Props) {
  if (!rows.length) return null;
  const shown = typeof count === 'number' ? rows.slice(0, Math.max(0, count)) : rows;
  if (!shown.length) return null;
  return (
    <dl className={styles.table}>
      {shown.map((row, index) => (
        <div key={index} className={styles.row}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
