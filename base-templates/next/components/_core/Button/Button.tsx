import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@utils/helpers';

const buttonVariants = cva(
  // ── Base ──────────────────────────────────────────────────────────────────
  [
    'relative inline-flex items-center justify-center',
    'min-h-[48px] rounded-full px-8 font-default font-bold',
    'text-sm uppercase tracking-wider',
    'transition-all duration-200 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
    'disabled:pointer-events-none disabled:opacity-40',
    'active:scale-[0.96]',
  ],
  {
    variants: {
      variant: {
        // Filled — primary brand colour
        primary:   'btn-primary',
        // Outlined — primary colour border & text, fills on hover
        secondary: 'btn-secondary',
        // Minimal — text only
        ghost:     'btn-ghost',
        // Destructive actions
        danger:    'btn-danger',
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
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      {...props}
    >
      {children}
    </button>
  );
}
