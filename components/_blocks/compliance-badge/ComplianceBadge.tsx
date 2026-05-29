import styles from './ComplianceBadge.module.scss';

type Props = { label?: string; kind?: string };

export function ComplianceBadge({ label, kind = '18+' }: Props) {
  return <span className={styles.badge}>{label ?? kind}</span>;
}
