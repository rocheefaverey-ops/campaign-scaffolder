import { useLoaderData } from '@tanstack/react-router';
import styles from './UnityLoader.module.scss';
import type { IStyledProps } from '~/interfaces/IComponentProps.ts';
import { mergeClasses } from '~/utils/Helper.ts';
import { StyledSpinner } from '~/components/StyledSpinner.tsx';
import { StyledText } from '~/components/texts/StyledText.tsx';
import { TextScroller } from '~/components/texts/TextScroller.tsx';

// Everything visible on this loading screen is CAPE-configurable:
//   loading.logo               → general.loading.logo        (overlay logo asset)
//   loading.backgroundUrl      → general.loading.background  (image or video)
//                                or files.video.loadingVideo (fallback)
//   loading.title              → loading.title               (multilang text)
//   loading.descriptions[]     → loading.description1/2/3    (multilang text)
// If no CAPE media is configured, keep this screen minimal. It often appears
// for less than a second between tutorial and gameplay, so a placeholder image
// is more distracting than helpful.
export function UnityLoader({ className }: IStyledProps) {
  const { copy, loading } = useLoaderData({ from: '__root__' });
  const descriptions = copy.loading.descriptions.filter((d) => typeof d === 'string' && d.trim().length > 0);
  return (
    <div className={mergeClasses(styles.unityLoader, className)}>
      {loading.backgroundUrl && (
        loading.isBackgroundVideo
          ? <video src={loading.backgroundUrl} className={styles.background} autoPlay muted loop playsInline aria-hidden />
          : <div className={styles.background} style={{ backgroundImage: `url(${loading.backgroundUrl})` }} aria-hidden />
      )}

      <div className={styles.content}>
        {loading.logoUrl && (
          <img src={loading.logoUrl} alt={'logo'} className={styles.logo} />
        )}

        <StyledSpinner color={'white'} className={styles.spinner} />

        {copy.loading.title && (
          <StyledText type={'title'} className={styles.title} alternate>{copy.loading.title}</StyledText>
        )}

        {descriptions.length > 0 && (
          <TextScroller lines={descriptions} className={styles.scroller} />
        )}
      </div>
    </div>
  );
}
