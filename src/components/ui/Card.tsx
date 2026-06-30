import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-ink-200/70 bg-white shadow-soft transition-shadow hover:shadow-ring',
        className,
      )}
      {...props}
    />
  );
}