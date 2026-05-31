import styles from './StepIndicator.module.scss';

type Props = { count?: number; current?: number; style?: 'dots' | 'count' };

export function StepIndicator({ count = 3, current = 0, style = 'dots' }: Props) {
  if (style === 'count') return <p className={styles.count}>{current + 1} / {count}</p>;
  return (
    <div className={styles.dots} aria-label={`Step ${current + 1} of ${count}`}>
      {Array.from({ length: count }).map((_, index) => (
        <span key={index} className={index === current ? styles.active : undefined} />
      ))}
    </div>
  );
}
