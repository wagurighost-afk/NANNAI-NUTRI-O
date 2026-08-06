import type { TextareaHTMLAttributes } from 'react';
import { cn } from '../../utils';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ className, label, error, ...props }: TextareaProps) {
  return (
    <label className="flex w-full flex-col gap-1.5">
      {label && <span className="text-sm font-medium text-ink">{label}</span>}
      <textarea
        className={cn(
          'min-h-24 w-full rounded-xl border border-cream-300 bg-white/90 px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-muted/50 focus:border-olive-400 focus:ring-2 focus:ring-olive-200',
          error && 'border-wine-400',
          className,
        )}
        {...props}
      />
      {error && <span className="text-xs text-wine-600">{error}</span>}
    </label>
  );
}
