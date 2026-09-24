import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

  it("describes and preserves selection as page-scoped", () => {
    const notifications = Array.from({ length: 21 }, (_, index) =>
      makeNotification({ id: `n${index + 1}`, title: `Archived ${index + 1}` }),
    );
    mockUseNotifications.mockReturnValue({
      archivedNotifications: notifications,
      isLoading: false,
      unarchiveNotification: vi.fn(),
      bulkUnarchive: vi.fn(),
    });

    render(<NotificationsArchivePage />);
    const selectAll = screen.getByRole("checkbox", {
      name: "Select archived notifications on this page",
    });
    fireEvent.click(selectAll);
    expect(selectAll).toHaveAttribute("aria-checked", "true");

    fireEvent.click(screen.getByRole("button", { name: "Next archived notifications page" }));
    expect(
      screen.getByRole("checkbox", { name: "Select archived notifications on this page" }),
    ).toHaveAttribute("aria-checked", "false");

    fireEvent.click(screen.getByRole("checkbox", { name: "Select archived notifications on this page" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous archived notifications page" }));
    expect(
      screen.getByRole("checkbox", { name: "Deselect archived notifications on this page" }),
    ).toHaveAttribute("aria-checked", "true");
  });

  it(
    "supports bulk selection and unarchiving",
    async () => {
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

      await waitFor(() => expect(mockBulkUnarchive).toHaveBeenCalledWith(["n1"]));
    }
  );
});
