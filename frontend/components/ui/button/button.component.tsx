import React, { ReactNode } from 'react';
import Link from 'next/link';
import classNames from 'classnames';
import classes from './button.module.css';

type Props = {
  children: ReactNode;
  type?: Type;
  ctaLink?: string;
  target?: string;
  gtm?: string;
  className?: string;
  buttonElementType?: ButtonElementType;
  onClick?: () => void;
};

type Type = 'primary' | 'secondary' | 'tertiary';
type ButtonElementType = 'button' | 'submit' | 'reset';

const Button: React.FC<Props> = ({ children, target, type, gtm, ctaLink, buttonElementType = 'button', className = '', onClick }) => {
  let btnType;
  switch (type) {
    case 'secondary':
      btnType = classes['btn--secondary'];
      break;
    case 'tertiary':
      btnType = classes['btn--tertiary'];
      break;
    default:
      btnType = classes['btn--primary'];
  }

  const targetLink = ctaLink ? (ctaLink.match(/^(https?:\/\/)/) ? '_blank' : '_self') : '_self';

  return ctaLink ? (
    <Link href={ctaLink} target={target || targetLink} passHref id={gtm} className={classNames(btnType, className)}>
      {children}
    </Link>
  ) : (
    // eslint-disable-next-line react/button-has-type
    <button className={classNames(classes.btn, btnType, className)} type={buttonElementType} onClick={onClick}>
      {children}
    </button>
  );
};

export default Button;
