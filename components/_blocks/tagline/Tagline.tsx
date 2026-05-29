import styles from './Tagline.module.scss';

type Props = { text?: string };

export function Tagline({ text }: Props) {
  if (!text) return null;
  return <p className={styles.tagline}>{text}</p>;
}
