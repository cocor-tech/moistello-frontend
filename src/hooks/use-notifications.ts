"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { logger } from "@/lib/logger";
import { get, patch, post } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Notification } from "@/types";

const NOTIFICATIONS_STALE_TIME = 30_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractNotifications(payload: unknown): Notification[] {
  if (Array.isArray(payload)) return payload as Notification[];

  const root = isRecord(payload) ? payload : undefined;
  const data = root?.data ?? payload;
  if (Array.isArray(data)) return data as Notification[];

  if (isRecord(data) && Array.isArray(data.notifications)) {
    return data.notifications as Notification[];
  }

  if (isRecord(root) && Array.isArray(root.notifications)) {
    return root.notifications as Notification[];
  }

  return [];
}

function computeUnreadCount(notifications: Notification[]): number {
  return notifications.filter((notification) => !notification.isRead).length;
}

async function fetchNotifications(): Promise<Notification[]> {
  const response = await get<unknown>("/notifications?limit=100");
  return extractNotifications(response);
}

async function fetchArchivedNotifications(): Promise<Notification[]> {
  const response = await get<unknown>("/notifications/archive?limit=100");
  return extractNotifications(response);
}

function isUnauthorizedError(error: unknown): boolean {
  return (
    isRecord(error) &&
    isRecord(error.response) &&
    error.response.status === 401
  );
}

function signalAuthRequired(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("auth:required"));
  }
}

function logMutationError(message: string, error: unknown): void {
  logger.warn(message, { error });
}

function restoreNotificationQuery(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  data: Notification[] | undefined,
): void {
  if (data) {
    queryClient.setQueryData(queryKey, data);
  } else {
    queryClient.removeQueries({ queryKey, exact: true });
  }
}

/** Shared active-notification query used by the page, badges, and mutations. */
export function useNotificationsQuery() {
  return useQuery({
    queryKey: queryKeys.notifications.all,
    queryFn: fetchNotifications,
    staleTime: NOTIFICATIONS_STALE_TIME,
  });
}

export function useArchivedNotificationsQuery() {
  return useQuery({
    queryKey: queryKeys.notifications.archive,
    queryFn: fetchArchivedNotifications,
    staleTime: NOTIFICATIONS_STALE_TIME,
  });
}

export function useUnreadCount(): number {
  const { data } = useNotificationsQuery();
  return data ? computeUnreadCount(data) : 0;
}

export function useMarkAsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => patch(`/notifications/${id}/read`),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all, exact: true });
      const previous = queryClient.getQueryData<Notification[]>(queryKeys.notifications.all);
      queryClient.setQueryData<Notification[]>(queryKeys.notifications.all, (old = []) =>
        old.map((notification) =>
          notification.id === id ? { ...notification, isRead: true } : notification,
        ),
      );
      return { previous };
    },
    onError: (error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.notifications.all, context.previous);
      }
      if (isUnauthorizedError(error)) signalAuthRequired();
      logMutationError("[notifications] Failed to mark notification as read", error);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all, exact: true });
    },
  });
}

export function useMarkAllAsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => patch("/notifications/read-all"),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all, exact: true });
      const previous = queryClient.getQueryData<Notification[]>(queryKeys.notifications.all);
      queryClient.setQueryData<Notification[]>(queryKeys.notifications.all, (old = []) =>
        old.map((notification) => ({ ...notification, isRead: true })),
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.notifications.all, context.previous);
      }
      if (isUnauthorizedError(error)) signalAuthRequired();
      logMutationError("[notifications] Failed to mark all notifications as read", error);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all, exact: true });
    },
  });
}

/**
 * Composite compatibility hook for the notification pages.
 *
 * The active query is deliberately shared with useUnreadCount through the
 * same query key. This prevents the header, sidebar, and mobile navigation
 * from each starting a separate full notification request.
 */
