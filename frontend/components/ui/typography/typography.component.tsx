/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { ReactNode } from 'react';
import classNames from 'classnames';
import { type VariantProps } from 'class-variance-authority';
import { typographyVariants } from './data/typography.variants.data';
import { TypographyColor } from 'types/Typography';
import { typeMapping } from './data/typography.types.data';

type Props = {
  type?: keyof typeof typeMapping;
  color?: TypographyColor;
  weight?: string;
  size?: string;
  mobileSize?: string;
  setDangerouslyInnerHTML?: boolean;
  className?: string;
  family?: string;
  children: ReactNode;
  [key: string]: unknown;
};

const Typography: React.FC<Props & VariantProps<typeof typographyVariants>> = ({
  children,
  type = 'p',
  size,
  mobileSize,
  color,
  weight,
  setDangerouslyInnerHTML = false,
  className = '',
  family = 'default',
  ...props
}) => {
  const CustomTag = (typeMapping[type] ?? 'p') as any;

  // When mobileSize is not defined, it will use the same size as the desktop
  if (mobileSize === undefined) {
    mobileSize = size;
  }

  const styling = classNames(typographyVariants({ color, weight, size, mobileSize, family }), className);

  const content = setDangerouslyInnerHTML ? { dangerouslySetInnerHTML: { __html: children } } : { children };

  return <CustomTag {...props} className={styling} {...content} />;
};

export default Typography;
