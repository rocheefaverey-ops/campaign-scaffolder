import styles from './FallbackIndicator.module.scss';

type Props = { label?: string };

export function FallbackIndicator({ label = 'Loading' }: Props) {
  return <p className={styles.indicator}>{label}</p>;
}
