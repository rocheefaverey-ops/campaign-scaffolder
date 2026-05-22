import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import styles from './tutorial.module.scss';
import type { IContentSliderHandle } from '~/components/slider/ContentSlider.tsx';
import { ContentSlider } from '~/components/slider/ContentSlider.tsx';
import { PageContainer } from '~/components/containers/PageContainer.tsx';
import { loadTutorialData } from '~/loaders/TutorialLoader.ts';
import { useGameNavigation } from '~/hooks/useGameNavigation.ts';
import { IconButton } from '~/components/buttons/IconButton.tsx';
import { TutorialSliderItem } from '~/components/slider/tutorial/TutorialSliderItem.tsx';
import { StyledButton } from '~/components/buttons/StyledButton.tsx';
import { StyledText } from '~/components/texts/StyledText.tsx';

export const Route = createFileRoute('/tutorial')({
  component: Tutorial,
  loader: async ({ context }) => await loadTutorialData(context.language),
});

function Tutorial() {
  const { copy, steps } = Route.useLoaderData();
  const { isPending, navigate } = useGameNavigation();
  const contentRef = useRef<IContentSliderHandle>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const filledSteps = useMemo(
    () => steps.filter((step) => step.title || step.description || step.image),
    [steps]
  );
  const visibleSteps = filledSteps.length ? filledSteps : steps;
  const isLastStep = activeIndex >= visibleSteps.length - 1;

  const onNext = useCallback(() => {
    if (!isLastStep) {
      contentRef.current?.goToNext();
      setActiveIndex((index) => Math.min(index + 1, visibleSteps.length - 1));
    } else {
      navigate();
    }
  }, [isLastStep, navigate, visibleSteps.length]);

  const items = visibleSteps.map((step, i) => (
    <TutorialSliderItem
      key={i}
      index={i}
      title={step.title || copy.headline || `Step ${i + 1}`}
      description={step.description || copy.subline}
      image={step.image}
    />
  ));

  return (
    <PageContainer className={styles.tutorial}>
      <div className={styles.panel}>
        <IconButton className={styles.skip} icon={'close'} loading={isPending} onClick={navigate} />
        {copy.header && <StyledText type={'title'} className={styles.header}>{copy.header}</StyledText>}
        <ContentSlider ref={contentRef} className={styles.slider} items={items} onIndexChange={setActiveIndex} />
        <StyledButton className={styles.button} loading={isPending} onClick={onNext}>
          {isLastStep ? copy.cta || 'Start' : copy.ctaNext || 'Next'}
        </StyledButton>
      </div>
    </PageContainer>
  );
}
