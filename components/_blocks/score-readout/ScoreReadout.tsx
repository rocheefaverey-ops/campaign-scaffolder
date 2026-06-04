import styles from './ScoreReadout.module.scss';

type Props = {
  score?: number | string;
  label?: string;
  highScore?: number | string;
  showHighScore?: boolean;
};

export function ScoreReadout({ score = 0, label = 'Score', highScore, showHighScore = false }: Props) {
  const formattedScore = typeof score === 'number' ? score.toLocaleString() : score;
  const formattedHighScore = typeof highScore === 'number' ? highScore.toLocaleString() : highScore;
  return (
    <div className={styles.plate}>
      <span className={styles.label}>{label}</span>
      <strong className={styles.value}>{formattedScore}</strong>
      {showHighScore && highScore !== undefined && (
        <span className={styles.best}>Best {formattedHighScore}</span>
      )}
    </div>
  );
}
