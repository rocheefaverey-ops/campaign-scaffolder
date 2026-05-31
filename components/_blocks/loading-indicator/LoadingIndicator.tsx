import styles from './LoadingIndicator.module.scss';

type Props = {
  kind?: 'ring' | 'bar';
  label?: string;
};

export function LoadingIndicator({ kind = 'ring', label = 'Loading' }: Props) {
  return (
    <div className={styles.wrap} role="status" aria-label={label}>
      <span className={kind === 'bar' ? styles.bar : styles.ring} aria-hidden />
      <span className={styles.label}>{label}</span>
    </div>
  );
}
