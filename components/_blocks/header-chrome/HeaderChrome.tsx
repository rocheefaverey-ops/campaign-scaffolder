import styles from './HeaderChrome.module.scss';

export type SlotKind = 'none' | 'menu' | 'help' | 'close' | 'back' | 'decorative-icon';

type Props = {
  leftSlot: SlotKind;
  rightSlot: SlotKind;
  onLeftClick?: () => void;
  onRightClick?: () => void;
};

const SLOT_LABELS: Record<Exclude<SlotKind, 'none'>, string> = {
  menu: 'Menu',
  help: 'Help',
  close: 'Close',
  back: 'Back',
  'decorative-icon': '',
};

export function HeaderChrome({ leftSlot, rightSlot, onLeftClick, onRightClick }: Props) {
  return (
    <header className={styles.header}>
      <SlotButton kind={leftSlot} onClick={onLeftClick} side="left" />
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
    />
  );
}