export function useNotifications() {
  const queryClient = useQueryClient();
  const activeQuery = useNotificationsQuery();
  const archivedQuery = useArchivedNotificationsQuery();
  const markAsReadMutation = useMarkAsReadMutation();
  const markAllAsReadMutation = useMarkAllAsReadMutation();

  const refetchActive = activeQuery.refetch;
  const refetchArchived = archivedQuery.refetch;
  const fetchNotifications = useCallback(async () => {
    await Promise.all([refetchActive(), refetchArchived()]);
  }, [refetchActive, refetchArchived]);

  const markAsRead = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await markAsReadMutation.mutateAsync(id);
        return true;
      } catch {
        return false;
      }
    },
    [markAsReadMutation],
  );
  const markAllAsRead = useCallback(
    async (): Promise<boolean> => {
      try {
        await markAllAsReadMutation.mutateAsync();
        return true;
      } catch {
        return false;
      }
    },
    [markAllAsReadMutation],
  );

  const archiveNotification = useCallback(
    async (id: string): Promise<boolean> => {
      const previousActive = queryClient.getQueryData<Notification[]>(queryKeys.notifications.all);
      const previousArchived = queryClient.getQueryData<Notification[]>(queryKeys.notifications.archive);
      const target = activeQuery.data?.find((notification) => notification.id === id);
      if (target) {
        queryClient.setQueryData<Notification[]>(queryKeys.notifications.all, (old = []) =>
          old.filter((notification) => notification.id !== id),
        );
        queryClient.setQueryData<Notification[]>(queryKeys.notifications.archive, (old = []) => [
          { ...target, isArchived: true },
          ...old,
        ]);
      }
      try {
        await post(`/notifications/${id}/archive`, {});
        return true;
      } catch (error) {
        restoreNotificationQuery(queryClient, queryKeys.notifications.all, previousActive);
        restoreNotificationQuery(queryClient, queryKeys.notifications.archive, previousArchived);
        logMutationError("[notifications] Failed to archive notification", error);
        return false;
      } finally {
        void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all, exact: true });
        void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.archive });
      }
    },
    [activeQuery.data, queryClient],
  );

  const unarchiveNotification = useCallback(
    async (id: string): Promise<boolean> => {
      const previousActive = queryClient.getQueryData<Notification[]>(queryKeys.notifications.all);
      const previousArchived = queryClient.getQueryData<Notification[]>(queryKeys.notifications.archive);
      const target = archivedQuery.data?.find((notification) => notification.id === id);
      if (target) {
        queryClient.setQueryData<Notification[]>(queryKeys.notifications.archive, (old = []) =>
          old.filter((notification) => notification.id !== id),
        );
        queryClient.setQueryData<Notification[]>(queryKeys.notifications.all, (old = []) => [
          { ...target, isArchived: false },
          ...old,
        ]);
      }
      try {
        await post(`/notifications/${id}/unarchive`, {});
        return true;
      } catch (error) {
        restoreNotificationQuery(queryClient, queryKeys.notifications.all, previousActive);
        restoreNotificationQuery(queryClient, queryKeys.notifications.archive, previousArchived);
        logMutationError("[notifications] Failed to unarchive notification", error);
        return false;
      } finally {
        void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all, exact: true });
        void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.archive });
      }
    },
    [archivedQuery.data, queryClient],
  );

  const bulkArchive = useCallback(
    async (ids: string[]): Promise<boolean> => {
      const previousActive = queryClient.getQueryData<Notification[]>(queryKeys.notifications.all);
      const previousArchived = queryClient.getQueryData<Notification[]>(queryKeys.notifications.archive);
      const targets = activeQuery.data?.filter((notification) => ids.includes(notification.id)) ?? [];
      queryClient.setQueryData<Notification[]>(queryKeys.notifications.all, (old = []) =>
        old.filter((notification) => !ids.includes(notification.id)),
      );
      queryClient.setQueryData<Notification[]>(queryKeys.notifications.archive, (old = []) => [
        ...targets.map((notification) => ({ ...notification, isArchived: true })),
        ...old,
      ]);
      try {
        await post("/notifications/bulk-archive", { ids });
        return true;
      } catch (error) {
        restoreNotificationQuery(queryClient, queryKeys.notifications.all, previousActive);
        restoreNotificationQuery(queryClient, queryKeys.notifications.archive, previousArchived);
        logMutationError("[notifications] Failed to bulk archive notifications", error);
        return false;
      } finally {
        void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all, exact: true });
        void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.archive });
      }
    },
    [activeQuery.data, queryClient],
  );

  const bulkUnarchive = useCallback(
    async (ids: string[]): Promise<boolean> => {
      const previousActive = queryClient.getQueryData<Notification[]>(queryKeys.notifications.all);
      const previousArchived = queryClient.getQueryData<Notification[]>(queryKeys.notifications.archive);
      const targets = archivedQuery.data?.filter((notification) => ids.includes(notification.id)) ?? [];
      queryClient.setQueryData<Notification[]>(queryKeys.notifications.archive, (old = []) =>
        old.filter((notification) => !ids.includes(notification.id)),
      );
      queryClient.setQueryData<Notification[]>(queryKeys.notifications.all, (old = []) => [
        ...targets.map((notification) => ({ ...notification, isArchived: false })),
        ...old,
      ]);
      try {
        await post("/notifications/bulk-unarchive", { ids });
        return true;
      } catch (error) {
        restoreNotificationQuery(queryClient, queryKeys.notifications.all, previousActive);
        restoreNotificationQuery(queryClient, queryKeys.notifications.archive, previousArchived);
        logMutationError("[notifications] Failed to bulk unarchive notifications", error);
        return false;
      } finally {
        void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all, exact: true });
        void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.archive });
      }
    },
    [archivedQuery.data, queryClient],
  );

  return {
    notifications: activeQuery.data ?? [],
    archivedNotifications: archivedQuery.data ?? [],
    unreadCount: activeQuery.data ? computeUnreadCount(activeQuery.data) : 0,
    isLoading: activeQuery.isLoading || archivedQuery.isLoading,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    unarchiveNotification,
    bulkArchive,
    bulkUnarchive,
    fetchNotifications,
  };
}

