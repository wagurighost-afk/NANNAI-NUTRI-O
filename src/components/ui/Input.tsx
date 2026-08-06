import { type InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => (
    <label className="flex w-full flex-col gap-1.5">
      {label && (
        <span className="text-sm font-medium text-ink">{label}</span>
      )}
      <input
        ref={ref}
        id={id}
        className={cn(
          'h-11 w-full rounded-xl border border-cream-300 bg-white/90 px-3.5 text-sm text-ink outline-none transition placeholder:text-ink-muted/50 focus:border-olive-400 focus:ring-2 focus:ring-olive-200',
          error && 'border-wine-400 focus:border-wine-500 focus:ring-wine-100',
          className,
        )}
        {...props}
      />
      {error && <span className="text-xs text-wine-600">{error}</span>}
      {hint && !error && <span className="text-xs text-ink-muted">{hint}</span>}
    </label>
  ),
);

Input.displayName = 'Input';
