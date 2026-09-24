/**
 * Centralized TanStack Query key factories.
 *
 * Every domain's query keys live here so invalidation and prefetch call
 * sites can share one source of truth instead of scattering string-array
 * literals (["circle", id], ["circles", filters], ...) across hooks and
 * pages. Add a factory here before introducing a new `useQuery` call.
 */

// Filter shapes are intentionally loose (not imported from the hooks that
// own them) so this module never has to import back from `src/hooks` —
// each factory only needs to know which filter fields affect the cache key.

export const queryKeys = {
  circles: {
    all: ["circles"] as const,
    list: (filters?: unknown) => ["circles", filters] as const,
    detail: (id: string) => ["circle", id] as const,
    members: (id: string) => ["circle-members", id] as const,
    rounds: (id: string) => ["circle-rounds", id] as const,
  },
  payouts: {
    all: ["payouts"] as const,
    list: (filters?: {
      page?: number
      limit?: number
      sortBy?: string
      sortDir?: string
      circleId?: string
      payoutType?: string
      dateFrom?: string
      dateTo?: string
    }) =>
      [
        "payouts",
        filters?.page,
        filters?.limit,
        filters?.sortBy,
        filters?.sortDir,
        filters?.circleId,
        filters?.payoutType,
        filters?.dateFrom,
        filters?.dateTo,
      ] as const,
    forCircle: (circleId: string, filters?: { page?: number; limit?: number }) =>
      ["circle-payouts", circleId, filters?.page, filters?.limit] as const,
  },
  reputation: {
    detail: (userId: string) => ["reputation", userId] as const,
  },
  communities: {
    all: ["communities"] as const,
    detail: (id: string) => ["community", id] as const,
    membership: (id: string) => ["community-membership", id] as const,
  },
  governance: {
    all: ["governance-proposals"] as const,
    list: (filters?: Record<string, unknown>) =>
      ["governance-proposals", filters] as const,
    detail: (id: string) => ["governance-proposal", id] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    archive: ["notifications", "archive"] as const,
  },
} as const
