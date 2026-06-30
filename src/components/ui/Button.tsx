import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'subtle';
type Size = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm' | 'icon-lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  block?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-ink-900 text-white hover:bg-ink-800 active:bg-ink-700 dark:bg-white dark:text-ink-950 dark:hover:bg-ink-100',
  secondary:
    'bg-ink-100 text-ink-900 hover:bg-ink-200 active:bg-ink-300/80 dark:bg-ink-800 dark:text-ink-100 dark:hover:bg-ink-700',
  ghost:
    'text-ink-700 hover:bg-ink-100 active:bg-ink-200 dark:text-ink-200 dark:hover:bg-ink-800/60 dark:active:bg-ink-800',
  outline:
    'border border-ink-200 text-ink-700 hover:bg-ink-50 active:bg-ink-100 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-800/60',
  danger:
    'bg-accent text-white hover:bg-accent/90 active:bg-accent/80',
  subtle:
    'bg-ink-100/70 text-ink-700 hover:bg-ink-200/70 dark:bg-ink-800/60 dark:text-ink-200',
};

const sizes: Record<Size, string> = {
  sm:          'h-9 px-3 text-[13px] gap-1.5',
  md:          'h-11 px-4 text-[15px] gap-2',
  lg:          'h-12 px-5 text-[15px] gap-2.5',
  icon:        'h-11 w-11',
  'icon-sm':   'h-9 w-9',
  'icon-lg':   'h-12 w-12',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, block, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-medium tracking-[-0.005em]',
        'transition-[transform,background-color,color,box-shadow] duration-150 ease-out',
        'active:scale-[0.97]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400/40',
        'disabled:opacity-40 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        block && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        children
      )}
    </button>
  ),
);
Button.displayName = 'Button';
