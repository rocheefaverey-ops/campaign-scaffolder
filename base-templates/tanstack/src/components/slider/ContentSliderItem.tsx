import { useOnInView } from 'react-intersection-observer';
import styles from './ContentSlider.module.scss';
import type { IDefaultProps } from '~/interfaces/IComponentProps.ts';

export interface IContentSliderItem extends IDefaultProps {
  index: number;
  root: HTMLElement | null;
  onVisible: (index: number) => void;
}

export function ContentSliderItem({ index, root, onVisible, children }: IContentSliderItem) {
  const observerRef = useOnInView((inView) => {
    if (inView) {
      onVisible(index);
    }
  },
  { root, rootMargin: '0px', threshold: 0.5 });

  return (
    <div ref={observerRef} className={styles.item}>
      {children}
    </div>
  );
}
