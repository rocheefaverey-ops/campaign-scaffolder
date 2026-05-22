import styles from './StyledButton.module.scss';
import type { IBaseButton } from '~/components/buttons/BaseButton.tsx';
import { BaseButton } from '~/components/buttons/BaseButton.tsx';
import { mergeClasses } from '~/utils/Helper.ts';

export type StyledButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'dark' | 'danger';

export interface IStyledButton extends IBaseButton {
  variant?: StyledButtonVariant;
  /** @deprecated use `variant="secondary"` instead. Kept so older call-sites keep working. */
  alternate?: boolean;
}

const VARIANT_CLASS: Record<StyledButtonVariant, string> = {
  primary:   styles.variantPrimary,
  secondary: styles.variantSecondary,
  tertiary:  styles.variantTertiary,
  dark:      styles.variantDark,
  danger:    styles.variantDanger,
};

export function StyledButton(props: IStyledButton) {
  const { variant, alternate, className, children } = props;
  const resolvedVariant: StyledButtonVariant = variant ?? (alternate ? 'secondary' : 'primary');

  return (
    <BaseButton {...props} className={mergeClasses(styles.styledButton, VARIANT_CLASS[resolvedVariant], className)}>
      {children}
    </BaseButton>
  );
}
