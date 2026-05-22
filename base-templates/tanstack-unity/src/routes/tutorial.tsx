import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import styles from './tutorial.module.scss';
import type { IContentSliderHandle } from '~/components/slider/ContentSlider.tsx';
import { ContentSlider } from '~/components/slider/ContentSlider.tsx';
import { PageContainer } from '~/components/containers/PageContainer.tsx';
import { loadTutorialData } from '~/loaders/TutorialLoader.ts';
import { IconButton } from '~/components/buttons/IconButton.tsx';
import { TutorialSliderItem } from '~/components/slider/tutorial/TutorialSliderItem.tsx';
import { StyledButton } from '~/components/buttons/StyledButton.tsx';
import LogoImage from '~/assets/images/logo.png';

export const Route = createFileRoute('/tutorial')({
  component: Tutorial,
  loader: async ({ context }) => await loadTutorialData(context.language),
});

function Tutorial() {
  const { copy, steps, screenLayout, heroUrl, logoUrl } = Route.useLoaderData();
  const router = useRouter();
  const nextRoute = '/loading-video';
  const isPending = false;
  const navigate = () => void router.navigate({ to: nextRoute as never, replace: true });
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

  if (screenLayout === 'fullBleedHero') {
    const currentStep = visibleSteps[activeIndex] ?? visibleSteps[0];
    const currentBg = currentStep?.image || heroUrl;
    const isVideoHero = !!currentBg && /\.(mp4|webm|mov)$/i.test(currentBg);

    return (
      <PageContainer className="campaign-screen--hero">
        {currentBg && (
          isVideoHero
            ? <video src={currentBg} className="campaign-hero-bleed" autoPlay muted loop playsInline aria-hidden />
            : <img src={currentBg} alt="" className="campaign-hero-bleed" aria-hidden />
        )}
        <div className="campaign-hero-shade" aria-hidden />

        <div className="campaign-shell">
          <header className="campaign-hero-header campaign-hero-header--with-close" style={{ animation: 'fadeIn 0.4s ease both' }}>
            <img src={logoUrl || LogoImage} alt="Logo" className="campaign-hero-logo" />
            <IconButton className={styles.heroSkip} icon={'close'} loading={isPending} onClick={navigate} />
          </header>

          <div className="campaign-stack campaign-hero-content" style={{ animation: 'fadeIn 0.32s ease both' }}>
            <p className="campaign-kicker">{copy.header || 'How to play'}</p>
            <h1 className="campaign-title campaign-title--compact">{currentStep?.title || copy.headline || 'Step 1'}</h1>
            {(currentStep?.description || copy.subline) && <p className="campaign-copy">{currentStep?.description || copy.subline}</p>}
          </div>

          <div className="campaign-actions" style={{ animation: 'fadeIn 0.4s 0.18s ease both' }}>
            <div className="campaign-pagination" role="tablist" aria-label="Tutorial progress">
              {visibleSteps.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === activeIndex}
                  aria-label={`Go to slide ${i + 1}`}
                  className={`campaign-pagination__dot${i === activeIndex ? ' is-active' : ''}`}
                  onClick={() => {
                    contentRef.current?.goToItem(i);
                    setActiveIndex(i);
                  }}
                />
              ))}
            </div>
            <StyledButton loading={isPending} onClick={onNext}>
              {isLastStep ? copy.cta || 'Start' : copy.ctaNext || 'Continue'}
            </StyledButton>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className={styles.tutorial}>
      <div className={styles.panel}>
        <IconButton className={styles.skip} icon={'close'} loading={isPending} onClick={navigate} />
        {copy.header && <h1 className={styles.header}>{copy.header}</h1>}
        <ContentSlider ref={contentRef} className={styles.slider} items={items} onIndexChange={setActiveIndex} />
        <StyledButton className={styles.button} loading={isPending} onClick={onNext}>
          {isLastStep ? copy.cta || 'Start' : copy.ctaNext || 'Next'}
        </StyledButton>
      </div>
    </PageContainer>
  );
}
