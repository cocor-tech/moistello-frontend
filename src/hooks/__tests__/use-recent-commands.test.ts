import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useRecentCommands } from "../use-recent-commands";

const STORAGE_KEY = "moistello_recent_commands";

describe("useRecentCommands", () => {
  beforeEach(() => window.localStorage.clear());

  it("records a use at the front, deduping repeats, and persists it", () => {
    const { result } = renderHook(() => useRecentCommands());

    act(() => result.current.recordUse("a"));
    act(() => result.current.recordUse("b"));
    act(() => result.current.recordUse("a"));

    expect(result.current.recentIds).toEqual(["a", "b"]);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)).toEqual(["a", "b"]);
  });

  it("clears recents from state and storage", () => {
    const { result } = renderHook(() => useRecentCommands());
    act(() => result.current.recordUse("a"));

    act(() => result.current.clear());

    expect(result.current.recentIds).toEqual([]);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("[]");
  });
});
