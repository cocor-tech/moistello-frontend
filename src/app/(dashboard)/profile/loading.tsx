import { ProfileHeaderSkeleton } from "@/components/skeletons"

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading profile">
      <ProfileHeaderSkeleton />
    </div>
  )
}