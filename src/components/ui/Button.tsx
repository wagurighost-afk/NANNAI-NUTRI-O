import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gold';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-wine-600 text-white hover:bg-wine-700 shadow-sm active:scale-[0.98]',
  secondary:
    'bg-olive-500 text-white hover:bg-olive-600 shadow-sm active:scale-[0.98]',
  gold: 'bg-gold-500 text-wine-900 hover:bg-gold-400 shadow-sm active:scale-[0.98]',
  outline:
    'border border-cream-300 bg-white/80 text-ink hover:bg-cream-50 hover:border-olive-300',
  ghost: 'text-ink-muted hover:bg-cream-200/60 hover:text-ink',
  danger: 'bg-wine-100 text-wine-700 hover:bg-wine-200',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm rounded-lg',
  md: 'h-11 px-4 text-sm rounded-xl',
  lg: 'h-12 px-6 text-base rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      fullWidth,
      disabled,
      children,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
);

Button.displayName = 'Button';
