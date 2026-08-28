import { beforeEach, describe, expect, it, vi } from "vitest";
import { useNotificationStore } from "@/stores/notification-store";
import type { Notification } from "@/types";

vi.mock("@/lib/api-client", () => ({
  get: vi.fn(),
  patch: vi.fn(),
}));

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: `n-${Math.random().toString(36).slice(2, 8)}`,
    userId: "u-test",
    type: "info",
    title: "Test notification",
    body: "This is a test",
    isRead: false,
    channel: "in_app",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("useNotificationStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
    });
  });

  describe("initial state", () => {
    it("starts with empty notifications", () => {
      const state = useNotificationStore.getState();
      expect(state.notifications).toEqual([]);
      expect(state.unreadCount).toBe(0);
      expect(state.isLoading).toBe(false);
    });
  });

  describe("addNotification", () => {
    it("adds a notification to the list", () => {
      const notification = makeNotification({ id: "n1" });
      useNotificationStore.getState().addNotification(notification);

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0].id).toBe("n1");
    });

    it("prepends new notifications", () => {
      const first = makeNotification({ id: "n1" });
      const second = makeNotification({ id: "n2" });

      useNotificationStore.getState().addNotification(first);
      useNotificationStore.getState().addNotification(second);

      const state = useNotificationStore.getState();
      expect(state.notifications[0].id).toBe("n2");
      expect(state.notifications[1].id).toBe("n1");
    });

    it("updates unread count when adding unread notification", () => {
      useNotificationStore.getState().addNotification(makeNotification({ id: "n1", isRead: false }));
      expect(useNotificationStore.getState().unreadCount).toBe(1);

      useNotificationStore.getState().addNotification(makeNotification({ id: "n2", isRead: false }));
      expect(useNotificationStore.getState().unreadCount).toBe(2);
    });

    it("does not increment unread count for read notifications", () => {
      useNotificationStore.getState().addNotification(makeNotification({ id: "n1", isRead: true }));
      expect(useNotificationStore.getState().unreadCount).toBe(0);
    });
  });

  describe("markAsRead", () => {
    it("marks a notification as read", async () => {
      const { patch } = await import("@/lib/api-client");
      vi.mocked(patch).mockResolvedValueOnce({} as never);

      useNotificationStore.setState({
        notifications: [
          makeNotification({ id: "n1", isRead: false }),
          makeNotification({ id: "n2", isRead: false }),
        ],
        unreadCount: 2,
      });

      await useNotificationStore.getState().markAsRead("n1");

      const state = useNotificationStore.getState();
      expect(state.notifications.find((n) => n.id === "n1")?.isRead).toBe(true);
      expect(state.unreadCount).toBe(1);
      expect(patch).toHaveBeenCalledWith("/notifications/n1/read");
    });

    it("rolls back optimistic state when the API rejects the update", async () => {
      const { patch } = await import("@/lib/api-client");
      vi.mocked(patch).mockRejectedValueOnce(new Error("Unauthorized") as never);
      const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

      useNotificationStore.setState({
        notifications: [
          makeNotification({ id: "n1", isRead: false }),
          makeNotification({ id: "n2", isRead: false }),
        ],
        unreadCount: 2,
      });

      await useNotificationStore.getState().markAsRead("n1");

      expect(useNotificationStore.getState().notifications.find((n) => n.id === "n1")?.isRead).toBe(false);
      expect(useNotificationStore.getState().unreadCount).toBe(2);
      consoleWarn.mockRestore();
    });

    it("signals re-authentication when an optimistic read fails with 401", async () => {
      const { patch } = await import("@/lib/api-client");
      const authRequired = vi.fn();
      window.addEventListener("auth:required", authRequired);
      vi.mocked(patch).mockRejectedValueOnce({ response: { status: 401 } } as never);
      const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

      useNotificationStore.setState({
        notifications: [makeNotification({ id: "n1", isRead: false })],
        unreadCount: 1,
      });

      await useNotificationStore.getState().markAsRead("n1");

      expect(authRequired).toHaveBeenCalledTimes(1);
      expect(useNotificationStore.getState().unreadCount).toBe(1);
      window.removeEventListener("auth:required", authRequired);
      consoleWarn.mockRestore();
    });

    it("does not change unread count if notification was already read", async () => {
      const { patch } = await import("@/lib/api-client");
      vi.mocked(patch).mockResolvedValueOnce({} as never);

      useNotificationStore.setState({
        notifications: [
          makeNotification({ id: "n1", isRead: true }),
        ],
        unreadCount: 0,
      });

      await useNotificationStore.getState().markAsRead("n1");

      expect(useNotificationStore.getState().unreadCount).toBe(0);
    });
  });

  describe("markAllAsRead", () => {
    it("marks all notifications as read", async () => {
      const { patch } = await import("@/lib/api-client");
      vi.mocked(patch).mockResolvedValueOnce({} as never);

      useNotificationStore.setState({
        notifications: [
          makeNotification({ id: "n1", isRead: false }),
          makeNotification({ id: "n2", isRead: false }),
          makeNotification({ id: "n3", isRead: true }),
        ],
        unreadCount: 2,
      });

      await useNotificationStore.getState().markAllAsRead();

      const state = useNotificationStore.getState();
      expect(state.unreadCount).toBe(0);
      expect(state.notifications.every((n) => n.isRead)).toBe(true);
      expect(patch).toHaveBeenCalledWith("/notifications/read-all");
    });
  });

  describe("fetchNotifications", () => {
    it("loads notifications from API", async () => {
      const { get } = await import("@/lib/api-client");
      const notifications = [
        makeNotification({ id: "n1", isRead: false }),
        makeNotification({ id: "n2", isRead: true }),
      ];
      vi.mocked(get).mockResolvedValueOnce({
        data: { notifications },
      } as never);

      await useNotificationStore.getState().fetchNotifications();

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(2);
      expect(state.unreadCount).toBe(1);
      expect(state.isLoading).toBe(false);
    });

    it("sets isLoading during fetch", async () => {
      const { get } = await import("@/lib/api-client");
      let resolveGet!: (value: unknown) => void;
      vi.mocked(get).mockReturnValueOnce(
        new Promise((r) => { resolveGet = r; })
      );

      const fetchPromise = useNotificationStore.getState().fetchNotifications();
      expect(useNotificationStore.getState().isLoading).toBe(true);

      resolveGet({ data: { notifications: [] } });
      await fetchPromise;

      expect(useNotificationStore.getState().isLoading).toBe(false);
    });

    it("handles API errors gracefully", async () => {
      const { get } = await import("@/lib/api-client");
      vi.mocked(get).mockRejectedValueOnce(new Error("Network error"));

      const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

      await useNotificationStore.getState().fetchNotifications();

      expect(useNotificationStore.getState().isLoading).toBe(false);
      expect(consoleWarn).toHaveBeenCalled();
      consoleWarn.mockRestore();
    });
  });

  describe("store reset", () => {
    it("can be reset to initial state", () => {
      useNotificationStore.setState({
        notifications: [
          makeNotification({ id: "n1" }),
          makeNotification({ id: "n2" }),
        ],
        unreadCount: 2,
      });

      useNotificationStore.setState({
        notifications: [],
        unreadCount: 0,
        isLoading: false,
      });

      const state = useNotificationStore.getState();
      expect(state.notifications).toEqual([]);
      expect(state.unreadCount).toBe(0);
    });
  });
});
