import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const base =
  'w-full rounded-lg bg-transparent px-3 py-2 text-[15px] placeholder:text-ink-400 ' +
  'focus:outline-none focus:bg-ink-50/60 transition-colors duration-150';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(base, 'border border-ink-200/80 focus:border-ink-300', className)} {...props} />
  ),
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(base, 'border border-ink-200/80 focus:border-ink-300 resize-y min-h-[88px]', className)}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';

export function Label({
  children,
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        'text-[11px] font-medium uppercase tracking-[0.08em] text-ink-500',
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}