import { useEffect, useState } from 'react';
import styles from './TutorialSliderItem.module.scss';
import { StyledText } from '~/components/texts/StyledText.tsx';

interface ITutorialSliderItem {
  image?: string | null;
  title: string;
  description?: string;
  index?: number;
}

export function TutorialSliderItem({ image, title, description, index = 0 }: ITutorialSliderItem) {
  const hasImageUrl = !!image && image.trim().length > 0;
  const [broken, setBroken] = useState(false);

  // Reset the broken flag when the URL itself changes (e.g. CAPE refresh).
  useEffect(() => { setBroken(false); }, [image]);

  const showImage = hasImageUrl && !broken;

  return (
    <div className={styles.tutorialSliderItem}>
      {showImage
        ? <img className={styles.visual} src={image as string} alt="" onError={() => setBroken(true)} />
        : (
          <div className={styles.fallbackVisual} data-variant={index % 3} aria-hidden>
            <span className={styles.fallbackBadge} />
            <span className={styles.fallbackCard} />
            <span className={styles.fallbackStripe} />
          </div>
        )}
      <div className={styles.copy}>
        <StyledText type={'title'} marginTop={16} alternate>{title}</StyledText>
        {description && <StyledText type={'description'} marginTop={8} alternate>{description}</StyledText>}
      </div>
    </div>
  );
}
