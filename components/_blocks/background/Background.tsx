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

// Fallback when no source is configured: a brand-colour gradient built from the
// DesignTokenInjector CSS vars. Deliberately NOT a video file — bundled media is
// gitignored (*.mp4) so a file default would 404 in a fresh clone. The gradient
// always renders and adapts to the campaign's branding.
const DEFAULT_BG_GRADIENT =
  'radial-gradient(120% 120% at 30% 0%, var(--color-primary, #d1ff00) 0%, var(--color-secondary, #1a1a1a) 58%, #0e0e0e 100%)';

export function Background({ source, children, mediaSlot, className = '', shellClassName = '', shade = true }: Props) {
  const hasMediaSlot = Boolean(mediaSlot);
  const resolved = source ?? (hasMediaSlot ? { kind: 'solid' as const, color: '#000' } : { kind: 'gradient' as const, gradient: DEFAULT_BG_GRADIENT });
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
