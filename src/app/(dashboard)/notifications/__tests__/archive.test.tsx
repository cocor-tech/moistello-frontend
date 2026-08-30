import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NotificationsArchivePage from "../archive/page";
import type { Notification } from "@/types";

const mockUseNotifications = vi.fn();

vi.mock("@/hooks/use-notifications", () => ({
  useNotifications: () => mockUseNotifications(),
}));

vi.mock("@/stores/ui-store", () => ({
  useUIStore: () => ({ addToast: vi.fn() }),
}));

function makeNotification(
  overrides: Partial<Notification> = {}
): Notification {
  return {
    id: "n1",
    userId: "u-test",
    type: "payout",
    title: "Archived Payout",
    body: "Your old payout.",
    isRead: true,
    isArchived: true,
    channel: "in_app",
    createdAt: "2026-08-20T10:00:00Z",
    ...overrides,
  };
}

describe("NotificationsArchivePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNotifications.mockReturnValue({
      archivedNotifications: [
        makeNotification({ id: "n1", title: "Archived Payout" }),
      ],
      isLoading: false,
      unarchiveNotification: vi.fn(),
      bulkUnarchive: vi.fn(),
    });
  });

  it("renders archived notifications correctly", () => {
    render(<NotificationsArchivePage />);
    expect(screen.getByText("Archive")).toBeDefined();
    expect(screen.getByText("Archived Payout")).toBeDefined();
  });

  it(
    "supports bulk selection and unarchiving",
    () => {
      const mockBulkUnarchive = vi.fn();
      mockUseNotifications.mockReturnValue({
        archivedNotifications: [
          makeNotification({ id: "n1", title: "Archived Payout" }),
        ],
        isLoading: false,
        unarchiveNotification: vi.fn(),
        bulkUnarchive: mockBulkUnarchive,
      });

      render(<NotificationsArchivePage />);

      const checkboxes = screen.getAllByRole("checkbox");
      // First is select all, second is item checkbox
      fireEvent.click(checkboxes[1]);

      expect(screen.getByText("Unarchive Selected")).toBeDefined();
      fireEvent.click(screen.getByText("Unarchive Selected"));

      expect(mockBulkUnarchive).toHaveBeenCalledWith(["n1"]);
    }
  );
});
