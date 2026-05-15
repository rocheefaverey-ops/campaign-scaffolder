import { Link } from '@tanstack/react-router';
import styles from './FieldBottomLink.module.scss';
import type { IStyledProps } from '~/interfaces/IComponentProps.ts';
import type { TextAlignment } from '~/components/texts/StyledText.tsx';
import type { IFormFieldBottomLink } from '~/interfaces/form/IFormField.ts';
import { StyledText } from '~/components/texts/StyledText.tsx';
import { mergeClasses } from '~/utils/Helper.ts';

type IFieldBottomLink = IStyledProps & IFormFieldBottomLink & {
  alignment?: TextAlignment;
};

export function FieldBottomLink({ label, link, alignment, className }: IFieldBottomLink) {
  const labelComponent = <StyledText className={styles.label} type={'caption'} alignment={alignment}>{label}</StyledText>;
  if (typeof link === 'string') {
    return (
      <Link to={link} target={'_blank'} className={mergeClasses(styles.fieldBottomLink, className)}>{labelComponent}</Link>
    );
  } else {
    return (
      <Link {...link} className={mergeClasses(styles.fieldBottomLink, className)}>{labelComponent}</Link>
    );
  }
}
