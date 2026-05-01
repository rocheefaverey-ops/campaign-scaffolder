import { AnimatePresence, motion } from 'motion/react';
import styles from './FieldError.module.scss';
import type { IFullProps } from '~/interfaces/IComponentProps.ts';
import type { TextAlignment } from '~/components/texts/StyledText.tsx';
import { mergeClasses } from '~/utils/Helper.ts';
import { StyledText } from '~/components/texts/StyledText.tsx';

interface IFieldError extends IFullProps {
  show: boolean;
  alignment?: TextAlignment;
}

export function FieldError({ show, alignment, className, children }: IFieldError) {
  return (
    <AnimatePresence>
      {show &&
        <motion.div
          className={mergeClasses(styles.fieldError, className)}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}>

          <StyledText className={styles.message} type={'caption'} alignment={alignment}>{children}</StyledText>
        </motion.div>
      }
    </AnimatePresence>
  );
}
