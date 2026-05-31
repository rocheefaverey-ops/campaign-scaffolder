import { useEffect, useState } from 'react';
import styles from './SkipControl.module.scss';

type Props = { label?: string; availableAfterMs?: number; onSkip?: () => void };

export function SkipControl({ label = 'Skip', availableAfterMs = 0, onSkip }: Props) {
  const [available, setAvailable] = useState(availableAfterMs <= 0);
  useEffect(() => {
    if (available) return;
    const t = window.setTimeout(() => setAvailable(true), availableAfterMs);
    return () => window.clearTimeout(t);
  }, [available, availableAfterMs]);
  if (!available) return null;
  return <button type="button" className={styles.skip} onClick={onSkip}>{label}</button>;
}
