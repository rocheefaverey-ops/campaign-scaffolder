import styles from './ScoreReadout.module.scss';

type Props = {
  score?: number | string;
  label?: string;
  highScore?: number | string;
  showHighScore?: boolean;
};

export function ScoreReadout({ score = 0, label = 'Score', highScore, showHighScore = false }: Props) {
  return (
    <div className={styles.plate}>
      <span className={styles.label}>{label}</span>
      <strong className={styles.value}>{score}</strong>
      {showHighScore && highScore !== undefined && (
        <span className={styles.best}>Best {highScore}</span>
      )}
    </div>
  );
}
