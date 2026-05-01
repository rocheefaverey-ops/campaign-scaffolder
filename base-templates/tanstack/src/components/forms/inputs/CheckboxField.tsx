import styles from './CheckboxField.module.scss';
import type { IStyledProps } from '~/interfaces/IComponentProps.ts';
import type { IFormFieldCheckbox } from '~/interfaces/form/IFormField.ts';
import { useFieldContext } from '~/components/forms/DynamicForm.tsx';
import { mergeClasses } from '~/utils/Helper.ts';
import { FieldError } from '~/components/forms/parts/FieldError.tsx';
import { LinkText } from '~/components/texts/LinkText.tsx';

export function CheckboxField({ name, label, link, error, className }: IFormFieldCheckbox & IStyledProps) {
  const field = useFieldContext<boolean>();
  const hasError = !field.state.meta.isValid;
  const errorClass = hasError && styles.error;

  return (
    <div className={mergeClasses(styles.fieldContainer, className)}>
      <label className={mergeClasses(styles.checkboxField, errorClass)}>
        <input
          name={name}
          type={'checkbox'}
          checked={field.state.value}
          onChange={(e) => field.handleChange(e.target.checked)}
        />

        <span className={styles.checkmark} />
        <LinkText className={styles.text} text={label} link={link} />
      </label>

      <FieldError show={!field.state.meta.isValid} alignment={'right'}>{error}</FieldError>
    </div>
  );
}
