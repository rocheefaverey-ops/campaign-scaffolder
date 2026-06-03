import styles from './BrandChip.module.scss';

type Props = {
  image?: string;
  alt?: string;
  size?: 'sm' | 'md';
  position?: 'left' | 'center' | 'right';
};

export function BrandChip({ image, alt = '', size = 'md', position = 'center' }: Props) {
  if (!image) return null;
  return (
    <div className={`${styles.chip} ${styles[`chip--${size}`]} ${styles[`chip--${position}`]}`}>
      <img src={image} alt={alt} className="campaign-hero-logo" />
    </div>
  );
}
