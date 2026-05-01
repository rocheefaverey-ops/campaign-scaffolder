import { cn } from '@utils/helpers';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  /** Show a green checkmark when the field is valid */
  showValid?: boolean;
}

export default function FormInput({
  label,
  error,
  showValid,
  className,
  id,
  ...props
}: FormInputProps) {
  const inputId = id ?? props.name;

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={inputId}
        className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]"
      >
        {label}
        {props.required && (
          <span className="ml-1" style={{ color: 'var(--color-statusRed)' }}>*</span>
        )}
      </label>

      <div className="relative">
        <input
          id={inputId}
          className={cn('w-full transition-colors', className)}
          style={
            error
              ? { borderColor: 'var(--color-statusRed)' }
              : undefined
          }
          {...props}
        />
        {showValid && !error && (
          <span
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold"
            style={{ color: 'var(--text-primary)' }}
            aria-hidden
          >
            ✓
          </span>
        )}
      </div>

      {error && (
        <p className="text-xs" style={{ color: 'var(--color-statusRed)' }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