// ── React Query variants ──────────────────────────────────────────────────────

export function useNotificationsQuery() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await get("/notifications");
      const d = (res as Record<string, unknown>)?.data as Record<string, unknown> ?? res;
      return ((d?.notifications ?? d) as Notification[]) || [];
    },
  });
}

export function useUnreadCount() {
  const queryClient = useQueryClient();
  const data = queryClient.getQueryData<Notification[]>(["notifications"]);
  const { data: fetched } = useNotificationsQuery();
  const source = data ?? fetched ?? [];
  return source.filter((n) => !n.isRead).length;
}

export function useMarkAsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => patch(`/notifications/${id}/read`),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previous = queryClient.getQueryData<Notification[]>(["notifications"]);
      queryClient.setQueryData<Notification[]>(
        ["notifications"],
        (old) => old?.map((n) => (n.id === id ? { ...n, isRead: true } : n)) ?? [],
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["notifications"], context.previous);
      }
      const err = _err as { response?: { status?: number } };
      if (err?.response?.status === 401) {
        window.dispatchEvent(new Event("auth:required"));
      }
      console.warn("[notifications] markAsRead failed:", _err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

/**
 * #403 — Optimistically marks all notifications as read and rolls back
 * the cache if the API call fails, so the UI never shows a false read-state.
 */
export function useMarkAllAsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => patch("/notifications/read-all"),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previous = queryClient.getQueryData<Notification[]>(["notifications"]);
      queryClient.setQueryData<Notification[]>(
        ["notifications"],
        (old) => old?.map((n) => ({ ...n, isRead: true })) ?? [],
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      // #403 — Restore the pre-mutation snapshot so notifications
      // don't appear read when the server rejected the request.
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["notifications"], context.previous);
      }
      console.warn("[notifications] markAllAsRead failed:", _err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
