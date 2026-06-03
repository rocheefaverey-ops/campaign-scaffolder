import styles from './PersonalBestRow.module.scss';

type Props = { label?: string; rank?: number | string; score?: number | string };

export function PersonalBestRow({ label = 'You', rank, score }: Props) {
  const hasRank = rank !== undefined && rank !== null && rank !== '' && rank !== 0 && rank !== '0';
  const hasScore = score !== undefined && score !== null && score !== '' && score !== 0 && score !== '0';
  if (!hasRank && !hasScore) return null;
  const formattedScore = typeof score === 'number' ? score.toLocaleString() : score;

  return (
    <div className={styles.row}>
      <span>{hasRank ? rank : '-'}</span>
      <strong>{label}</strong>
      <em>{hasScore ? formattedScore : '-'}</em>
    </div>
  );
}
