import type { ReactNode } from 'react';
import styles from './CardWrapper.module.scss';

type Props = {
  children?: ReactNode;
  styleMode?: 'card' | 'full-bleed';
  cardWidth?: 'with-margin' | 'edge-to-edge';
};

export function CardWrapper({ children, styleMode = 'card', cardWidth = 'with-margin' }: Props) {
  return (
    <section className={`${styles.wrap} ${styles[`wrap--${styleMode}`]} ${styles[`wrap--${cardWidth}`]}`}>
      {children}
    </section>
  );
}
