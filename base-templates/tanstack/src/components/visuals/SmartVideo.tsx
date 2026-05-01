import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './SmartVisual.module.scss';
import type { IStyledProps } from '~/interfaces/IComponentProps.ts';
import { mergeClasses } from '~/utils/Helper.ts';

interface ISmartVideo extends IStyledProps {
  src: string;
  placeholder: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  playsInline?: boolean;
  fadeDuration?: number;
  scaleMode?: 'cover' | 'contain';
}

export function SmartVideo({ src, placeholder, width, height, aspectRatio, autoPlay, muted, loop, playsInline, fadeDuration = 0.2, scaleMode = 'cover', className }: ISmartVideo) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const loadingClass = useMemo(() => !loading && styles.loaded, [loading]);

  // Check directly if video is already loaded (from cache), and if so, trigger load handler
  useEffect(() => {
    if (videoRef.current && videoRef.current.readyState >= 3) {
      setLoading(false);
    }
  }, []);

  // Callback for slow loading
  const onCanPlay = useCallback(() => {
    setLoading(false);
  }, []);

  return (
    <div className={mergeClasses(styles.smartVisual, styles.video, className)} style={{ width, height, aspectRatio, backgroundImage: `url(${placeholder})` }}>
      <video
        ref={videoRef}
        className={mergeClasses(styles.content, loadingClass)}
        style={{ transitionDuration: `${fadeDuration}s`, objectFit: scaleMode }}
        src={src}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        playsInline={playsInline}
        disableRemotePlayback
        onCanPlay={onCanPlay}
      />
    </div>
  );
}
