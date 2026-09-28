import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, ToastHost } from "../toast-provider";
import { useUIStore } from "@/stores/ui-store";

// ── Helpers ──────────────────────────────────────────────────────────────────

function resetStore() {
  useUIStore.setState({
    theme: "system",
    density: "comfortable",
    fontSize: "medium",
    sidebarOpen: false,
    commandPaletteOpen: false,
    toasts: [],
  });
}

/** A minimal stand-in for a Next.js page component. */
function PageA() {
  return <div data-testid="page-a">Page A</div>;
}
function PageB() {
  return <div data-testid="page-b">Page B</div>;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ToastProvider / ToastHost", () => {
  beforeEach(() => {
    resetStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  // ── Rendering ───────────────────────────────────────────────────────────────

  it("renders children", () => {
    render(
      <ToastProvider>
        <div data-testid="child">hello</div>
      </ToastProvider>
    );
    expect(screen.getByTestId("child")).toBeDefined();
  });

  it("renders the toast host in the document after mount", () => {
    render(
      <ToastProvider>
        <div />
      </ToastProvider>
    );
    // ToastHost portals into document.body — query the document, not the container
    expect(document.querySelector("[data-testid='toast-host']")).not.toBeNull();
  });

  it("shows a toast once addToast is called", () => {
    render(
      <ToastProvider>
        <div />
      </ToastProvider>
    );

    act(() => {
      useUIStore.getState().addToast({ type: "success", title: "Saved!" });
    });

    expect(document.querySelector("[data-testid='toast-host']")?.textContent).toContain(
      "Saved!"
    );
  });

  // ── Persistence across route changes ────────────────────────────────────────

  it("toasts persist when the page child is replaced (simulated route change)", () => {
    const { rerender } = render(
      <ToastProvider>
        <PageA />
      </ToastProvider>
    );

    // Add a toast while on Page A
    act(() => {
      useUIStore.getState().addToast({ type: "info", title: "Navigation toast" });
    });

    // Simulate a route change by swapping the child — this is what Next.js does
    // on soft navigation: the root layout stays mounted but the page slot rerenders
    rerender(
      <ToastProvider>
        <PageB />
      </ToastProvider>
    );

    // Page B is now rendered
    expect(screen.getByTestId("page-b")).toBeDefined();

    // The toast must still be visible — it should NOT have vanished
    expect(document.querySelector("[data-testid='toast-host']")?.textContent).toContain(
      "Navigation toast"
    );
  });

  it("toast added on Page A is still present after navigating to Page B before its duration expires", () => {
    const { rerender } = render(
      <ToastProvider>
        <PageA />
      </ToastProvider>
    );

    act(() => {
      useUIStore.getState().addToast({
        type: "success",
        title: "Transfer confirmed",
        duration: 8000,
      });
    });

    // Advance time partially (2s of the 8s duration)
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Route change
    rerender(
      <ToastProvider>
        <PageB />
      </ToastProvider>
    );

    // Toast should still be there — 6s remain on its timer
    expect(document.querySelector("[data-testid='toast-host']")?.textContent).toContain(
      "Transfer confirmed"
    );

    // Advance remaining time — now it should auto-dismiss
    act(() => {
      vi.advanceTimersByTime(7000);
    });

    const host = document.querySelector("[data-testid='toast-host']");
    expect(host?.querySelectorAll("[role='alert']").length).toBe(0);
  });

  // ── No duplicate hosts ───────────────────────────────────────────────────────

  it("only one toast host exists in the document at any time", () => {
    const { rerender } = render(
      <ToastProvider>
        <PageA />
      </ToastProvider>
    );

    rerender(
      <ToastProvider>
        <PageB />
      </ToastProvider>
    );

    rerender(
      <ToastProvider>
        <PageA />
      </ToastProvider>
    );

    const hosts = document.querySelectorAll("[data-testid='toast-host']");
    expect(hosts.length).toBe(1);
  });

  it("only one toast host exists when ToastHost is rendered directly multiple times in sequence", () => {
    const { rerender } = render(<ToastHost />);
    rerender(<ToastHost />);
    rerender(<ToastHost />);

    const hosts = document.querySelectorAll("[data-testid='toast-host']");
    expect(hosts.length).toBe(1);
  });

  // ── Dismiss ──────────────────────────────────────────────────────────────────

  it("dismiss button removes the toast from the host", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });

    render(
      <ToastProvider>
        <div />
      </ToastProvider>
    );

    act(() => {
      useUIStore.getState().addToast({ type: "error", title: "Oops" });
    });

    const dismissBtn = document.querySelector(
      "[data-testid='toast-host'] button[aria-label='Dismiss notification']"
    ) as HTMLButtonElement;
    expect(dismissBtn).not.toBeNull();

    await user.click(dismissBtn);

    const host = document.querySelector("[data-testid='toast-host']");
    expect(host?.querySelectorAll("[role='alert']").length).toBe(0);
    expect(useUIStore.getState().toasts).toHaveLength(0);
  });

  // ── Auto-dismiss ─────────────────────────────────────────────────────────────

  it("toasts auto-dismiss after their duration", () => {
    render(
      <ToastProvider>
        <div />
      </ToastProvider>
    );

    act(() => {
      useUIStore.getState().addToast({ type: "success", title: "Quick", duration: 3000 });
    });

    expect(document.querySelector("[data-testid='toast-host']")?.textContent).toContain(
      "Quick"
    );

    act(() => {
      vi.advanceTimersByTime(3500);
    });

    const host = document.querySelector("[data-testid='toast-host']");
    expect(host?.querySelectorAll("[role='alert']").length).toBe(0);
  });

  // ── Accessibility ─────────────────────────────────────────────────────────────

  it("toast host has aria-live polite for screen reader announcements", () => {
    render(
      <ToastProvider>
        <div />
      </ToastProvider>
    );
    const host = document.querySelector("[data-testid='toast-host']");
    expect(host?.getAttribute("aria-live")).toBe("polite");
  });

  it("individual toasts have role alert", () => {
    render(
      <ToastProvider>
        <div />
      </ToastProvider>
    );

    act(() => {
      useUIStore.getState().addToast({ type: "warning", title: "Heads up" });
    });

    const alerts = document.querySelectorAll("[data-testid='toast-host'] [role='alert']");
    expect(alerts.length).toBe(1);
  });
});
