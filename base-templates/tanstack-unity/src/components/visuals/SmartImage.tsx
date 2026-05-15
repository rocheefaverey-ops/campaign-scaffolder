import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './SmartVisual.module.scss';
import type { IStyledProps } from '~/interfaces/IComponentProps.ts';
import { mergeClasses } from '~/utils/Helper.ts';
import { SmartPlaceholder } from '~/components/visuals/SmartPlaceholder.tsx';

interface ISmartImage extends IStyledProps {
  src: string;
  alt: string;
  placeholder?: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  fadeDuration?: number;
  scaleMode?: 'cover' | 'contain';
}

export function SmartImage({ src, alt, placeholder, width, height, aspectRatio, fadeDuration = 0.25, scaleMode = 'cover', className }: ISmartImage) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [loading, setLoading] = useState(true);
  const loadingClass = useMemo(() => !loading && styles.loaded, [loading]);

  // Check if image is already loaded (from cache), and if so, trigger load handler
  useEffect(() => {
    if (imageRef.current?.complete) {
      setLoading(false);
    }
  }, []);

  // Callback for slow loading
  const onLoad = useCallback(() => {
    setLoading(false);
  }, []);

  return (
    <div className={mergeClasses(styles.smartVisual, styles.image, className)} style={{ width, height, aspectRatio }}>
      <SmartPlaceholder placeholder={placeholder} loading={loading} duration={fadeDuration} scaleMode={scaleMode} />

      <img
        ref={imageRef}
        className={mergeClasses(styles.content, loadingClass)}
        style={{ transitionDuration: `${fadeDuration}s`, objectFit: scaleMode }}
        src={src}
        alt={alt}
        onLoad={onLoad}
      />
    </div>
  );
}
