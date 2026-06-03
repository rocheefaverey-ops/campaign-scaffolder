import type { ReactNode } from 'react';
import styles from './Background.module.scss';

export type BackgroundSource =
  | { kind: 'image'; url: string }
  | { kind: 'video'; url: string }
  | { kind: 'solid'; color: string }
  | { kind: 'gradient'; gradient: string };

type Props = {
  source?: BackgroundSource;
  children?: ReactNode;
  /** Full-bleed slot rendered between the page background and the shell. Used
   *  by video pages so the VideoPlayer can fill the phone-frame interior
   *  instead of being constrained inside the 480px shell. */
  mediaSlot?: ReactNode;
  className?: string;
  shellClassName?: string;
  shade?: boolean;
};

export function Background({ source, children, mediaSlot, className = '', shellClassName = '', shade = true }: Props) {
  const style: Record<string, string> = {};
  if (source?.kind === 'solid') style.backgroundColor = source.color;
  if (source?.kind === 'gradient') style.backgroundImage = source.gradient;
  const mediaUrl = source && 'url' in source ? source.url : '';
  const isVideo = source?.kind === 'video' || (source?.kind === 'image' && /\.(mp4|webm|mov)(\?.*)?$/i.test(mediaUrl));

  return (
    <div className={`${styles.background} ${className}`} style={style}>
      {source?.kind === 'image' && !isVideo && <img src={mediaUrl} alt="" className={`${styles.media} campaign-hero-bleed`} aria-hidden />}
      {mediaUrl && isVideo && <video src={mediaUrl} className={`${styles.media} campaign-hero-bleed`} autoPlay muted loop playsInline aria-hidden />}
      {mediaSlot}
      {shade && <div className={`${styles.shade} campaign-hero-shade`} aria-hidden />}
      <div className={`${styles.shell} campaign-shell ${shellClassName}`}>
        {children}
      </div>
    </div>
  );
}
