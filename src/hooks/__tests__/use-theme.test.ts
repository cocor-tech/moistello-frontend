import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTheme } from "../use-theme";
import { useUIStore } from "@/stores/ui-store";

describe("useTheme hook", () => {
  type MatchMediaListener = (e: { matches: boolean }) => void;
  let listeners: MatchMediaListener[] = [];
  let matchesDark = false;

  beforeEach(() => {
    listeners = [];
    matchesDark = false;
    localStorage.clear();

    useUIStore.setState({
      theme: "system",
      density: "comfortable",
      fontSize: "medium",
      sidebarOpen: false,
      commandPaletteOpen: false,
      toasts: [],
    });

    vi.stubGlobal("matchMedia", (query: string) => ({
      get matches() {
        return query === "(prefers-color-scheme: dark)" ? matchesDark : false;
      },
      media: query,
      onchange: null,
      addEventListener: vi.fn((_type: string, listener: MatchMediaListener) => {
        listeners.push(listener);
      }),
      removeEventListener: vi.fn((_type: string, listener: MatchMediaListener) => {
        listeners = listeners.filter((l) => l !== listener);
      }),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects system light preference when theme is system", () => {
    matchesDark = false;
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("system");
    expect(result.current.systemTheme).toBe("light");
    expect(result.current.resolvedTheme).toBe("light");
    expect(result.current.isDark).toBe(false);
    expect(result.current.mounted).toBe(true);
  });

  it("detects system dark preference when theme is system", () => {
    matchesDark = true;
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("system");
    expect(result.current.systemTheme).toBe("dark");
    expect(result.current.resolvedTheme).toBe("dark");
    expect(result.current.isDark).toBe(true);
  });

  it("allows manual override to dark mode", () => {
    matchesDark = false;
    const { result } = renderHook(() => useTheme());

    expect(result.current.resolvedTheme).toBe("light");

    act(() => {
      result.current.setTheme("dark");
    });

    expect(result.current.theme).toBe("dark");
    expect(result.current.resolvedTheme).toBe("dark");
    expect(result.current.isDark).toBe(true);
    expect(useUIStore.getState().theme).toBe("dark");
  });

  it("allows manual override to light mode", () => {
    matchesDark = true;
    const { result } = renderHook(() => useTheme());

    expect(result.current.resolvedTheme).toBe("dark");

    act(() => {
      result.current.setTheme("light");
    });

    expect(result.current.theme).toBe("light");
    expect(result.current.resolvedTheme).toBe("light");
    expect(result.current.isDark).toBe(false);
    expect(useUIStore.getState().theme).toBe("light");
  });

  it("dynamically updates resolvedTheme when system preference changes and theme is system", () => {
    matchesDark = false;
    const { result } = renderHook(() => useTheme());

    expect(result.current.resolvedTheme).toBe("light");

    act(() => {
      matchesDark = true;
      listeners.forEach((listener) => listener({ matches: true }));
    });

    expect(result.current.systemTheme).toBe("dark");
    expect(result.current.resolvedTheme).toBe("dark");
    expect(result.current.isDark).toBe(true);
  });

  it("does not alter manual override when system preference changes", () => {
    matchesDark = false;
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme("light");
    });

    expect(result.current.resolvedTheme).toBe("light");

    act(() => {
      matchesDark = true;
      listeners.forEach((listener) => listener({ matches: true }));
    });

    expect(result.current.systemTheme).toBe("dark");
    expect(result.current.resolvedTheme).toBe("light");
    expect(result.current.isDark).toBe(false);
  });

  it("toggles through the theme cycle light -> dark -> system", () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme("light");
    });
    expect(result.current.theme).toBe("light");

    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe("dark");

    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe("system");

    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe("light");
  });
});
