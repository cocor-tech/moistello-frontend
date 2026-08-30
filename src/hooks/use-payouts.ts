"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation, OPTIMISTIC_PENDING_USER_ID } from "./use-optimistic-mutation";
import { get, post } from "@/lib/api-client";
import { useUIStore } from "@/stores/ui-store";
import type { ApiResponse, Payout } from "@/types";

interface PayoutFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: string;
  circleId?: string;
  payoutType?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface CreatePayoutPayload {
  circleId: string;
  recipientId: string;
  amount: number;
  roundNumber: number;
  payoutType?: string;
}

export function usePayouts(filters?: PayoutFilters) {
  return useQuery({
    queryKey: ["payouts", filters ?? {}],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.page) params.set("page", String(filters.page));
      if (filters?.limit) params.set("limit", String(filters.limit));
      if (filters?.sortBy) params.set("sortBy", filters.sortBy);
      if (filters?.sortDir) params.set("sortDir", filters.sortDir);
      if (filters?.circleId) params.set("circleId", filters.circleId);
      if (filters?.payoutType) params.set("payoutType", filters.payoutType);
      if (filters?.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters?.dateTo) params.set("dateTo", filters.dateTo);

      const query = params.toString();
      const url = `/payouts${query ? `?${query}` : ""}`;
      const response = await get<ApiResponse<{ payouts?: Payout[] }>>(url);

      const payouts = response.data?.payouts ?? (
        Array.isArray(response.data) ? response.data : []
      );

      return {
        payouts,
        meta: response.meta ?? {
          page: filters?.page ?? 1,
          limit: filters?.limit ?? 20,
          total: payouts.length,
          totalPages: 1,
        },
      };
    },
  });
}

export function useCirclePayouts(circleId: string, filters?: Omit<PayoutFilters, "circleId">) {
  return useQuery({
    queryKey: ["circle-payouts", circleId, filters ?? {}],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.page) params.set("page", String(filters.page));
      if (filters?.limit) params.set("limit", String(filters.limit));
      if (filters?.sortBy) params.set("sortBy", filters.sortBy);
      if (filters?.sortDir) params.set("sortDir", filters.sortDir);
      if (filters?.payoutType) params.set("payoutType", filters.payoutType);

      const query = params.toString();
      const url = `/circles/${circleId}/payouts${query ? `?${query}` : ""}`;
      const response = await get<ApiResponse<{ payouts?: Payout[] }>>(url);

      const payouts = response.data?.payouts ?? (
        Array.isArray(response.data) ? response.data : []
      );

      return {
        payouts,
        meta: response.meta ?? {
          page: filters?.page ?? 1,
          limit: filters?.limit ?? 20,
          total: payouts.length,
          totalPages: 1,
        },
      };
    },
    enabled: !!circleId,
  });
}

export function useCreatePayout() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  return useOptimisticMutation<CreatePayoutPayload, Payout>({
    mutationFn: async (payload) => {
      const response = await post<ApiResponse<Payout>>("/payouts", payload);
      return response.data as Payout;
    },
    queryKeys: [["payouts"], ["circle-payouts"]],
    dedupeKey: (vars) => `create-payout-${vars.circleId}-${vars.roundNumber}`,
    applyOptimistic: (variables, tempId, qc) => {
      qc.setQueriesData({ queryKey: ["payouts"] }, (old: any) => {
        if (!old) return old;
        const newPayout: Payout = {
          id: tempId,
          circleId: variables.circleId,
          recipientId: variables.recipientId,
          roundNumber: variables.roundNumber,
          amount: variables.amount,
          feeAmount: 0,
          payoutType: (variables.payoutType as any) ?? "fixed",
          createdAt: new Date().toISOString(),
        };
        if (Array.isArray(old.payouts)) {
          return {
            ...old,
            payouts: [newPayout, ...old.payouts],
          };
        }
        if (Array.isArray(old)) {
          return [newPayout, ...old];
        }
        return old;
      });
      qc.setQueriesData({ queryKey: ["circle-payouts", variables.circleId] }, (old: any) => {
        if (!old) return old;
        const newPayout: Payout = {
          id: tempId,
          circleId: variables.circleId,
          recipientId: variables.recipientId,
          roundNumber: variables.roundNumber,
          amount: variables.amount,
          feeAmount: 0,
          payoutType: (variables.payoutType as any) ?? "fixed",
          createdAt: new Date().toISOString(),
        };
        if (Array.isArray(old.payouts)) {
          return {
            ...old,
            payouts: [newPayout, ...old.payouts],
          };
        }
        if (Array.isArray(old)) {
          return [newPayout, ...old];
        }
        return old;
      });
    },
    onSuccess: () => {
      addToast({
        type: "success",
        title: "Payout created",
        description: "The payout has been processed successfully.",
      });
    },
    onError: (err) => {
      console.error("[useCreatePayout] Failed:", err);
      addToast({
        type: "error",
        title: "Failed to create payout",
        description: "Could not create payout. Please try again.",
      });
    },
  });
}
