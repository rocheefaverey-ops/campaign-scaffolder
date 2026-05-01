import styles from './SelectField.module.scss';
import type { IStyledProps } from '~/interfaces/IComponentProps.ts';
import type { IFormFieldSelect } from '~/interfaces/form/IFormField.ts';
import { useFieldContext } from '~/components/forms/DynamicForm.tsx';
import { mergeClasses } from '~/utils/Helper.ts';
import { FieldError } from '~/components/forms/parts/FieldError.tsx';
import { StyledText } from '~/components/texts/StyledText.tsx';
import IconDropdown from '~/assets/images/icons/icon-dropdown.svg';

export function SelectField({ name, label, placeholder, options, error, className }: IFormFieldSelect & IStyledProps) {
  const field = useFieldContext<string>();
  const hasError = !field.state.meta.isValid;
  const touchedClass = (field.state.meta.isPristine && !field.state.value) && styles.pristine;
  const errorClass = hasError && styles.error;

  // Generate option elements
  const optionsElements = Object.entries(options).map(([key, value]) =>
    <option key={key} value={key}>{value}</option>
  );

  return (
    <div className={mergeClasses(styles.fieldContainer, className)}>
      <label className={styles.selectField}>
        <StyledText type={'description'} alignment={'left'} marginBottom={6} alternate>{label}</StyledText>

        <div className={mergeClasses(styles.inputWrapper, errorClass)}>
          <select
            className={mergeClasses(touchedClass)}
            name={name}
            autoComplete={name}
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}>

            {placeholder !== undefined && <option value="" hidden>{placeholder}</option>}
            {optionsElements}
          </select>
          <img className={styles.inputIcon} src={IconDropdown} alt="dropdown" />
        </div>
      </label>

      <FieldError show={hasError} alignment={'left'}>{error}</FieldError>
    </div>
  );
}
