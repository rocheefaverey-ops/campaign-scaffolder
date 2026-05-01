import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useRef } from 'react';
import styles from './tutorial.module.scss';
import type { IContentSliderHandle } from '~/components/slider/ContentSlider.tsx';
import { ContentSlider } from '~/components/slider/ContentSlider.tsx';
import { PageContainer } from '~/components/containers/PageContainer.tsx';
import LogoVisual from '~/assets/images/logo.png';
import { loadTutorialData } from '~/loaders/TutorialLoader.ts';
import { useGameNavigation } from '~/hooks/useGameNavigation.ts';
import { IconButton } from '~/components/buttons/IconButton.tsx';
import { TutorialSliderItem } from '~/components/slider/tutorial/TutorialSliderItem.tsx';

export const Route = createFileRoute('/tutorial')({
  component: Tutorial,
  loader: async ({ context }) => await loadTutorialData(context.language),
});

function Tutorial() {
  const { steps } = Route.useLoaderData();
  const { isPending, navigate } = useGameNavigation();
  const contentRef = useRef<IContentSliderHandle>(null);

  // Click handler
  const onItemClicked = useCallback((index: number) => {
    if (index < steps.length - 1) {
      contentRef.current?.goToNext();
    } else {
      navigate();
    }
  }, []);

  // Build items
  const items = steps.map((step, i) =>
    <TutorialSliderItem key={i} image={LogoVisual} {...step} loading={isPending} onClick={() => onItemClicked(i)} />
  );

  // Render
  return (
    <PageContainer className={styles.tutorial}>
      <ContentSlider ref={contentRef} className={styles.slider} items={items} />
      <IconButton className={styles.skip} icon={'close'} loading={isPending} onClick={navigate} />
    </PageContainer>
  );
}
