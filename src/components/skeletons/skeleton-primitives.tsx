"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

interface SkeletonShellProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Accessible wrapper for skeleton screens. The container stays invisible to
 * assistive tech while the busy state is announced once via aria-busy; adding
 * `aria-live` here keeps loading announcements from being read repeatedly.
 */
export function SkeletonScreen({ className, children, ...props }: SkeletonShellProps) {
  return (
    <div
      className={cn("w-full", className)}
      aria-busy="true"
      aria-label="Loading"
      {...props}
    >
      {children}
    </div>
  );
}

export function SkeletonText({
  className,
  width = "w-full",
}: {
  className?: string;
  width?: string;
}) {
  return (
    <Skeleton
      variant="text"
      className={cn(width, className)}
    />
  );
}

/** Heading line + shimmering sub-line used at the top of skeleton screens. */
export function SkeletonHeading({
  className,
  titleWidth = "w-2/5",
}: {
  className?: string;
  titleWidth?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      <Skeleton variant="heading" className={titleWidth} />
      <Skeleton variant="text" className="w-3/4" />
    </div>
  );
}

/** Full-bleed banner placeholder for hero sections on marketing pages. */
export function SkeletonHero({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "gradient-bg-extended/20 relative overflow-hidden rounded-3xl p-10 md:p-16",
        className,
      )}
    >
      <Skeleton variant="circular" className="h-24 w-24 opacity-60" />
      <div className="mt-6 max-w-xl space-y-4">
        <Skeleton variant="heading" className="h-8 w-4/5" />
        <Skeleton variant="heading" className="h-8 w-3/5" />
        <SkeletonText className="mt-4 w-2/3" />
      </div>
      <div className="mt-8 flex gap-3">
        <Skeleton className="h-11 w-36" />
        <Skeleton className="h-11 w-28" />
      </div>
    </div>
  );
}

/** Row of stat/overview placeholders (3-up by default). */
export function SkeletonStatCards({
  count = 3,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
      data-testid="skeleton-stat-cards"
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="space-y-3 border border-border/60 p-5"
          data-testid="skeleton-stat"
        >
          <Skeleton variant="text" className="w-1/3" />
          <Skeleton variant="heading" className="h-8 w-1/2" />
          <Skeleton variant="text" className="w-2/3" />
        </div>
      ))}
    </div>
  );
}

/** Grid of content-card placeholders. */
export function SkeletonCardGrid({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-5 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
      data-testid="skeleton-card-grid"
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="space-y-4 border border-border/60 p-5"
          data-testid="skeleton-card"
        >
          <div className="flex items-center gap-3">
            <Skeleton variant="circular" className="h-10 w-10" />
            <SkeletonText className="w-1/2" />
          </div>
          <Skeleton variant="heading" className="h-5 w-3/4" />
          <SkeletonText />
          <SkeletonText className="w-2/3" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

/** Vertical list of rows (feeds, notifications, transactions). */
export function SkeletonListRows({
  count = 5,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)} data-testid="skeleton-list">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-border/50 py-4"
          data-testid="skeleton-row"
        >
          <Skeleton variant="circular" className="h-9 w-9" />
          <div className="flex-1 space-y-2">
            <SkeletonText className="w-1/2" />
            <SkeletonText className="w-2/3 opacity-60" />
          </div>
          <Skeleton variant="circular" className="h-6 w-6" />
        </div>
      ))}
    </div>
  );
}

/** Full-width table placeholder (transactions, members, governance). */
export function SkeletonTable({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("overflow-hidden border border-border/60", className)}
      data-testid="skeleton-table"
    >
      <div className="flex gap-4 border-b border-border/60 bg-muted/30 px-5 py-3">
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex gap-4 border-b border-border/40 px-5 py-4"
          data-testid="skeleton-table-row"
        >
          {Array.from({ length: columns }, (_, j) => (
            <Skeleton key={j} className={cn("h-4 flex-1", j % 3 === 0 && "w-1/4")} />
          ))}
        </div>
      ))}
    </div>
  );
}