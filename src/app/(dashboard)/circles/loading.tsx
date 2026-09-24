import { CircleCardSkeleton } from "@/components/skeletons"

export default function Loading() {
  return (
    <div
      className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
      aria-label="Loading circles"
    >
      {Array.from({ length: 6 }, (_, i) => (
        <CircleCardSkeleton key={i} />
      ))}
    </div>
  )
}