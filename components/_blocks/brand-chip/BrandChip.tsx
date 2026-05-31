import styles from './BrandChip.module.scss';

type Props = {
  image?: string;
  alt?: string;
  size?: 'sm' | 'md';
};

export function BrandChip({ image, alt = '', size = 'md' }: Props) {
  if (!image) return null;
  return (
    <div className={`${styles.chip} ${styles[`chip--${size}`]}`}>
      <img src={image} alt={alt} />
    </div>
  );
}
