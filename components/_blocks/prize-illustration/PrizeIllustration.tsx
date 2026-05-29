import styles from './PrizeIllustration.module.scss';

type Props = { image?: string; alt?: string };

export function PrizeIllustration({ image, alt = '' }: Props) {
  if (!image) return null;
  return <img className={styles.image} src={image} alt={alt} />;
}
