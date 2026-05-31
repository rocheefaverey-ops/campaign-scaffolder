import styles from './ScoreReadout.module.scss';

type Props = {
  score?: number | string;
  label?: string;
  highScore?: number | string;
  showHighScore?: boolean;
};

export function ScoreReadout({ score = 0, label = 'Score', highScore, showHighScore = false }: Props) {
  return (
    <div className={styles.readout}>
      <span>{label}</span>
      <strong>{score}</strong>
      {showHighScore && highScore !== undefined && <small>Best: {highScore}</small>}
    </div>
  );
}
