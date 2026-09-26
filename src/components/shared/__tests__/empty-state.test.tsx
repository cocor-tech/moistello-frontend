import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  EmptyState,
  CircleListEmptyState,
  SavedCirclesEmptyState,
  MemberTabsEmptyState,
} from "../empty-state";
import { Sparkles } from "lucide-react";

describe("EmptyState Component", () => {
  it("renders title, description and icon", () => {
    render(
      <EmptyState
        icon={<Sparkles data-testid="sparkles-icon" />}
        title="Custom Title"
        description="Custom Description"
      />
    );

    expect(screen.getByText("Custom Title")).toBeDefined();
    expect(screen.getByText("Custom Description")).toBeDefined();
    expect(screen.getByTestId("sparkles-icon")).toBeDefined();
  });

  it("triggers action onClick callback when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <EmptyState
        icon={<Sparkles />}
        title="Custom Title"
        action={{ label: "Do Action", onClick }}
      />
    );

    await user.click(screen.getByRole("button", { name: "Do Action" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  describe("Preset Variants", () => {
    it("renders CircleListEmptyState", async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();

      render(<CircleListEmptyState onAction={onAction} />);

      expect(screen.getByText("No circles found")).toBeDefined();
      expect(screen.getByRole("button", { name: "Create a Circle" })).toBeDefined();

      await user.click(screen.getByRole("button", { name: "Create a Circle" }));
      expect(onAction).toHaveBeenCalledTimes(1);
    });

    it("renders SavedCirclesEmptyState", async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();

      render(<SavedCirclesEmptyState onAction={onAction} />);

      expect(screen.getByText("No saved circles")).toBeDefined();
      expect(screen.getByRole("button", { name: "Browse Circles" })).toBeDefined();

      await user.click(screen.getByRole("button", { name: "Browse Circles" }));
      expect(onAction).toHaveBeenCalledTimes(1);
    });

    it("renders MemberTabsEmptyState", async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();

      render(<MemberTabsEmptyState onAction={onAction} />);

      expect(screen.getByText("No members in this tab")).toBeDefined();
      expect(screen.getByRole("button", { name: "Invite Members" })).toBeDefined();

      await user.click(screen.getByRole("button", { name: "Invite Members" }));
      expect(onAction).toHaveBeenCalledTimes(1);
    });
  });
});
