import styles from './StatusChip.module.scss';

type Props = { label?: string; kind?: 'registered' | 'winner' | 'offline' };

export function StatusChip({ label = 'Registered', kind = 'registered' }: Props) {
  return <span className={`${styles.chip} ${styles[`chip--${kind}`]}`}>{label}</span>;
}
