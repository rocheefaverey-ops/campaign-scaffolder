import styles from './IconButton.module.scss';
import type { IBaseButton } from '~/components/buttons/BaseButton.tsx';
import { BaseButton } from '~/components/buttons/BaseButton.tsx';
import { mergeClasses } from '~/utils/Helper.ts';
import IconClose from '~/assets/images/icons/icon-close.svg';
import IconMenu from '~/assets/images/icons/icon-menu.svg';

type IconType = 'close' | 'menu';

export interface IIconButton extends IBaseButton {
  icon: IconType;
}

const iconMap: Record<IconType, string> = {
  close: IconClose,
  menu: IconMenu,
};

export function IconButton(props: IIconButton) {
  const { icon, className } = props;
  return (
    <BaseButton {...props} className={mergeClasses(styles.iconButton, className)}>
      <img className={styles.icon} src={iconMap[icon]} alt={icon} />
    </BaseButton>
  );
}
