import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@utils/helpers';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-full px-8 py-3 font-brand font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-[var(--color-primary)] text-[var(--color-secondary)] hover:brightness-110',
        secondary: 'bg-transparent border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-secondary)]',
        ghost: 'bg-transparent text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10',
      },
      size: {
        sm: 'px-5 py-2 text-sm',
        md: 'px-8 py-3 text-base',
        lg: 'px-10 py-4 text-lg',
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
  children,
  ...props
}: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {children}
    </button>
  );
}
