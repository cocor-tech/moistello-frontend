"use client"

import { useQuery } from "@tanstack/react-query"
import { get } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"
import type { ApiResponse, MoiScore } from "@/types"

// GET /users/:id/reputation is specified in BUILD-PLAN.md, but a working
// backend implementation is not confirmed in this codebase as of this PR.
export function useReputation(userId: string) {
  return useQuery({
    queryKey: queryKeys.reputation.detail(userId),
    queryFn: async () => {
      const response = await get<ApiResponse<{ reputation: MoiScore }>>(
        `/users/${userId}/reputation`,
      )
      return response.data?.reputation ?? null
    },
    enabled: !!userId,
    // Keep reputation data fresh for 60 seconds after it's fetched.
    // Without a staleTime the query is treated as immediately stale, which
    // causes a background refetch on every mount — including after a page
    // refresh — so the tier card briefly receives `undefined` and renders a
    // 0 % progress bar before the refetch resolves (issue #394).
    staleTime: 60_000,
    // Return the last successfully fetched value while a background refetch
    // is in flight so the progress bar never snaps to 0.
    placeholderData: (previousData) => previousData ?? undefined,
  })
}
