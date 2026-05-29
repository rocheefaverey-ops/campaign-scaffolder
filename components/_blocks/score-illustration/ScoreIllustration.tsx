import styles from './ScoreIllustration.module.scss';

type Props = { image?: string; alt?: string };

export function ScoreIllustration({ image, alt = '' }: Props) {
  if (!image) return null;
  return <img className={styles.image} src={image} alt={alt} />;
}
