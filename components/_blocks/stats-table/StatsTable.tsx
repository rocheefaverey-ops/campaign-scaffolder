import styles from './StatsTable.module.scss';

type Row = { label: string; value: string | number };
type Props = { rows?: Row[] };

export function StatsTable({ rows = [] }: Props) {
  if (!rows.length) return null;
  return (
    <dl className={styles.table}>
      {rows.map((row, index) => (
        <div key={index} className={styles.row}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
