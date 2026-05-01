import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import styles from './ContentSlider.module.scss';
import type { ReactNode, Ref } from 'react';
import type { IStyledProps } from '~/interfaces/IComponentProps.ts';
import { mergeClasses } from '~/utils/Helper.ts';
import { IndicatorDots } from '~/components/slider/IndicatorDots.tsx';
import { ContentSliderItem } from '~/components/slider/ContentSliderItem.tsx';
import { getPlatform } from '~/utils/Functions.ts';

export interface IContentSliderHandle {
  goToItem: (index: number) => void;
  goToNext: () => void;
  goToPrevious: () => void;
}

interface IContentSlider extends IStyledProps {
  ref: Ref<IContentSliderHandle>;
  items: Array<ReactNode>;
  onIndexChange?: (index: number) => void;
  infinite?: boolean;
}

const copyCount = getPlatform() === 'ios' ? 50 : 10;

export function ContentSlider({ ref, items, onIndexChange, infinite, className }: IContentSlider) {
  const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isJumpingRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const displayItems = useMemo(() => {
    if (!infinite || items.length === 0) return items;

    // Calculate how many full copies we need to reach copyCount
    const repeatCount = Math.ceil(copyCount / items.length);

    // Create repeated arrays for leading and trailing copies
    const repeatedItems = Array(repeatCount).fill(items).flat();
    const leadingCopies = repeatedItems.slice(-copyCount);
    const trailingCopies = repeatedItems.slice(0, copyCount);

    return [...leadingCopies, ...items, ...trailingCopies];
  }, [items]);

  const elements = useMemo(() => displayItems.map((item, index) =>
    <ContentSliderItem key={index} index={index} root={containerRef.current} onVisible={setActiveIndex}>{item}</ContentSliderItem>
  ), [displayItems]);

  // Set initial position
  useLayoutEffect(() => {
    if (infinite && containerRef.current) {
      const targetElement = getChild(copyCount);
      if (targetElement) {
        containerRef.current.scrollLeft = targetElement.offsetLeft - containerRef.current.offsetLeft;
      }
    }
  }, []);

  // True index getter
  const realIndex = useMemo(() => {
    if (!infinite || items.length === 0) {
      return activeIndex;
    }
    if (activeIndex < copyCount) {
      return ((activeIndex - copyCount) % items.length + items.length) % items.length;
    }
    if (activeIndex >= items.length + copyCount) {
      return (activeIndex - copyCount) % items.length;
    }
    return activeIndex - copyCount;
  }, [activeIndex]);

  // Helper to get a child element from the container
  const getChild = useCallback((index: number) => containerRef.current?.children[index] as HTMLElement | undefined, []);

  // Go to page
  const goToItem = useCallback((index: number) => {
    getChild(index)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  // Setup handler
  useImperativeHandle(ref, (): IContentSliderHandle => ({
    goToItem,
    goToNext: () => goToItem(activeIndex + 1),
    goToPrevious: () => goToItem(activeIndex - 1),
  }), [activeIndex]);

  // Listen for index changes
  useEffect(() => onIndexChange?.(realIndex), [realIndex, onIndexChange]);

  // Scroll handler for infinite scroll
  const onScroll = useCallback(() => {
    if (isJumpingRef.current || !containerRef.current) {
      return;
    }

    // Calculate reset thresholds
    const scrollLeft = containerRef.current.scrollLeft;
    const offsetWidth = containerRef.current.offsetWidth;
    const childCount = containerRef.current.children.length;
    const firstItem = getChild(1);
    const lastItem = getChild(childCount - 1);
    if (!firstItem || !lastItem) return;

    const firstItemOffset = firstItem.offsetLeft + firstItem.offsetWidth / 2 - offsetWidth / 2;
    const lastItemOffset = lastItem.offsetLeft + lastItem.offsetWidth / 2 - offsetWidth / 2;

    // If thresholds are crossed, reset position
    if (scrollLeft <= firstItemOffset || scrollLeft >= lastItemOffset) {
      containerRef.current.style.overflow = 'hidden';
      isJumpingRef.current = true;

      // Set position to the canonical item
      const canonicalIndex = copyCount + realIndex;
      const targetItem = getChild(canonicalIndex);
      if (targetItem) {
        containerRef.current.scrollLeft = targetItem.offsetLeft + targetItem.offsetWidth / 2 - offsetWidth / 2;
      }

      // Wait a few frames before restoring overflow (used 2, looked smoother)
      if (getPlatform() === 'ios') {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (containerRef.current) {
              containerRef.current.style.overflow = 'auto';
            }
            isJumpingRef.current = false;
          });
        });
      } else {
        containerRef.current.style.overflow = 'auto';
        isJumpingRef.current = false;
      }
    }
  }, [realIndex]);

  return (
    <div ref={rootRef} className={mergeClasses(styles.contentSlider, className)}>
      <div ref={containerRef} className={styles.container} onScroll={infinite ? onScroll : undefined}>
        {elements}
      </div>
      <IndicatorDots count={items.length} activeIndex={realIndex} />
    </div>
  );
}
