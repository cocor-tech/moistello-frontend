"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post } from "@/lib/api-client";
import { useUIStore } from "@/stores/ui-store";
import {
  ApiResponse,
  Circle,
  CircleMember,
  CircleRound,
  Contribution,
} from "@/types";

function extractErrorMessage(err: unknown, fallback: string): string {
  const apiErr = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
  if (apiErr) return apiErr;
  if (err instanceof Error) return err.message;
  return fallback;
}

interface CircleFilters {
  search?: string;
  status?: string;
  type?: string;
  currency?: string;
  page?: number;
  limit?: number;
  organizerId?: string;
  sort?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

interface CreateCirclePayload {
  name: string;
  description?: string;
  communityId?: string;
  circleType: string;
  payoutType: string;
  contributionAmount: number;
  currency: string;
  frequency: string;
  maxMembers: number;
  minMoiScore?: number;
  collateralPercent?: number;
  lateFeePercent: number;
  gracePeriodHours: number;
  maxStrikes: number;
  startDate: string;
  requiresInvite?: boolean;
}

interface JoinCirclePayload {
  userId?: string;
}

interface ContributePayload {
  amount: number;
  roundNumber?: number;
}

function normalizeCircle(c: Record<string, unknown>): Circle {
  const out: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(c)) {
    // Convert sql.NullString {String, Valid} → raw string or null
    if (val && typeof val === "object" && "Valid" in val && "String" in val) {
      out[key] = (val as { String: string }).String || null
    } else if (val && typeof val === "object" && "Valid" in val && "Time" in val) {
      // Convert sql.NullTime {Time, Valid} → ISO string or null
      out[key] = (val as { Time: string }).Time || null
    } else {
      out[key] = val
    }
  }
  return out as unknown as Circle
}

export function useCircles(filters?: CircleFilters) {
  return useQuery({
    queryKey: ["circles", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.set("search", filters.search);
      if (filters?.status) params.set("status", filters.status);
      if (filters?.type) params.set("type", filters.type);
      if (filters?.currency) params.set("currency", filters.currency);
      if (filters?.page) params.set("page", String(filters.page));
      if (filters?.limit) params.set("limit", String(filters.limit));
      if (filters?.organizerId) params.set("organizerId", filters.organizerId);
      if (filters?.sort) params.set("sort", filters.sort);
      if (filters?.sortBy) params.set("sortBy", filters.sortBy);
      if (filters?.sortOrder) params.set("sortOrder", filters.sortOrder);

      const query = params.toString();
      const url = `/circles${query ? `?${query}` : ""}`;
      const response = await get<ApiResponse<{ circles: Circle[] }>>(url);

      return {
        circles: (response.data?.circles ?? []).map((c: unknown) => normalizeCircle(c as Record<string, unknown>)),
        meta: response.meta ?? {
          page: filters?.page ?? 1,
          limit: filters?.limit ?? 20,
          total: 0,
          totalPages: 0,
        },
      };
    },
  });
}

export function useCircle(id: string) {
  return useQuery({
    queryKey: ["circle", id],
    queryFn: async () => {
      const response = await get<ApiResponse<{ circle: Circle }>>(`/circles/${id}`);
      const raw = response.data?.circle
      return raw ? normalizeCircle(raw as unknown as Record<string, unknown>) : null;
    },
    enabled: !!id,
  });
}

export function useStartCircle() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  return useMutation({
    mutationFn: (circleId: string) =>
      post<ApiResponse<{ success: boolean }>>(`/circles/${circleId}/start`),
    onSuccess: (_data, circleId) => {
      queryClient.invalidateQueries({ queryKey: ["circle", circleId] });
      queryClient.invalidateQueries({ queryKey: ["circles"] });
    },
    onError: (err) => {
      console.error("[useStartCircle] Failed to start circle:", err);
      addToast({
        type: "error",
        title: "Failed to start circle",
        description: extractErrorMessage(err, "Could not start circle. Please try again."),
      });
    },
  });
}

export function useCreateCircle() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  return useMutation({
    mutationFn: (payload: CreateCirclePayload) =>
      post<ApiResponse<Circle>>("/circles", payload, { _retry: true } as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circles"] });
    },
    onError: (err) => {
      console.error("[useCreateCircle] Failed to create circle:", err);
      addToast({
        type: "error",
        title: "Failed to create circle",
        description: extractErrorMessage(err, "Could not create circle. Please try again."),
      });
    },
  });
}

export function useJoinCircle() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  return useMutation({
    mutationFn: ({
      circleId,
      payload,
    }: {
      circleId: string;
      payload?: JoinCirclePayload;
    }) => post<ApiResponse<CircleMember>>(`/circles/${circleId}/join`, payload ?? {}),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["circle", variables.circleId] });
      queryClient.invalidateQueries({ queryKey: ["circle-members", variables.circleId] });
    },
    onError: (err) => {
      console.error("[useJoinCircle] Failed to join circle:", err);
      addToast({
        type: "error",
        title: "Failed to join circle",
        description: extractErrorMessage(err, "Could not join circle. Please try again."),
      });
    },
  });
}

