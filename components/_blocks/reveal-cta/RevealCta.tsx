import styles from './RevealCta.module.scss';

type Variant = 'primary' | 'secondary' | 'tertiary' | 'dark' | 'danger';

type Props = { label?: string; visible?: boolean; variant?: Variant; onClick?: () => void };

export function RevealCta({ label = 'Continue', visible = true, variant = 'primary', onClick }: Props) {
  if (!visible) return null;
  return <button type="button" className={`${styles.cta} ${styles[`cta--${variant}`]}`} onClick={onClick}>{label}</button>;
}
