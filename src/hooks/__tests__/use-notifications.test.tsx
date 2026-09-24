import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { get, patch } from "@/lib/api-client";
import {
  useNotificationsQuery,
  useUnreadCount,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
} from "@/hooks/use-notifications";
import {
  filterNotifications,
  groupNotificationsByType,
} from "@/lib/notifications";
import { createQueryWrapper } from "./test-utils";
import type { Notification } from "@/types";
import { logger } from "@/lib/logger";

vi.mock("@/lib/api-client", () => ({ get: vi.fn(), patch: vi.fn() }));

const mockedGet = vi.mocked(get);
const mockedPatch = vi.mocked(patch);

function makeNotification(
  overrides: Partial<Notification> = {}
): Notification {
  return {
    id: "n1",
    userId: "u-test",
    type: "payout",
    title: "Payout received",
    body: "Your payout is on its way.",
    isRead: false,
    channel: "in_app",
    createdAt: "2026-08-20T10:00:00Z",
    ...overrides,
  };
}

describe("useNotificationsQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches notifications from the API on mount", async () => {
    const notifications = [
      makeNotification({ id: "n1", isRead: false }),
      makeNotification({ id: "n2", isRead: true }),
    ];
    mockedGet.mockResolvedValue({
      data: { notifications },
    } as never);

    const { QueryWrapper } = createQueryWrapper();
    const { result } = renderHook(() => useNotificationsQuery(), {
      wrapper: QueryWrapper,
    });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedGet).toHaveBeenCalledWith("/notifications");
    expect(result.current.data).toEqual(notifications);
  });

  it("normalizes a missing notifications array to an empty list", async () => {
    mockedGet.mockResolvedValue({ data: {} } as never);

    const { QueryWrapper } = createQueryWrapper();
    const { result } = renderHook(() => useNotificationsQuery(), {
      wrapper: QueryWrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

describe("useUnreadCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("derives the unread count from the query data", async () => {
    mockedGet.mockResolvedValue({
      data: {
        notifications: [
          makeNotification({ id: "n1", isRead: false }),
          makeNotification({ id: "n2", isRead: true }),
          makeNotification({ id: "n3", isRead: false }),
        ],
      },
    } as never);

    const { QueryWrapper } = createQueryWrapper();
    const { result } = renderHook(() => useUnreadCount(), {
      wrapper: QueryWrapper,
    });

    await waitFor(() => expect(result.current).toBe(2));
  });

  it("returns 0 while data is still loading", async () => {
    mockedGet.mockReturnValue(new Promise(() => {}) as never);

    const { QueryWrapper } = createQueryWrapper();
    const { result } = renderHook(() => useUnreadCount(), {
      wrapper: QueryWrapper,
    });

    expect(result.current).toBe(0);
  });

  it("deduplicates requests when multiple badges mount", async () => {
    mockedGet.mockResolvedValue({
      data: { notifications: [makeNotification({ isRead: false })] },
    } as never);

    const { QueryWrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => ({ header: useUnreadCount(), sidebar: useUnreadCount() }),
      { wrapper: QueryWrapper },
    );

    await waitFor(() => expect(result.current.header).toBe(1));
    expect(result.current.sidebar).toBe(1);
    expect(mockedGet).toHaveBeenCalledTimes(1);
  });
});

describe("useMarkAsReadMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("optimistically marks the notification as read and calls the API", async () => {
    // Initial fetch returns unread data; the refetch after the mutation
    // reflects the server-side read state.
    mockedGet
      .mockResolvedValueOnce({
        data: {
          notifications: [
            makeNotification({ id: "n1", isRead: false }),
            makeNotification({ id: "n2", isRead: false }),
          ],
        },
      } as never)
      .mockResolvedValue({
        data: {
          notifications: [
            makeNotification({ id: "n1", isRead: true }),
            makeNotification({ id: "n2", isRead: false }),
          ],
        },
      } as never);
    mockedPatch.mockResolvedValue({} as never);

    const { QueryWrapper, queryClient } = createQueryWrapper();
    const { result } = renderHook(
      () => ({
        query: useNotificationsQuery(),
        mutation: useMarkAsReadMutation(),
      }),
      { wrapper: QueryWrapper }
    );

    await waitFor(() =>
      expect(queryClient.getQueryData(["notifications"])).toBeDefined()
    );

    act(() => {
      result.current.mutation.mutate("n1");
    });

    await waitFor(() =>
      expect(mockedPatch).toHaveBeenCalledWith("/notifications/n1/read")
    );

    const data = queryClient.getQueryData<Notification[]>(["notifications"]);
    expect(data?.find((n) => n.id === "n1")?.isRead).toBe(true);
    expect(data?.find((n) => n.id === "n2")?.isRead).toBe(false);
  });

  it("rolls back the optimistic update when the API rejects", async () => {
    mockedGet.mockResolvedValue({
      data: {
        notifications: [makeNotification({ id: "n1", isRead: false })],
      },
    } as never);
    mockedPatch.mockRejectedValue(new Error("Unauthorized"));
    const loggerWarn = vi.spyOn(logger, "warn").mockImplementation(() => {});

    const { QueryWrapper, queryClient } = createQueryWrapper();
    const { result } = renderHook(
      () => ({
        query: useNotificationsQuery(),
        mutation: useMarkAsReadMutation(),
      }),
      { wrapper: QueryWrapper }
    );

    await waitFor(() =>
      expect(queryClient.getQueryData(["notifications"])).toBeDefined()
    );

    act(() => {
      result.current.mutation.mutate("n1");
    });

    await waitFor(() => {
      const data = queryClient.getQueryData<Notification[]>(["notifications"]);
      expect(data?.find((n) => n.id === "n1")?.isRead).toBe(false);
    });
    loggerWarn.mockRestore();
  });

  it("dispatches auth:required when the API rejects with 401", async () => {
    mockedGet.mockResolvedValue({
      data: { notifications: [makeNotification({ id: "n1", isRead: false })] },
    } as never);
    mockedPatch.mockRejectedValue({ response: { status: 401 } });
    const authRequired = vi.fn();
    window.addEventListener("auth:required", authRequired);
    const loggerWarn = vi.spyOn(logger, "warn").mockImplementation(() => {});

    const { QueryWrapper, queryClient } = createQueryWrapper();
    const { result } = renderHook(
      () => ({
        query: useNotificationsQuery(),
        mutation: useMarkAsReadMutation(),
      }),
      { wrapper: QueryWrapper }
    );

    await waitFor(() =>
      expect(queryClient.getQueryData(["notifications"])).toBeDefined()
    );

    act(() => {
      result.current.mutation.mutate("n1");
    });

    await waitFor(() => expect(authRequired).toHaveBeenCalledTimes(1));
    window.removeEventListener("auth:required", authRequired);
    loggerWarn.mockRestore();
  });
});

