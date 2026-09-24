import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useToast } from "@/hooks/use-toast";
import { useUIStore } from "@/stores/ui-store";

describe("useToast", () => {
  beforeEach(() => {
    useUIStore.setState({
      theme: "system",
      density: "comfortable",
      fontSize: "medium",
      sidebarOpen: false,
      toasts: [],
    });
  });

  it("pushes a success toast", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useToast());
    act(() => result.current.success("Saved!"));
    const toasts = useUIStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].type).toBe("success");
    expect(toasts[0].title).toBe("Saved!");
    vi.useRealTimers();
  });

  it("pushes an error toast with description", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useToast());
    act(() => result.current.error("Failed", "Insufficient balance"));
    const toasts = useUIStore.getState().toasts;
    expect(toasts[0].type).toBe("error");
    expect(toasts[0].title).toBe("Failed");
    expect(toasts[0].description).toBe("Insufficient balance");
    vi.useRealTimers();
  });

  it("pushes warning and info toasts", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useToast());
    act(() => result.current.warning("Heads up"));
    act(() => result.current.info("FYI"));
    const types = useUIStore.getState().toasts.map((t) => t.type);
    expect(types).toEqual(["warning", "info"]);
    vi.useRealTimers();
  });

  it("dismisses a toast by id", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useToast());
    act(() => result.current.info("Gone soon"));
    const id = useUIStore.getState().toasts[0].id;
    act(() => result.current.dismiss(id));
    expect(useUIStore.getState().toasts).toEqual([]);
    vi.useRealTimers();
  });
});