import styles from './PageContainer.module.scss';
import type { IFullProps } from '~/interfaces/IComponentProps.ts';
import { mergeClasses } from '~/utils/Helper.ts';

interface IPageContainer extends IFullProps {
  disableTransition?: boolean;
}

export function PageContainer({ disableTransition, children, className }: IPageContainer) {
  const transitionStyle = disableTransition ? {} : { viewTransitionName: 'page' };
  return <div className={mergeClasses(styles.pageContainer, className)} style={transitionStyle}>{children}</div>;
}
