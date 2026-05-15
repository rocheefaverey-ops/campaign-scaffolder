import styles from './IndicatorDots.module.scss';
import type { IStyledProps } from '~/interfaces/IComponentProps.ts';
import { mergeClasses } from '~/utils/Helper.ts';

interface IIndicatorDots extends IStyledProps {
  count: number;
  activeIndex: number;
}

export function IndicatorDots({ count, activeIndex, className }: IIndicatorDots) {
  const dots = [];

  // Generate dots
  for (let i = 0; i < count; i++) {
    dots.push(
      <div key={i} className={mergeClasses(styles.dot, i < activeIndex ? styles.passed : i === activeIndex ? styles.active : undefined)} />
    );
  }

  return (
    <div className={mergeClasses(styles.indicatorDots, className)}>
      <div className={styles.container}>
        {dots}
      </div>
    </div>
  );
}
