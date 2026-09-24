"use client";

import {
  SkeletonScreen,
  SkeletonHero,
  SkeletonCardGrid,
  SkeletonText,
  SkeletonHeading,
} from "./skeleton-primitives";

/**
 * Marketing/content page fallback: hero band, feature cards and text body.
 * Used by the app-root loading boundary so every public page streams a
 * skeleton instead of a blank flash on slow networks.
 */
export function MarketingSkeleton() {
  return (
    <SkeletonScreen className="space-y-12 py-8">
      <SkeletonHero />
      <div className="space-y-6">
        <div className="text-center">
          <SkeletonHeading className="mx-auto" titleWidth="w-1/3" />
        </div>
        <SkeletonCardGrid count={3} />
      </div>
      <div className="space-y-4">
        <SkeletonHeading titleWidth="w-1/4" />
        <SkeletonText />
        <SkeletonText className="w-5/6" />
        <SkeletonText className="w-2/3" />
      </div>
    </SkeletonScreen>
  );
}