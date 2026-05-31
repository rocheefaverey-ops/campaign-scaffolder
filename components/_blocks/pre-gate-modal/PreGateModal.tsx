import { useEffect, useState } from 'react';
import styles from './PreGateModal.module.scss';

type Props = {
  kind?: 'age-18' | 'age-21' | 'confirm';
  title?: string;
  confirmLabel?: string;
  persistAcrossSession?: boolean;
};

const STORAGE_KEY = 'lw-pre-gate-cleared';

export function PreGateModal({ kind = 'age-18', title, confirmLabel = 'Continue', persistAcrossSession = true }: Props) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(!persistAcrossSession || window.sessionStorage.getItem(STORAGE_KEY) !== '1');
  }, [persistAcrossSession]);
  if (!open) return null;
  const fallbackTitle = kind === 'age-18' ? 'Are you 18 or older?' : kind === 'age-21' ? 'Are you 21 or older?' : 'Continue?';
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <section className={styles.panel}>
        <h2>{title ?? fallbackTitle}</h2>
        <button
          type="button"
          onClick={() => {
            if (persistAcrossSession) window.sessionStorage.setItem(STORAGE_KEY, '1');
            setOpen(false);
          }}
        >
          {confirmLabel}
        </button>
      </section>
    </div>
  );
}
