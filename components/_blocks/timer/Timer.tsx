import { useEffect, useState } from 'react';
import styles from './Timer.module.scss';

type Props = { mode?: 'countdown' | 'countup'; durationSec?: number };

export function Timer({ mode = 'countdown', durationSec = 60 }: Props) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  const value = mode === 'countdown' ? Math.max(0, durationSec - elapsed) : elapsed;
  return <div className={styles.timer}>{value}</div>;
}
