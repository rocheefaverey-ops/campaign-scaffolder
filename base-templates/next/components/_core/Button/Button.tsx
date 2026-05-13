import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@utils/helpers';

const buttonVariants = cva(
  [
    'relative inline-flex items-center justify-center',
    'min-h-[48px] rounded-full px-8 font-default font-bold',
    'text-sm uppercase tracking-wider',
    'transition-[background-color,box-shadow,filter,opacity] duration-200 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
    'disabled:pointer-events-none disabled:opacity-40',
  ],
  {
    variants: {
      variant: {
        primary:   'btn-primary',
        secondary: 'btn-secondary',
        tertiary:  'btn-tertiary',
        dark:      'btn-dark',
        danger:    'btn-danger',

        // Backwards-compatible aliases used by older generated pages.
        ghost:     'btn-tertiary',
        ink:       'btn-dark',
      },
      size: {
        sm: 'min-h-[40px] px-5 text-xs',
        md: 'min-h-[48px] px-8 text-sm',
        lg: 'min-h-[56px] px-10 text-base',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export default function Button({
  className,
  variant,
  size,
  fullWidth,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      {...props}
    >
      {children}
    </button>
  );
}
