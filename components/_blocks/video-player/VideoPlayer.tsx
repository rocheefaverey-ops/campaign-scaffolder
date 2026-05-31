import styles from './VideoPlayer.module.scss';

type Props = {
  src?: string;
  muted?: boolean;
  loop?: boolean;
  onEnded?: () => void;
};

export function VideoPlayer({ src, muted = true, loop = false, onEnded }: Props) {
  if (!src) return <div className={styles.placeholder}>Video</div>;
  return (
    <video className={styles.video} src={src} muted={muted} loop={loop} playsInline autoPlay onEnded={onEnded} />
  );
}
