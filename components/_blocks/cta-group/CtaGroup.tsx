import styles from './CtaGroup.module.scss';

export type CtaVariant = 'primary' | 'secondary' | 'tertiary' | 'dark' | 'danger' | 'icon-only';

export type CtaButton = {
  label: string;
  variant: CtaVariant;
  onClick: () => void;
  icon?: string;
};

type Props = {
  buttons: CtaButton[];
};

export function CtaGroup({ buttons }: Props) {
  return (
    <div className={styles.group}>
      {buttons.map((b, i) => (
        <button
          key={i}
          type="button"
          className={`${styles.btn} ${styles[`btn--${b.variant}`]}`}
          onClick={b.onClick}
          aria-label={b.variant === 'icon-only' ? b.label : undefined}
        >
          {b.variant === 'icon-only' && b.icon ? (
            <img src={b.icon} alt="" />
          ) : (
            b.label
          )}
        </button>
      ))}
    </div>
  );
}
