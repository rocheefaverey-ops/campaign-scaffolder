import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import styles from './TextScroller.module.scss';
import type { IStyledProps } from '~/interfaces/IComponentProps.ts';
import { StyledText } from '~/components/texts/StyledText.tsx';
import { mergeClasses } from '~/utils/Helper.ts';

interface ITextScroller extends IStyledProps {
  lines: Array<string>;
}

// TODO: Replace animations with ViewTransition when supported
export function TextScroller({ lines, className }: ITextScroller) {
  const [activeIndex, setActiveIndex] = useState(0);

  // Cycle through lines
  useEffect(() => {
    const interval = setInterval(() => setActiveIndex((prev) => (prev + 1) % lines.length), 2000);
    return () => clearInterval(interval);
  }, [lines]);

  return (
    <div className={mergeClasses(styles.textScroller, className)}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={activeIndex} initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 1 }} transition={{ ease: [.47, 1.64, .41, .8], duration: 0.4 }}>
          <StyledText type={'description'} alternate>{lines[activeIndex]}</StyledText>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
