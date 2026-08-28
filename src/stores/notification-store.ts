"use client";

import { create } from "zustand";
import type { Notification, ApiResponse } from "@/types";
import { get as apiGet, patch as apiPatch } from "@/lib/api-client";

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
}

interface NotificationActions {
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Notification) => void;
}

type NotificationStore = NotificationState & NotificationActions;

function computeUnreadCount(notifications: Notification[]): number {
  return notifications.filter((n) => !n.isRead).length;
}

function isUnauthorizedError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    (error as { response?: { status?: number } }).response?.status === 401
  )
}

export const useNotificationStore = create<NotificationStore>()(
  (set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,

    fetchNotifications: async () => {
      set({ isLoading: true });
      try {
        const response = await apiGet<ApiResponse<{ notifications: Notification[] }>>(
          "/notifications"
        );
        const notifications = response.data?.notifications ?? [];
        set({
          notifications,
          unreadCount: computeUnreadCount(notifications),
          isLoading: false,
        });
      } catch (e) {
        console.warn("[notifications] Failed to load:", e)
        set({ isLoading: false })
      }
    },

    markAsRead: async (id: string) => {
      const previous = get().notifications;
      set((state) => {
        const notifications = state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        );
        return {
          notifications,
          unreadCount: computeUnreadCount(notifications),
        };
      });

      try {
        await apiPatch(`/notifications/${id}/read`);
      } catch (e) {
        set({
          notifications: previous,
          unreadCount: computeUnreadCount(previous),
        })
        if (isUnauthorizedError(e) && typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("auth:required"))
        }
        console.warn("[notifications] Failed to mark notification as read:", e)
      }
    },

    markAllAsRead: async () => {
      try {
        await apiPatch("/notifications/read-all");
        set((state) => {
          const notifications = state.notifications.map((n) => ({
            ...n,
            isRead: true,
          }));
          return {
            notifications,
            unreadCount: 0,
          };
        });
      } catch (e) {
        console.warn("[notifications] Failed to mark all as read:", e)
      }
    },

    addNotification: (notification: Notification) => {
      set((state) => {
        const notifications = [notification, ...state.notifications];
        return {
          notifications,
          unreadCount: computeUnreadCount(notifications),
        };
      });
    },
  })
);
