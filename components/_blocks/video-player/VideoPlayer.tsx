import styles from './VideoPlayer.module.scss';

type Props = {
  src?: string;
  muted?: boolean;
  loop?: boolean;
  /** Fill the closest positioned ancestor instead of using min-height: 50vh.
   *  Used by video pages (loading-video / intro-video) when the VideoPlayer
   *  is rendered into Background's mediaSlot so it covers the phone-frame
   *  interior. */
  fullBleed?: boolean;
  onEnded?: () => void;
};

export function VideoPlayer({ src, muted = true, loop = false, fullBleed = false, onEnded }: Props) {
  const videoClass = fullBleed ? `${styles.video} ${styles.fullBleed}` : styles.video;
  const placeholderClass = fullBleed ? `${styles.placeholder} ${styles.fullBleed}` : styles.placeholder;
  if (!src) return <div className={placeholderClass}>Video</div>;
  // Advance on error too: a missing/unplayable source must never trap a
  // content-driven video page (intro-video has no skip/timer by design).
  return (
    <video className={videoClass} src={src} muted={muted} loop={loop} playsInline autoPlay onEnded={onEnded} onError={onEnded} />
  );
}
