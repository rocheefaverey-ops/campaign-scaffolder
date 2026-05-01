import styles from './TextField.module.scss';
import type { IStyledProps } from '~/interfaces/IComponentProps.ts';
import type { IFormFieldText } from '~/interfaces/form/IFormField.ts';
import { useFieldContext } from '~/components/forms/DynamicForm.tsx';
import { mergeClasses } from '~/utils/Helper.ts';
import { FieldError } from '~/components/forms/parts/FieldError.tsx';
import { StyledText } from '~/components/texts/StyledText.tsx';
import { FieldBottomLink } from '~/components/forms/parts/FieldBottomLink.tsx';

export function TextField({ type, name, label, placeholder, bottomLink, error, className }: IFormFieldText & IStyledProps) {
  const field = useFieldContext<string>();
  const hasError = !field.state.meta.isValid;
  const errorClass = hasError && styles.error;

  return (
    <div className={mergeClasses(styles.fieldContainer, className)}>
      <label className={mergeClasses(styles.textField, errorClass)}>
        <StyledText type={'description'} alignment={'left'} marginBottom={6} alternate>{label}</StyledText>
        <input
          type={type}
          name={name}
          autoComplete={name}
          value={field.state.value}
          placeholder={placeholder}
          onChange={(e) => field.handleChange(e.target.value)}
          onBlur={() => field.handleBlur()}
        />
      </label>

      {bottomLink && <FieldBottomLink {...bottomLink} alignment={'left'} className={styles.bottomLink} />}
      <FieldError show={hasError} alignment={'left'}>{error}</FieldError>
    </div>
  );
}
