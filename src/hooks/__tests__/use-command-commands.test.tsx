import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useCommandCommands } from "../use-command-commands";

// Mock dependencies
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSetTheme = vi.fn();
const mockSetDensity = vi.fn();
const mockSetFontSize = vi.fn();
const mockSetCommandPaletteOpen = vi.fn();
vi.mock("@/stores/ui-store", () => ({
  useUIStore: (selector: any) => {
    const state = {
      setTheme: mockSetTheme,
      setDensity: mockSetDensity,
      setFontSize: mockSetFontSize,
      setCommandPaletteOpen: mockSetCommandPaletteOpen,
    };
    return selector(state);
  },
}));

const mockLogout = vi.fn();
vi.mock("@/stores/auth-store", () => ({
  useAuthStore: (selector: any) => {
    const state = { logout: mockLogout };
    return selector(state);
  },
}));

vi.mock("@/hooks/use-command-circles", () => ({
  useCommandCircles: (isOpen: boolean) => ({
    data: isOpen ? [{ id: "circle-1", name: "Test Circle", status: "active" }] : [],
    isLoading: false,
  }),
}));

const mockRecordUse = vi.fn();
vi.mock("@/hooks/use-recent-commands", () => ({
  useRecentCommands: () => ({
    recentIds: ["nav.circles", "nav.wallet"],
    recordUse: mockRecordUse,
  }),
}));

vi.mock("@/components/command-palette/commands", () => ({
  NAVIGATION_COMMANDS: [
    { id: "nav.circles", label: "Circles", group: "page", href: "/circles", keywords: "circles home" },
    { id: "nav.wallet", label: "Wallet", group: "page", href: "/wallet", keywords: "wallet funds" },
  ],
  ACTION_COMMANDS: [
    { id: "action.theme", label: "Toggle theme", group: "action", apply: (api: any) => api.setTheme("dark") },
  ],
}));

vi.mock("@/lib/constants", () => ({
  Routes: {
    CIRCLE_DETAIL: (id: string) => `/circles/${id}`,
  },
}));

describe("useCommandCommands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns commands array when closed", () => {
    const { result } = renderHook(() => useCommandCommands(false));

    expect(result.current.commands).toBeDefined();
    expect(Array.isArray(result.current.commands)).toBe(true);
    expect(result.current.isLoadingCircles).toBe(false);
  });

  it("includes navigation commands in results", () => {
    const { result } = renderHook(() => useCommandCommands(false));

    const circlesCommand = result.current.commands.find((c) => c.id === "nav.circles");
    expect(circlesCommand).toBeDefined();
    expect(circlesCommand?.label).toBe("Circles");
  });

  it("includes action commands in results", () => {
    const { result } = renderHook(() => useCommandCommands(false));

    const themeCommand = result.current.commands.find((c) => c.id === "action.theme");
    expect(themeCommand).toBeDefined();
    expect(themeCommand?.label).toBe("Toggle theme");
  });

  it("includes circle commands when palette is open", () => {
    const { result } = renderHook(() => useCommandCommands(true));

    const circleCommand = result.current.commands.find((c) => c.id === "circle.circle-1");
    expect(circleCommand).toBeDefined();
    expect(circleCommand?.label).toBe("Test Circle");
  });

  it("navigates when running a navigation command", () => {
    const { result } = renderHook(() => useCommandCommands(false));

    const circlesCommand = result.current.commands.find((c) => c.id === "nav.circles");
    expect(circlesCommand).toBeDefined();

    act(() => {
      result.current.runCommand(circlesCommand!);
    });

    expect(mockPush).toHaveBeenCalledWith("/circles");
    expect(mockSetCommandPaletteOpen).toHaveBeenCalledWith(false);
    expect(mockRecordUse).toHaveBeenCalledWith("nav.circles");
  });

  it("executes action when running an action command", () => {
    const { result } = renderHook(() => useCommandCommands(false));

    const themeCommand = result.current.commands.find((c) => c.id === "action.theme");
    expect(themeCommand).toBeDefined();

    act(() => {
      result.current.runCommand(themeCommand!);
    });

    expect(mockSetTheme).toHaveBeenCalledWith("dark");
    expect(mockSetCommandPaletteOpen).toHaveBeenCalledWith(false);
    expect(mockRecordUse).toHaveBeenCalledWith("action.theme");
  });

  it("returns recent commands that exist in registry", () => {
    const { result } = renderHook(() => useCommandCommands(false));

    expect(result.current.recentCommands).toBeDefined();
    expect(result.current.recentCommands.length).toBeGreaterThan(0);
    
    const recentCircles = result.current.recentCommands.find((c) => c.id === "nav.circles");
    expect(recentCircles).toBeDefined();
  });

  it("filters out stale recent command ids", () => {
    vi.mocked(vi.fn()).mockReturnValue({
      recentIds: ["nav.circles", "stale-command-id"],
      recordUse: mockRecordUse,
    });

    const { result } = renderHook(() => useCommandCommands(false));

    const staleCommand = result.current.recentCommands.find((c) => c.id === "stale-command-id");
    expect(staleCommand).toBeUndefined();
  });

  it("navigates to circle detail when running circle command", () => {
    const { result } = renderHook(() => useCommandCommands(true));

    const circleCommand = result.current.commands.find((c) => c.id === "circle.circle-1");
    expect(circleCommand).toBeDefined();

    act(() => {
      result.current.runCommand(circleCommand!);
    });

    expect(mockPush).toHaveBeenCalledWith("/circles/circle-1");
  });
});
