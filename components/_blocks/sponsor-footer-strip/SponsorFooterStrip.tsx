import styles from './SponsorFooterStrip.module.scss';

type Props = { text?: string; logo?: string };

export function SponsorFooterStrip({ text, logo }: Props) {
  if (!text && !logo) return null;
  return (
    <footer className={styles.strip}>
      {logo && <img src={logo} alt="" />}
      {text && <span>{text}</span>}
    </footer>
  );
}
