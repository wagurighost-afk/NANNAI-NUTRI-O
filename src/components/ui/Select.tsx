import { type SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, ...props }, ref) => (
    <label className="flex w-full flex-col gap-1.5">
      {label && <span className="text-sm font-medium text-ink">{label}</span>}
      <select
        ref={ref}
        className={cn(
          'h-11 w-full rounded-xl border border-cream-300 bg-white/90 px-3.5 text-sm text-ink outline-none transition focus:border-olive-400 focus:ring-2 focus:ring-olive-200',
          error && 'border-wine-400',
          className,
        )}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-wine-600">{error}</span>}
    </label>
  ),
);

Select.displayName = 'Select';
