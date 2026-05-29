import { useState } from 'react';
import styles from './AudioToggle.module.scss';

export function AudioToggle() {
  const [muted, setMuted] = useState(false);
  return (
    <button type="button" className={styles.button} onClick={() => setMuted((v) => !v)} aria-pressed={muted}>
      {muted ? 'Muted' : 'Sound'}
    </button>
  );
}
