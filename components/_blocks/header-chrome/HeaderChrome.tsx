import type { ReactNode } from 'react';
import styles from './HeaderChrome.module.scss';

export type SlotKind = 'none' | 'menu' | 'help' | 'close' | 'back' | 'decorative-icon';

type Props = {
  leftSlot: SlotKind;
  rightSlot: SlotKind;
  onLeftClick?: () => void;
  onRightClick?: () => void;
  center?: ReactNode;
};

const SLOT_LABELS: Record<Exclude<SlotKind, 'none'>, string> = {
  menu: 'Menu',
  help: 'Help',
  close: 'Close',
  back: 'Back',
  'decorative-icon': '',
};

export function HeaderChrome({ leftSlot, rightSlot, onLeftClick, onRightClick, center }: Props) {
  return (
    <header className={`${styles.header} campaign-hero-header campaign-hero-header--with-close`}>
      <SlotButton kind={leftSlot} onClick={onLeftClick} side="left" />
      {center !== undefined && <div className={styles.center}>{center}</div>}
      <SlotButton kind={rightSlot} onClick={onRightClick} side="right" />
    </header>
  );
}

function SlotButton({ kind, onClick, side }: { kind: SlotKind; onClick?: () => void; side: 'left' | 'right' }) {
  if (kind === 'none') return <span className={styles.slotPlaceholder} aria-hidden />;
  const label = SLOT_LABELS[kind];
  return (
    <button
      type="button"
      className={`${styles.slot} ${styles[`slot--${kind}`]}`}
      onClick={onClick}
      aria-label={label || undefined}
      data-side={side}
    >
      <SlotIcon kind={kind} />
    </button>
  );
}

function SlotIcon({ kind }: { kind: Exclude<SlotKind, 'none'> }) {
  if (kind === 'decorative-icon') return <span className={styles.dot} aria-hidden />;
  if (kind === 'back') return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (kind === 'close') return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 7L17 17M17 7L7 17" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
  if (kind === 'help') return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M10 10C10 8.9 10.9 8 12 8C13.1 8 14 8.9 14 10C14 11 12.5 11.2 12.5 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16" r="0.5" fill="currentColor" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <line x1="4" y1="7" x2="20" y2="7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="4" y1="17" x2="16" y2="17" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
