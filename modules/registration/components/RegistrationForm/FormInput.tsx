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
      <label htmlFor={inputId} className="text-sm font-medium opacity-70">
        {label}
        {props.required && <span className="ml-1 text-red-400">*</span>}
      </label>

      <div className="relative">
        <input
          id={inputId}
          className={cn(
            'w-full rounded-xl border bg-white/10 px-4 py-3 text-white placeholder-white/30 transition-colors focus:outline-none focus:ring-2',
            error
              ? 'border-red-400 focus:ring-red-400/40'
              : showValid
                ? 'border-green-400 focus:ring-green-400/40'
                : 'border-white/20 focus:ring-[var(--color-primary)]/40',
            className,
          )}
          {...props}
        />
        {showValid && !error && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-green-400">
            ✓
          </span>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
