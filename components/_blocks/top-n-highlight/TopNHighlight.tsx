import styles from './TopNHighlight.module.scss';

type Props = { label?: string; count?: number };

export function TopNHighlight({ label, count = 3 }: Props) {
  return <p className={styles.highlight}>{label ?? `Top ${count} are highlighted`}</p>;
}
