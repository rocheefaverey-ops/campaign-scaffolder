import styles from './PauseToggle.module.scss';

type Props = { onPause?: () => void; label?: string };

export function PauseToggle({ onPause, label = 'Pause' }: Props) {
  return <button type="button" className={styles.button} onClick={onPause}>{label}</button>;
}
