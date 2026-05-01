import type { IFormFieldCheckbox, IFormFieldSelect, IFormFieldText } from '~/interfaces/form/IFormField.ts';

type IFormFieldTypes = IFormFieldText | IFormFieldCheckbox | IFormFieldSelect;

export type IFormData = Array<IFormFieldTypes>;
