import styles from './PersonalBestRow.module.scss';

type Props = { label?: string; rank?: number | string; score?: number | string };

export function PersonalBestRow({ label = 'You', rank = '-', score = '-' }: Props) {
  return (
    <div className={styles.row}>
      <span>{rank}</span>
      <strong>{label}</strong>
      <em>{score}</em>
    </div>
  );
}
