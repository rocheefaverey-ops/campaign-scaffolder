import { createFormHook, createFormHookContexts } from '@tanstack/react-form';
import { AnimatePresence, motion } from 'motion/react';
import { StyledText } from '../texts/StyledText';
import styles from './DynamicForm.module.scss';
import type { IFormData } from '~/interfaces/form/IFormData.ts';
import type { IStyledProps } from '~/interfaces/IComponentProps.ts';
import { TextField } from '~/components/forms/inputs/TextField.tsx';
import { SelectField } from '~/components/forms/inputs/SelectField.tsx';
import { CheckboxField } from '~/components/forms/inputs/CheckboxField.tsx';
import { StyledButton } from '~/components/buttons/StyledButton.tsx';
import { mergeClasses } from '~/utils/Helper.ts';

export const { fieldContext, formContext, useFieldContext } = createFormHookContexts();

const { useAppForm } = createFormHook({
  fieldComponents: {
    TextField,
    SelectField,
    CheckboxField,
  },
  formComponents: {
  },
  fieldContext,
  formContext,
});

interface IRegisterForm extends IStyledProps {
  formData: IFormData;
  buttonText: string;
  errorText?: string;
  loading?: boolean;
  onSubmit: (data: Record<string, unknown>) => void;
}

export function DynamicForm({ formData, buttonText, errorText, loading, onSubmit, className }: IRegisterForm) {
  const defaultObj: Record<string, unknown> = {};

  // Build default values
  const defaults = formData.reduce((acc, field) => {
    acc[field.name] = field.defaultValue;
    return acc;
  }, defaultObj);

  // Create form
  const form = useAppForm({
    defaultValues: defaults,
    onSubmit: ({ value }) => onSubmit(value),
  });

  return (
    <div className={mergeClasses(styles.dynamicForm, className)}>
      <AnimatePresence>
        {errorText &&
          <motion.div
            className={styles.formError}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}>

            <StyledText className={styles.error} type={'description'}>{errorText}</StyledText>
          </motion.div>
        }
      </AnimatePresence>

      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}>

        {formData.map((field) => {
          switch (field.type) {
            case 'select':
              return (
                <form.AppField key={field.name} name={field.name} validators={{ onChange: field.validator }}>
                  {(fieldProps) => <fieldProps.SelectField {...field} className={mergeClasses(styles.input, styles[field.type])} />}
                </form.AppField>
              );
            case 'checkbox':
              return (
                <form.AppField key={field.name} name={field.name} validators={{ onChange: field.validator }}>
                  {(fieldProps) => <fieldProps.CheckboxField {...field} className={mergeClasses(styles.input, styles[field.type])} />}
                </form.AppField>
              );
            default:
              return (
                <form.AppField
                  key={field.name}
                  name={field.name}
                  validators={{
                    ...(field.linkTo && {
                      onChangeListenTo: [field.linkTo],
                      onChangeAsyncDebounceMs: 1000,
                      onChangeAsync: ({ value, fieldApi }) => value && value !== fieldApi.form.getFieldValue(field.linkTo!) ? field.error : undefined,
                    }),
                    onBlur: field.validator,
                  }}>
                  {(fieldProps) =>
                    <fieldProps.TextField
                      {...field}
                      className={mergeClasses(styles.input, styles[field.type])}
                    />
                  }
                </form.AppField>
              );
          }
        })}

        <StyledButton marginTop={24} loading={loading} onClick={form.handleSubmit}>{buttonText}</StyledButton>
      </form>
    </div>
  );
}
