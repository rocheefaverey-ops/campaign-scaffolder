import styles from './StyledText.module.scss';
import type { IFullProps } from '~/interfaces/IComponentProps.ts';
import { mergeClasses } from '~/utils/Helper.ts';

export type TextAlignment = 'left' | 'center' | 'right';

export interface IStyledText extends IFullProps {
  type: 'header' | 'title' | 'subtitle' | 'description' | 'caption';
  alignment?: TextAlignment;
  alternate?: boolean;
  marginTop?: number;
  marginBottom?: number;
}

export function StyledText({ className, type, alternate, alignment, marginTop, marginBottom, children }: IStyledText) {
  const typeClass = styles[type];
  const alignmentClass = alignment && styles[alignment];
  const alternateClass = alternate && styles.alternate;

  // Merge all classes together
  return <span className={mergeClasses(className, styles.styledText, typeClass, alternateClass, alignmentClass)} style={{ marginTop, marginBottom }}>{children}</span>;
}
