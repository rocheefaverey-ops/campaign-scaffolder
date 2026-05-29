import styles from './RankList.module.scss';

type RankRow = { rank: number; name: string; score: number | string };
type Props = { rows?: RankRow[]; emptyLabel?: string };

export function RankList({ rows = [], emptyLabel = 'No scores yet.' }: Props) {
  if (!rows.length) return <p className={styles.empty}>{emptyLabel}</p>;
  return (
    <ol className={styles.list}>
      {rows.map((row) => (
        <li key={`${row.rank}-${row.name}`}>
          <span>{row.rank}</span>
          <strong>{row.name}</strong>
          <em>{row.score}</em>
        </li>
      ))}
    </ol>
  );
}
