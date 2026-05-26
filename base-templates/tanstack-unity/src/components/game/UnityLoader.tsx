import { useLoaderData } from '@tanstack/react-router';
import styles from './UnityLoader.module.scss';
import type { IStyledProps } from '~/interfaces/IComponentProps.ts';
import { mergeClasses } from '~/utils/Helper.ts';
import { StyledSpinner } from '~/components/StyledSpinner.tsx';
import { StyledText } from '~/components/texts/StyledText.tsx';
import { TextScroller } from '~/components/texts/TextScroller.tsx';

// Minimal fallback shown while Unity switches scenes. Full loading videos live
// on the optional /loading-video page, not in this in-game handoff overlay.
export function UnityLoader({ className }: IStyledProps) {
  const { copy, loading } = useLoaderData({ from: '__root__' });
  const descriptions = copy.loading.descriptions.filter((d) => typeof d === 'string' && d.trim().length > 0);
  return (
    <div className={mergeClasses(styles.unityLoader, className)}>
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
