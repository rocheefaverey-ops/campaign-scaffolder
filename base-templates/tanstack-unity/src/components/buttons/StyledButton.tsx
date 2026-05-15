import styles from './StyledButton.module.scss';
import type { IBaseButton } from '~/components/buttons/BaseButton.tsx';
import { BaseButton } from '~/components/buttons/BaseButton.tsx';
import { mergeClasses } from '~/utils/Helper.ts';

export interface IStyledButton extends IBaseButton {
  alternate?: boolean;
}

export function StyledButton(props: IStyledButton) {
  const { alternate, className, children } = props;
  const alternateClass = alternate && styles.alternate;

  return (
    <BaseButton {...props} className={mergeClasses(styles.styledButton, alternateClass, className)}>{children}</BaseButton>
  );
}
