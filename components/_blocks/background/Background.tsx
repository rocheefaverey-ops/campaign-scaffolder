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

const DEFAULT_BG = '/assets/livewall-background-mobile.mp4';

export function Background({ source, children, mediaSlot, className = '', shellClassName = '', shade = true }: Props) {
  const hasMediaSlot = Boolean(mediaSlot);
  const resolved = source ?? (hasMediaSlot ? { kind: 'solid' as const, color: '#000' } : { kind: 'video' as const, url: DEFAULT_BG });
  const style: Record<string, string> = {};
  if (resolved.kind === 'solid') style.backgroundColor = resolved.color;
  if (resolved.kind === 'gradient') style.backgroundImage = resolved.gradient;
  const mediaUrl = 'url' in resolved ? resolved.url : '';
  const isVideo = resolved.kind === 'video' || (resolved.kind === 'image' && /\.(mp4|webm|mov)(\?.*)?$/i.test(mediaUrl));
  const showOwnMedia = !hasMediaSlot || source != null;

  return (
    <div className={`${styles.background} ${className}`} style={style}>
      {showOwnMedia && resolved.kind === 'image' && !isVideo && <img src={mediaUrl} alt="" className={`${styles.media} campaign-hero-bleed`} aria-hidden />}
      {showOwnMedia && mediaUrl && isVideo && <video src={mediaUrl} className={`${styles.media} campaign-hero-bleed`} autoPlay muted loop playsInline aria-hidden />}
      {mediaSlot}
      {shade && <div className={`${styles.shade} campaign-hero-shade`} aria-hidden />}
      <div className={`${styles.shell} campaign-shell ${shellClassName}`}>
        {children}
      </div>
    </div>
  );
}
