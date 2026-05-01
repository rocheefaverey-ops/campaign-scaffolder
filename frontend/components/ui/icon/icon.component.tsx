'use client';

import { ArrowEnter } from '@assets/icon';
import { useDictionary } from '@utils/hooks/use-dictionary.hook';

export type IconVariant = 'arrow-enter';

type Props = {
  icon: IconVariant;
  className?: string;
  decorative?: boolean;
  onClick?: (event: React.MouseEvent) => void;
  buttonClassName?: string;
};

const Icon: React.FC<Props> = ({ icon, className, decorative, onClick, buttonClassName }) => {
  const dictionary = useDictionary();
  let IconElement = null;
  let label = '';

  switch (icon) {
    case 'arrow-enter':
      IconElement = ArrowEnter;
      label = dictionary.icons.arrowEnter;
      break;

    default:
      console.warn(`Icon ${icon} not found`);
      break;
  }

  if (!IconElement) {
    return null;
  }

  if (onClick) {
    return (
      <button className={buttonClassName} type="button" aria-label={label} onClick={onClick}>
        <IconElement aria-hidden="true" focusable="false" className={className} />
      </button>
    );
  }

  return <IconElement aria-hidden={decorative ? 'true' : 'false'} aria-label={label} className={className} />;
};

export default Icon;
