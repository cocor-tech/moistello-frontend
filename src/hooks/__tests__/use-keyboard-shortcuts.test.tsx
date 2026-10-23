import { renderHook, waitFor, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useKeyboardShortcuts } from "../use-keyboard-shortcuts";

// Mock Next.js router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock UI store
const mockToggleTheme = vi.fn();
const mockToggleSidebar = vi.fn();
const mockSetCommandPaletteOpen = vi.fn();
vi.mock("@/stores/ui-store", () => ({
  useUIStore: (selector: any) => {
    const state = {
      toggleTheme: mockToggleTheme,
      toggleSidebar: mockToggleSidebar,
      setCommandPaletteOpen: mockSetCommandPaletteOpen,
    };
    return selector(state);
  },
}));

describe("useKeyboardShortcuts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("returns shortcuts array and help state", () => {
    const { result } = renderHook(() => useKeyboardShortcuts());

    expect(result.current.shortcuts).toBeDefined();
    expect(Array.isArray(result.current.shortcuts)).toBe(true);
    expect(result.current.shortcuts.length).toBeGreaterThan(0);
    expect(result.current.helpOpen).toBe(false);
    expect(typeof result.current.closeHelp).toBe("function");
  });

  it("opens help overlay on '?' key press", () => {
    const { result } = renderHook(() => useKeyboardShortcuts());

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "?" });
      document.dispatchEvent(event);
    });

    expect(result.current.helpOpen).toBe(true);
  });

  it("closes help overlay with closeHelp callback", () => {
    const { result } = renderHook(() => useKeyboardShortcuts());

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "?" });
      document.dispatchEvent(event);
    });

    expect(result.current.helpOpen).toBe(true);

    act(() => {
      result.current.closeHelp();
    });

    expect(result.current.helpOpen).toBe(false);
  });

  it("closes help overlay on Escape key", () => {
    const { result } = renderHook(() => useKeyboardShortcuts());

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }));
    });

    expect(result.current.helpOpen).toBe(true);

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(result.current.helpOpen).toBe(false);
  });

  it("toggles theme on 't' key press", () => {
    renderHook(() => useKeyboardShortcuts());

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "t" }));
    });

    expect(mockToggleTheme).toHaveBeenCalledOnce();
  });

  it("toggles sidebar on 'b' key press", () => {
    renderHook(() => useKeyboardShortcuts());

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "b" }));
    });

    expect(mockToggleSidebar).toHaveBeenCalledOnce();
  });

  it("navigates to circles on 'c' key press", () => {
    renderHook(() => useKeyboardShortcuts());

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "c" }));
    });

    expect(mockPush).toHaveBeenCalledWith("/circles/create");
  });

  it("handles 'g h' chord to navigate to home", () => {
    renderHook(() => useKeyboardShortcuts());

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "g" }));
    });

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "h" }));
    });

    expect(mockPush).toHaveBeenCalledWith("/circles");
  });

  it("handles 'g w' chord to navigate to wallet", () => {
    renderHook(() => useKeyboardShortcuts());

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "g" }));
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "w" }));
    });

    expect(mockPush).toHaveBeenCalledWith("/wallet");
  });

  it("ignores shortcuts when typing in input fields", () => {
    renderHook(() => useKeyboardShortcuts());

    const input = document.createElement("input");
    document.body.appendChild(input);

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "t", bubbles: true });
      Object.defineProperty(event, "target", { value: input, enumerable: true });
      document.dispatchEvent(event);
    });

    expect(mockToggleTheme).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it("ignores shortcuts with modifier keys", () => {
    renderHook(() => useKeyboardShortcuts());

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "t", ctrlKey: true })
      );
    });

    expect(mockToggleTheme).not.toHaveBeenCalled();

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "t", metaKey: true })
      );
    });

    expect(mockToggleTheme).not.toHaveBeenCalled();
  });

  it("resets 'g' prefix after timeout", () => {
    renderHook(() => useKeyboardShortcuts());

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "g" }));
    });

    act(() => {
      vi.advanceTimersByTime(1100); // Wait beyond 1000ms timeout
    });

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "h" }));
    });

    // Should not navigate since prefix timed out
    expect(mockPush).not.toHaveBeenCalledWith("/circles");
  });

  it("cleans up event listener on unmount", () => {
    const spy = vi.spyOn(document, "removeEventListener");
    const { unmount } = renderHook(() => useKeyboardShortcuts());

    unmount();

    expect(spy).toHaveBeenCalledWith("keydown", expect.any(Function));
    spy.mockRestore();
  });
});
