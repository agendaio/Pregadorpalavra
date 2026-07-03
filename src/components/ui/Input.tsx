import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// text-[16px] (não 15px): abaixo de 16px o Safari iOS dá zoom automático
// ao focar o campo — ficava incômodo em qualquer tela com esse input.
const baseField =
  'w-full rounded-xl bg-white px-3.5 text-[16px] placeholder:text-ink-400 ' +
  'border border-ink-200/90 focus:border-ink-400 ' +
  'focus:ring-0 focus:outline-none ' +
  'transition-colors duration-150 ' +
  'dark:bg-ink-900/40 dark:border-ink-700 dark:focus:border-ink-500 dark:placeholder:text-ink-500';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(baseField, 'h-11', className)}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(baseField, 'py-3 resize-y min-h-[100px] leading-relaxed', className)}
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
        'text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500',
        'dark:text-ink-400',
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}

/**
 * Switch estilo iOS. Controlado via `checked` + `onChange`.
 */
interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
}
export function Switch({ checked, onChange, disabled, ariaLabel }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'relative inline-flex h-[28px] w-[50px] flex-shrink-0 items-center rounded-full transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400/40',
        'disabled:opacity-50 disabled:pointer-events-none',
        checked ? 'bg-emerald-500' : 'bg-ink-200 dark:bg-ink-700',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'inline-block h-[24px] w-[24px] transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-ios',
          checked ? 'translate-x-[24px]' : 'translate-x-[2px]',
        )}
      />
    </button>
  );
}
