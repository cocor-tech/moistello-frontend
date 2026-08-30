"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation, OPTIMISTIC_PENDING_USER_ID } from "./use-optimistic-mutation";
import { get, post } from "@/lib/api-client";
import { useUIStore } from "@/stores/ui-store";
import type { ApiResponse, Contribution } from "@/types";

interface ContributionFilters {
  search?: string;
  circleId?: string;
  amount?: string;
  date?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

interface CreateContributionPayload {
  circleId: string;
  amount: number;
  roundNumber?: number;
}

export function useContributions(filters?: ContributionFilters) {
  return useQuery({
    queryKey: ["contributions", filters ?? {}],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.set("search", filters.search);
      if (filters?.circleId) params.set("circleId", filters.circleId);
      if (filters?.amount) params.set("amount", filters.amount);
      if (filters?.date) params.set("date", filters.date);
      if (filters?.sort) params.set("sort", filters.sort);
      if (filters?.page) params.set("page", String(filters.page));
      if (filters?.limit) params.set("limit", String(filters.limit));

      const query = params.toString();
      const url = `/contributions${query ? `?${query}` : ""}`;
      const response = await get<ApiResponse<{ contributions?: Contribution[]; summary?: any }>>(url);

      const contributions = response.data?.contributions ?? (
        Array.isArray(response.data) ? response.data : []
      );

      return {
        contributions,
        summary: response.data?.summary ?? null,
        meta: response.meta ?? {
          page: filters?.page ?? 1,
          limit: filters?.limit ?? 20,
          total: contributions.length,
          totalPages: 1,
        },
      };
    },
  });
}

export function useCreateContribution() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  return useOptimisticMutation<CreateContributionPayload, Contribution>({
    mutationFn: async (payload) => {
      const response = await post<ApiResponse<Contribution>>("/contributions", payload);
      return response.data as Contribution;
    },
    queryKeys: [["contributions"]],
    dedupeKey: (vars) => `create-contribution-${vars.circleId}-${vars.amount}`,
    applyOptimistic: (variables, tempId, qc) => {
      qc.setQueriesData({ queryKey: ["contributions"] }, (old: any) => {
        if (!old) return old;
        const newContrib: Contribution = {
          id: tempId,
          circleId: variables.circleId,
          userId: OPTIMISTIC_PENDING_USER_ID,
          roundNumber: variables.roundNumber ?? 1,
          amount: variables.amount,
          status: "pending",
          onTime: true,
          createdAt: new Date().toISOString(),
        };
        if (Array.isArray(old.contributions)) {
          return {
            ...old,
            contributions: [newContrib, ...old.contributions],
          };
        }
        if (Array.isArray(old)) {
          return [newContrib, ...old];
        }
        return old;
      });
    },
    onSuccess: () => {
      addToast({
        type: "success",
        title: "Contribution added",
        description: "Your contribution has been created successfully.",
      });
    },
    onError: (err) => {
      console.error("[useCreateContribution] Failed:", err);
      addToast({
        type: "error",
        title: "Failed to add contribution",
        description: "Could not create contribution. Please try again.",
      });
    },
  });
}
