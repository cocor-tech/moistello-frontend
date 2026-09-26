import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUIStore, clearToastDeduplication } from "@/stores/ui-store";

describe("useUIStore", () => {
  beforeEach(() => {
    clearToastDeduplication();
    useUIStore.setState({
      theme: "system",
      density: "comfortable",
      fontSize: "medium",
      sidebarOpen: false,
      toasts: [],
    });
  });

  describe("sidebar", () => {
    it("starts with sidebar closed", () => {
      expect(useUIStore.getState().sidebarOpen).toBe(false);
    });

    it("toggles sidebar", () => {
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(true);

      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(false);
    });

    it("sets sidebar open directly", () => {
      useUIStore.getState().setSidebarOpen(true);
      expect(useUIStore.getState().sidebarOpen).toBe(true);

      useUIStore.getState().setSidebarOpen(false);
      expect(useUIStore.getState().sidebarOpen).toBe(false);
    });
  });

  describe("theme", () => {
    it("starts with system theme", () => {
      expect(useUIStore.getState().theme).toBe("system");
    });

    it("toggles through the cycle dark → system → light → dark", () => {
      useUIStore.setState({ theme: "dark" });
      useUIStore.getState().toggleTheme();
      expect(useUIStore.getState().theme).toBe("system");

      useUIStore.getState().toggleTheme();
      expect(useUIStore.getState().theme).toBe("light");

      useUIStore.getState().toggleTheme();
      expect(useUIStore.getState().theme).toBe("dark");
    });

    it("sets theme directly", () => {
      useUIStore.getState().setTheme("light");
      expect(useUIStore.getState().theme).toBe("light");

      useUIStore.getState().setTheme("dark");
      expect(useUIStore.getState().theme).toBe("dark");

      useUIStore.getState().setTheme("system");
      expect(useUIStore.getState().theme).toBe("system");
    });
  });

  describe("toasts", () => {
    it("starts with empty toasts", () => {
      expect(useUIStore.getState().toasts).toEqual([]);
    });

    it("adds a toast with generated id", () => {
      vi.useFakeTimers();
      vi.spyOn(Date, "now").mockReturnValue(1000);

      useUIStore.getState().addToast({
        type: "success",
        title: "Saved",
        description: "Changes saved successfully",
      });

      const toasts = useUIStore.getState().toasts;
      expect(toasts).toHaveLength(1);
      expect(toasts[0].type).toBe("success");
      expect(toasts[0].title).toBe("Saved");
      expect(toasts[0].description).toBe("Changes saved successfully");
      expect(toasts[0].id).toMatch(/^toast-/);

      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it("removes a toast by id", () => {
      vi.useFakeTimers();
      vi.spyOn(Date, "now").mockReturnValue(1000);

      useUIStore.getState().addToast({
        type: "error",
        title: "Error",
      });

      const toastId = useUIStore.getState().toasts[0].id;
      useUIStore.getState().removeToast(toastId);

      expect(useUIStore.getState().toasts).toEqual([]);
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it("auto-removes toast after duration", () => {
      vi.useFakeTimers();
      vi.spyOn(Date, "now").mockReturnValue(1000);

      useUIStore.getState().addToast({
        type: "info",
        title: "Temporary",
        duration: 3000,
      });

      expect(useUIStore.getState().toasts).toHaveLength(1);

      vi.advanceTimersByTime(3000);

      expect(useUIStore.getState().toasts).toEqual([]);
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it("uses default duration of 5000ms", () => {
      vi.useFakeTimers();
      vi.spyOn(Date, "now").mockReturnValue(1000);

      useUIStore.getState().addToast({
        type: "warning",
        title: "Warning",
      });

      vi.advanceTimersByTime(4999);
      expect(useUIStore.getState().toasts).toHaveLength(1);

      vi.advanceTimersByTime(1);
      expect(useUIStore.getState().toasts).toEqual([]);
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it("handles multiple toasts independently", () => {
      vi.useFakeTimers();
      vi.spyOn(Date, "now")
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(2000);

      useUIStore.getState().addToast({
        type: "success",
        title: "First",
        duration: 1000,
      });
      useUIStore.getState().addToast({
        type: "error",
        title: "Second",
        duration: 2000,
      });

      expect(useUIStore.getState().toasts).toHaveLength(2);

      vi.advanceTimersByTime(1000);
      expect(useUIStore.getState().toasts).toHaveLength(1);
      expect(useUIStore.getState().toasts[0].title).toBe("Second");

      vi.advanceTimersByTime(1000);
      expect(useUIStore.getState().toasts).toEqual([]);
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it("generates unique ids for toasts added in the same millisecond", () => {
      vi.useFakeTimers();
      vi.spyOn(Date, "now").mockReturnValue(1000);

      useUIStore.getState().addToast({ type: "info", title: "One" });
      useUIStore.getState().addToast({ type: "info", title: "Two" });

      const ids = useUIStore.getState().toasts.map((t) => t.id);
      expect(ids[0]).not.toBe(ids[1]);
      expect(ids[0]).toMatch(/^toast-1000-\d+$/);
      expect(ids[1]).toMatch(/^toast-1000-\d+$/);

      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it("cancels the auto-dismiss timer when a toast is removed manually", () => {
      vi.useFakeTimers();
      vi.spyOn(Date, "now").mockReturnValue(1000);

      useUIStore.getState().addToast({
        type: "warning",
        title: "Manual",
        duration: 5000,
      });

      const toastId = useUIStore.getState().toasts[0].id;
      useUIStore.getState().removeToast(toastId);

      // Manual dismissal clears the pending timer entirely.
      expect(vi.getTimerCount()).toBe(0);

      // Advancing time must not resurrect or error on the removed toast.
      vi.advanceTimersByTime(10000);
      expect(useUIStore.getState().toasts).toEqual([]);

      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it("leaves a pending timer behind for toasts that are still visible", () => {
      vi.useFakeTimers();
      vi.spyOn(Date, "now").mockReturnValue(1000);

      useUIStore.getState().addToast({
        type: "info",
        title: "Visible",
        duration: 5000,
      });

      expect(vi.getTimerCount()).toBe(1);
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it("caps stacked toasts so the corner never overflows", () => {
      vi.useFakeTimers();
      vi.spyOn(Date, "now").mockReturnValue(1000);

      for (let i = 0; i < 8; i++) {
        useUIStore.getState().addToast({
          type: "info",
          title: `Toast ${i}`,
          duration: 60000,
        });
      }

      const toasts = useUIStore.getState().toasts;
      expect(toasts).toHaveLength(5);
      expect(toasts[0].title).toBe("Toast 3");
      expect(toasts[4].title).toBe("Toast 7");

      // Evicted toasts must not leave orphaned dismiss timers behind.
      expect(vi.getTimerCount()).toBe(5);

      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it("deduplicates identical toasts added within 5000ms", () => {
      vi.useFakeTimers();
      vi.spyOn(Date, "now").mockReturnValue(1000);

      // First call adds toast
      useUIStore.getState().addToast({
        type: "error",
        title: "Query Failed",
        description: "Network error",
      });
      expect(useUIStore.getState().toasts).toHaveLength(1);

      // Parallel/duplicate call within 5000ms is ignored
      useUIStore.getState().addToast({
        type: "error",
        title: "Query Failed",
        description: "Network error",
      });
      expect(useUIStore.getState().toasts).toHaveLength(1);

      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it("allows different toasts to be added within 5000ms", () => {
      vi.useFakeTimers();
      vi.spyOn(Date, "now").mockReturnValue(1000);

      useUIStore.getState().addToast({
        type: "error",
        title: "Error A",
      });
      useUIStore.getState().addToast({
        type: "error",
        title: "Error B",
      });

      expect(useUIStore.getState().toasts).toHaveLength(2);

      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it("allows identical toasts to be added again after 5000ms", () => {
      vi.useFakeTimers();
      vi.spyOn(Date, "now").mockReturnValue(1000);

      useUIStore.getState().addToast({
        type: "error",
        title: "Timeout",
      });
      expect(useUIStore.getState().toasts).toHaveLength(1);

      // Advance past 5000ms deduplication window
      vi.spyOn(Date, "now").mockReturnValue(6500);

      useUIStore.getState().addToast({
        type: "error",
        title: "Timeout",
      });

      expect(useUIStore.getState().toasts).toHaveLength(2);

      vi.useRealTimers();
      vi.restoreAllMocks();
    });
  });

  describe("density and fontSize", () => {
    it("sets density", () => {
      useUIStore.getState().setDensity("compact");
      expect(useUIStore.getState().density).toBe("compact");

      useUIStore.getState().setDensity("comfortable");
      expect(useUIStore.getState().density).toBe("comfortable");
    });

    it("sets fontSize", () => {
      useUIStore.getState().setFontSize("small");
      expect(useUIStore.getState().fontSize).toBe("small");

      useUIStore.getState().setFontSize("large");
      expect(useUIStore.getState().fontSize).toBe("large");
    });
  });
});
