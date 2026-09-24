"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { SkeletonScreen } from "@/components/skeletons"

export default function Loading() {
  return (
    <SkeletonScreen className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center gap-8 p-6">
      <div className="space-y-3 text-center">
        <Skeleton variant="heading" className="mx-auto h-7 w-2/3" />
        <Skeleton variant="text" className="mx-auto w-1/2" />
      </div>
      <div className="w-full space-y-4">
        <div className="space-y-2">
          <Skeleton variant="text" className="w-1/4" />
          <Skeleton className="h-11 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton variant="text" className="w-1/4" />
          <Skeleton className="h-11 w-full" />
        </div>
        <Skeleton className="h-12 w-full" />
      </div>
    </SkeletonScreen>
  )
}