import type { LinkProps } from '@tanstack/react-router';
import type { z } from 'zod';

export interface IFormField<T> {
  name: string;
  label: string;
  error?: string;
  validator: z.ZodTypeAny;
  defaultValue: T
}

export interface IFormFieldBottomLink {
  label: string
  link: LinkProps | string;
}

export interface IFormFieldText extends IFormField<string> {
  type: 'text' | 'email' | 'password';
  placeholder?: string;
  linkTo?: string;
  bottomLink?: IFormFieldBottomLink;
}

export interface IFormFieldCheckbox extends IFormField<boolean> {
  type: 'checkbox';
  link?: Array<string> | string;
}

export interface IFormFieldSelect extends IFormField<string> {
  type: 'select';
  options: Record<string, string>;
  placeholder?: string;
}
