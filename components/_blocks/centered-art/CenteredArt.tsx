import styles from './CenteredArt.module.scss';

type Props = {
  image?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg';
};

export function CenteredArt({ image, alt = '', size = 'md' }: Props) {
  if (!image) return null;
  return (
    <div className={`${styles.art} ${styles[`art--${size}`]}`}>
      <img src={image} alt={alt} />
    </div>
  );
}
