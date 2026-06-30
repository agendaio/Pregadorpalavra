import { cn } from '@/lib/utils';
import type { HTMLAttributes, ReactNode } from 'react';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-ink-200/70 bg-white shadow-soft',
        'dark:bg-ink-900/40 dark:border-ink-800',
        className,
      )}
      {...props}
    />
  );
}

interface SectionProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Section com cabeçalho padronizado (label tracking-wide uppercase). */
export function Section({ title, subtitle, action, children, className }: SectionProps) {
  return (
    <section className={cn('mb-6', className)}>
      {(title || action) && (
        <header className="mb-2 flex items-center justify-between px-1">
          {title && (
            <div>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500 dark:text-ink-400">
                {title}
              </h2>
              {subtitle && (
                <p className="mt-0.5 text-xs text-ink-400 dark:text-ink-500">{subtitle}</p>
              )}
            </div>
          )}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

interface PillProps {
  active?: boolean;
  count?: number;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

/** Pill de filtro (estilo iOS segmented control compact). */
export function Pill({ active, count, children, onClick, className }: PillProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 h-8 text-[13px] font-medium transition-all',
        'active:scale-95',
        active
          ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-950'
          : 'bg-ink-100 text-ink-700 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700',
        className,
      )}
    >
      {children}
      {count !== undefined && (
        <span
          className={cn(
            'rounded-full px-1.5 text-[11px] font-medium tabular-nums',
            active ? 'bg-white/20 text-white dark:bg-ink-950/20 dark:text-ink-950' : 'bg-ink-200 text-ink-600 dark:bg-ink-700 dark:text-ink-300',
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
