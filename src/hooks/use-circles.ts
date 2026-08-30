"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation, OPTIMISTIC_PENDING_USER_ID, createTempId } from "./use-optimistic-mutation";
import { get, post } from "@/lib/api-client";
import { useUIStore } from "@/stores/ui-store";
import { queryKeys } from "@/lib/query-keys";
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
    if (val && typeof val === "object" && "Valid" in val && "String" in val) {
      out[key] = (val as { String: string }).String || null
    } else if (val && typeof val === "object" && "Valid" in val && "Time" in val) {
      out[key] = (val as { Time: string }).Time || null
    } else {
      out[key] = val
    }
  }
  return out as unknown as Circle
}

export function useCircles(filters?: CircleFilters) {
  return useQuery({
    queryKey: queryKeys.circles.list(filters),
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
    queryKey: queryKeys.circles.detail(id),
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
      queryClient.invalidateQueries({ queryKey: queryKeys.circles.detail(circleId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.circles.all });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.circles.all });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.circles.detail(variables.circleId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.circles.members(variables.circleId) });
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
  const addToast = useUIStore((s) => s.addToast);

  return useOptimisticMutation<ContributePayload, Contribution>({
    mutationFn: async (payload) => {
      const response = await post<ApiResponse<Contribution>>(
        `/circles/${circleId}/contribute`,
        payload,
      );
      return response.data as Contribution;
    },
    queryKeys: [
      queryKeys.circles.detail(circleId),
      queryKeys.circles.rounds(circleId),
      ["contributions", circleId],
    ],
    dedupeKey: (vars) => `contribute-${circleId}-${vars.roundNumber ?? "current"}-${vars.amount}`,
    applyOptimistic: (variables, tempId, qc) => {
      const circleKey = queryKeys.circles.detail(circleId);
      const roundsKey = queryKeys.circles.rounds(circleId);

      const currentCircle = qc.getQueryData<Circle>(circleKey);
      if (currentCircle) {
        qc.setQueryData<Circle>(circleKey, {
          ...currentCircle,
          totalContributions: (currentCircle.totalContributions ?? 0) + variables.amount,
        });
      }

      const currentRounds = qc.getQueryData<CircleRound[]>(roundsKey) ?? [];
      const newRound: CircleRound = {
        id: tempId,
        circleId,
        userId: OPTIMISTIC_PENDING_USER_ID,
        roundNumber: variables.roundNumber ?? currentCircle?.currentRound ?? 1,
        amount: variables.amount,
        status: "pending",
        onTime: true,
        submittedAt: new Date().toISOString(),
      };
      qc.setQueryData<CircleRound[]>(roundsKey, [...currentRounds, newRound]);
    },
    onSuccess: () => {
      addToast({
        type: "success",
        title: "Contribution successful",
        description: "Your contribution has been recorded.",
      });
    },
    onError: (err) => {
      console.error("[useContribute] Failed to contribute:", err);
      addToast({
        type: "error",
        title: "Contribution failed",
        description: extractErrorMessage(err, "Could not record contribution. Please try again."),
      });
    },
  });
}
