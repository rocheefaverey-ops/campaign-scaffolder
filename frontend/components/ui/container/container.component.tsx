import React, { ReactNode } from 'react';
import classNames from 'classnames';

type Props = {
  children: ReactNode;
  className?: string;
};

const Container: React.FC<Props> = ({ children, className = '' }) => (
  <div className={classNames('max-w-[1200px] w-full mx-auto my-0', className)}>{children}</div>
);

export default Container;
