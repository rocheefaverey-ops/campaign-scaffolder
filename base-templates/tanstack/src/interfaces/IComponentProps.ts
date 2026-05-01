import type React from 'react';

export interface IDefaultProps {
  children?: React.ReactNode;
}

export interface IStyledProps {
  className?: string;
}

export type IFullProps = IDefaultProps & IStyledProps;