export function useContribute(circleId: string) {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  return useMutation({
    mutationFn: (payload: ContributePayload) =>
      post<ApiResponse<Contribution>>(
        `/circles/${circleId}/contribute`,
        payload
      ),
    onMutate: async (newContribution) => {
      // Cancel any outgoing refetches so they do not overwrite the optimistic update.
      await queryClient.cancelQueries({ queryKey: ["circle", circleId] });
      await queryClient.cancelQueries({ queryKey: ["circle-rounds", circleId] });

      // Snapshot the current cache values so we can roll back on error.
      const previousCircle = queryClient.getQueryData<Circle | null>(["circle", circleId]);
      const previousRounds = queryClient.getQueryData<Contribution[]>(["circle-rounds", circleId]);

      // ── Stable temp id ────────────────────────────────────────────────────
      // Using crypto.randomUUID() (or a predictable prefix+timestamp fallback)
      // gives a stable id for the lifetime of this mutation, unlike the raw
      // `Date.now()` value which could collide under rapid firing.
      const tempId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? `optimistic-${crypto.randomUUID()}`
          : `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // ── Optimistic circle update ──────────────────────────────────────────
      if (previousCircle) {
        queryClient.setQueryData<Circle | null>(["circle", circleId], (old) => {
          if (!old) return old;
          return {
            ...old,
            totalContributions: (old.totalContributions ?? 0) + (newContribution.amount ?? 0),
          };
        });
      }

      // ── Optimistic rounds update ──────────────────────────────────────────
      // Use a clearly synthetic sentinel so optimistic rows are never confused
      // with server-confirmed rows.  The real userId is set once the server
      // responds and the query is invalidated/refetched.
      const optimisticUserId = "optimistic-pending";

      if (previousRounds) {
        const optimisticRound: Contribution = {
          id: tempId,
          circleId,
          userId: optimisticUserId,
          roundNumber: newContribution.roundNumber ?? previousCircle?.currentRound ?? 1,
          amount: newContribution.amount,
          status: "pending",
          onTime: true,
          createdAt: new Date().toISOString(),
        };
        queryClient.setQueryData<Contribution[]>(
          ["circle-rounds", circleId],
          (old) => [...(old ?? []), optimisticRound],
        );
      }

      // Return snapshot context for rollback.
      return { previousCircle, previousRounds };
    },
    onError: (err, _newContribution, context) => {
      // ── Reliable rollback ─────────────────────────────────────────────────
      // Restore regardless of whether snapshot values are non-null.  An
      // undefined context means onMutate never ran (e.g. synchronous throw
      // before any await), so we just invalidate to force a fresh fetch.
      if (context) {
        queryClient.setQueryData(["circle", circleId], context.previousCircle ?? null);
        queryClient.setQueryData(["circle-rounds", circleId], context.previousRounds ?? []);
      } else {
        // Fallback: force a refetch so the UI is not stuck on stale data.
        queryClient.invalidateQueries({ queryKey: ["circle", circleId] });
        queryClient.invalidateQueries({ queryKey: ["circle-rounds", circleId] });
      }

      console.error("[useContribute] Failed to contribute:", err);
      addToast({
        type: "error",
        title: "Failed to contribute",
        description: extractErrorMessage(err, "Could not submit contribution. Please try again."),
      });
    },
    onSuccess: (_data, _variables, _context) => {
      // ── Single invalidation path ──────────────────────────────────────────
      // Invalidate only on success so the server response replaces the
      // optimistic entry.  onSettled previously ran invalidations on BOTH
      // success and error paths, causing a double-invalidation on success
      // (onSuccess would have been added later) and masking rollbacks on error.
      queryClient.invalidateQueries({ queryKey: ["circle", circleId] });
      queryClient.invalidateQueries({ queryKey: ["circle-rounds", circleId] });
    },
    // onSettled intentionally omitted: invalidation is handled exclusively in
    // onSuccess above and rollback + toast in onError, so there is no shared
    // teardown logic that needs to run unconditionally.
  });
}

export function useCircleMembers(circleId: string) {
  return useQuery({
    queryKey: ["circle-members", circleId],
    queryFn: async () => {
      const response = await get<ApiResponse<{ members: CircleMember[] }>>(
        `/circles/${circleId}/members`
      );
      return response.data?.members ?? [];
    },
    enabled: !!circleId,
  });
}

export function useCircleRounds(circleId: string) {
  return useQuery({
    queryKey: ["circle-rounds", circleId],
    queryFn: async () => {
      const response = await get<
        ApiResponse<{
          rounds: CircleRound[]
          currentRound: number
          totalMembers: number
        }>
      >(
        `/circles/${circleId}/rounds`
      );
      return response.data?.rounds ?? [];
    },
    enabled: !!circleId,
  });
}
