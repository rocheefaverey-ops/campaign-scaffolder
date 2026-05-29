import styles from './PauseOverlay.module.scss';

type Props = { open?: boolean; title?: string; onResume?: () => void };

export function PauseOverlay({ open = false, title = 'Paused', onResume }: Props) {
  if (!open) return null;
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.panel}>
        <h2>{title}</h2>
        <button type="button" onClick={onResume}>Resume</button>
      </div>
    </div>
  );
}
