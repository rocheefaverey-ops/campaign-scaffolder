import { AnimatePresence, motion } from 'motion/react';
import styles from './SmartVisual.module.scss';

interface ISmartImage {
  placeholder?: string;
  loading: boolean;
  duration: number;
  scaleMode: 'cover' | 'contain';
}

export function SmartPlaceholder({ placeholder, loading, duration, scaleMode }: ISmartImage) {
  return (
    <AnimatePresence>
      {loading &&
        <motion.div
          className={styles.placeholder}
          style={placeholder ? { backgroundImage: `url(${placeholder})`, backgroundSize: scaleMode } : undefined}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration, ease: 'linear' }}
        />}
    </AnimatePresence>
  );
}
