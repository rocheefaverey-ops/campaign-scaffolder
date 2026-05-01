import styles from './StyledSpinner.module.scss';
import type { IStyledProps } from '~/interfaces/IComponentProps.ts';
import { mergeClasses } from '~/utils/Helper.ts';

interface IStyledSpinner extends IStyledProps {
  color: 'primary' | 'secondary' | 'white' | 'black';
  small?: boolean;
}

export function StyledSpinner({ color, small, className }: IStyledSpinner) {
  const colorClass = styles[color];
  const smallClass = small && styles.small;

  return (
    <div className={mergeClasses(styles.styledSpinner, colorClass, smallClass, className)} />
  );
}