describe("useMarkAllAsReadMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks every notification as read", async () => {
    mockedGet
      .mockResolvedValueOnce({
        data: {
          notifications: [
            makeNotification({ id: "n1", isRead: false }),
            makeNotification({ id: "n2", isRead: false }),
          ],
        },
      } as never)
      .mockResolvedValue({
        data: {
          notifications: [
            makeNotification({ id: "n1", isRead: true }),
            makeNotification({ id: "n2", isRead: true }),
          ],
        },
      } as never);
    mockedPatch.mockResolvedValue({} as never);

    const { QueryWrapper, queryClient } = createQueryWrapper();
    const { result } = renderHook(
      () => ({
        query: useNotificationsQuery(),
        mutation: useMarkAllAsReadMutation(),
      }),
      { wrapper: QueryWrapper }
    );

    await waitFor(() =>
      expect(queryClient.getQueryData(["notifications"])).toBeDefined()
    );

    act(() => {
      result.current.mutation.mutate();
    });

    await waitFor(() =>
      expect(mockedPatch).toHaveBeenCalledWith("/notifications/read-all")
    );

    const data = queryClient.getQueryData<Notification[]>(["notifications"]);
    expect(data?.every((n) => n.isRead)).toBe(true);
  });
});

describe("shared notification filtering and grouping", () => {
  const notifications = [
    makeNotification({ id: "n1", type: "payout", isRead: false }),
    makeNotification({ id: "n2", type: "contribution", isRead: true }),
    makeNotification({ id: "n3", type: "circle_joined", isRead: false }),
    makeNotification({ id: "n4", type: "warning", isRead: false }),
  ];

  it("filters by unread state", () => {
    const result = filterNotifications(notifications, "unread", "all");
    expect(result.map((n) => n.id)).toEqual(["n1", "n3", "n4"]);
  });

  it("filters by type group", () => {
    const result = filterNotifications(notifications, "all", "payout");
    expect(result.map((n) => n.id)).toEqual(["n1"]);
  });

  it("matches alert types via their raw type prefix", () => {
    const result = filterNotifications(notifications, "all", "warning");
    expect(result.map((n) => n.id)).toEqual(["n4"]);
  });

  it("groups by type category", () => {
    const groups = groupNotificationsByType(notifications);
    expect(groups.Payouts.map((n) => n.id)).toEqual(["n1"]);
    expect(groups.Contributions.map((n) => n.id)).toEqual(["n2"]);
    expect(groups.Circles.map((n) => n.id)).toEqual(["n3"]);
    expect(groups.Alerts.map((n) => n.id)).toEqual(["n4"]);
  });
});
