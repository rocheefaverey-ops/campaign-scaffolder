import styles from './RevealCta.module.scss';

type Props = { label?: string; visible?: boolean; onClick?: () => void };

export function RevealCta({ label = 'Continue', visible = true, onClick }: Props) {
  if (!visible) return null;
  return <button type="button" className={styles.cta} onClick={onClick}>{label}</button>;
}
