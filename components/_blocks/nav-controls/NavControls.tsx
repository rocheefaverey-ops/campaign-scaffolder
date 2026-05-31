import styles from './NavControls.module.scss';

type Props = {
  nextLabel?: string;
  prevLabel?: string;
  showPrev?: boolean;
  onNext?: () => void;
  onPrev?: () => void;
};

export function NavControls({ nextLabel = 'Continue', prevLabel = 'Back', showPrev = false, onNext, onPrev }: Props) {
  return (
    <div className={styles.controls}>
      {showPrev && <button type="button" onClick={onPrev}>{prevLabel}</button>}
      <button type="button" onClick={onNext}>{nextLabel}</button>
    </div>
  );
}
