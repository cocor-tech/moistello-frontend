import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NotificationsPage from "../page";
import type { Notification } from "@/types";

const mockUseNotifications = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/hooks/use-notifications", () => ({
  useNotifications: () => mockUseNotifications(),
}));

vi.mock("@/stores/ui-store", () => ({
  useUIStore: () => vi.fn(),
}));

vi.mock("@/lib/motion/list", () => ({
  useListMotion: () => ({ shouldReduce: true, variants: {} }),
  defaultItemVariants: {},
  STAGGER_CHILDREN_LIMIT: 50,
}));

function makeNotification(
  overrides: Partial<Notification> = {}
): Notification {
  return {
    id: "n1",
    userId: "u-test",
    type: "payout",
    title: "Payout received",
    body: "Your payout of 100 USDC is on its way.",
    isRead: false,
    channel: "in_app",
    createdAt: "2026-08-20T10:00:00Z",
    ...overrides,
  };
}

describe("NotificationsPage bulk-select accessibility", () => {
  const mockBulkArchive = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockBulkArchive.mockResolvedValue(true);
    mockUseNotifications.mockReturnValue({
      notifications: [
        makeNotification({ id: "n1", title: "Payout received", isRead: false }),
        makeNotification({
          id: "n2",
          type: "circle_joined",
          title: "You joined a circle",
          isRead: true,
        }),
      ],
      unreadCount: 1,
      isLoading: false,
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      bulkArchive: mockBulkArchive,
      fetchNotifications: vi.fn(),
    });
  });

  it("renders each bulk-select control as a labeled checkbox", () => {
    render(<NotificationsPage />);

    const payoutCheckbox = screen.getByRole("checkbox", {
      name: "Select notification: Payout received",
    });
    expect(payoutCheckbox).toHaveAttribute("aria-checked", "false");

    const circleCheckbox = screen.getByRole("checkbox", {
      name: "Select notification: You joined a circle",
    });
    expect(circleCheckbox).toHaveAttribute("aria-checked", "false");
  });

  it("uses the bulk archive operation for the Archive action", async () => {
    render(<NotificationsPage />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Select notification: Payout received" }));
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));

    await waitFor(() => expect(mockBulkArchive).toHaveBeenCalledWith(["n1"]));
  });
});
