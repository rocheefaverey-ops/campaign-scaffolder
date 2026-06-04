import styles from './RankList.module.scss';

type RankRow = { rank: number; name: string; score: number | string; you?: boolean };
type Props = { rows?: RankRow[]; emptyLabel?: string };

export function RankList({ rows = [], emptyLabel = 'No scores yet.' }: Props) {
  if (!rows.length) return <p className={styles.empty}>{emptyLabel}</p>;
  return (
    <ol className={styles.list}>
      {rows.map((row) => {
        const cls = [
          row.you ? styles.you : '',
          row.rank <= 3 ? styles.top3 : '',
        ].filter(Boolean).join(' ') || undefined;
        return (
          <li key={`${row.rank}-${row.name}`} className={cls} data-rank={row.rank}>
            <span className={styles.rank}>{row.rank}</span>
            <strong>{row.name}</strong>
            <em>{typeof row.score === 'number' ? row.score.toLocaleString() : row.score}</em>
          </li>
        );
      })}
    </ol>
  );
}
