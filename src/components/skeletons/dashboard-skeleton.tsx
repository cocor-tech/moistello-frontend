"use client";

import {
  SkeletonScreen,
  SkeletonHeading,
  SkeletonStatCards,
  SkeletonCardGrid,
  SkeletonListRows,
  SkeletonTable,
} from "./skeleton-primitives";

/**
 * Composite dashboard fallback shown inside the app shell while page data is
 * streaming (slow networks, first paint). Matches the shared dashboard layout:
 * heading → stat strip → content grid → table.
 */
export function DashboardSkeleton() {
  return (
    <SkeletonScreen className="space-y-8 p-4 md:p-6">
      <div className="flex items-center justify-between gap-4">
        <SkeletonHeading />
        <div className="flex shrink-0 gap-3">
          <div className="h-9 w-9 rounded-full bg-muted" />
          <div className="h-9 w-9 rounded-full bg-muted" />
        </div>
      </div>

      <SkeletonStatCards count={4} />
      <SkeletonCardGrid count={3} />
      <SkeletonTable rows={4} columns={4} />
    </SkeletonScreen>
  );
}

/** Compact variant for detail pages (profile, single circle, settings). */
export function SkeletonDetailPage() {
  return (
    <SkeletonScreen className="space-y-8 p-4 md:p-6">
      <div className="flex items-center gap-5">
        <div className="h-16 w-16 rounded-full bg-muted" />
        <div className="flex-1">
          <SkeletonHeading />
        </div>
      </div>
      <SkeletonListRows count={4} />
      <SkeletonCardGrid count={2} />
    </SkeletonScreen>
  );
}

export { SkeletonTable };