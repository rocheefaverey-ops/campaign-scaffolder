import type { ReactNode } from 'react';
import styles from './Background.module.scss';

export type BackgroundSource =
  | { kind: 'image'; url: string }
  | { kind: 'solid'; color: string }
  | { kind: 'gradient'; gradient: string };

type Props = {
  source?: BackgroundSource;
  children?: ReactNode;
};

export function Background({ source, children }: Props) {
  const style: Record<string, string> = {};
  if (source?.kind === 'image') style.backgroundImage = `url(${source.url})`;
  if (source?.kind === 'solid') style.backgroundColor = source.color;
  if (source?.kind === 'gradient') style.backgroundImage = source.gradient;

  return (
    <div className={styles.background} style={style}>
      {children}
    </div>
  );
}
