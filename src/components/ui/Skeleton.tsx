import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-ink-200/70 dark:bg-ink-800',
        className,
      )}
      {...props}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-ink-200/80 bg-white p-3.5 dark:border-ink-800 dark:bg-ink-900/40">
      <div className="flex items-start gap-3">
        <Skeleton className="mt-1 h-7 w-7 rounded-lg flex-shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-3/5 rounded" />
            <Skeleton className="h-3.5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-3 w-2/5 rounded" />
          <Skeleton className="h-3 w-4/5 rounded" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-3 w-24 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-3 gap-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-2xl border border-ink-200/80 bg-white p-3 text-center dark:border-ink-800 dark:bg-ink-900/40">
          <Skeleton className="mx-auto h-4 w-4 rounded" />
          <Skeleton className="mx-auto mt-1 h-[18px] w-8 rounded" />
          <Skeleton className="mx-auto mt-0.5 h-3 w-14 rounded" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonAtalho() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-ink-200/80 bg-white p-3 dark:border-ink-800 dark:bg-ink-900/40">
      <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-24 rounded" />
        <Skeleton className="h-3 w-32 rounded" />
      </div>
    </div>
  );
}

export function SkeletonChat() {
  return (
    <div className="flex gap-2.5">
      <Skeleton className="h-7 w-7 rounded-lg flex-shrink-0" />
      <div className="min-w-0 max-w-[88%] space-y-1.5 rounded-2xl border border-ink-200/80 bg-white px-3.5 py-2.5 dark:border-ink-800 dark:bg-ink-900/40">
        <Skeleton className="h-3 w-full rounded" />
        <Skeleton className="h-3 w-4/5 rounded" />
        <Skeleton className="h-3 w-3/5 rounded" />
      </div>
    </div>
  );
}
