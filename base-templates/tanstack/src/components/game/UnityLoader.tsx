import { useLoaderData } from '@tanstack/react-router';
import styles from './UnityLoader.module.scss';
import type { IStyledProps } from '~/interfaces/IComponentProps.ts';
import { mergeClasses } from '~/utils/Helper.ts';
import { StyledSpinner } from '~/components/StyledSpinner.tsx';
import { StyledText } from '~/components/texts/StyledText.tsx';
import { TextScroller } from '~/components/texts/TextScroller.tsx';
import VisualImage from '~/assets/images/logo.png';
import { SmartImage } from '~/components/visuals/SmartImage.tsx';

export function UnityLoader({ className }: IStyledProps) {
  const { copy, logoPlaceholder } = useLoaderData({ from: '__root__' });
  return (
    <div className={mergeClasses(styles.unityLoader, className)}>
      <SmartImage src={VisualImage} alt={'logo'} width={240} aspectRatio={1} placeholder={logoPlaceholder} />
      <StyledSpinner color={'black'} className={styles.spinner} />
      <StyledText type={'title'} className={styles.title} alternate>{copy.loading.title}</StyledText>
      <TextScroller lines={copy.loading.descriptions} className={styles.scroller} />
    </div>
  );
}
