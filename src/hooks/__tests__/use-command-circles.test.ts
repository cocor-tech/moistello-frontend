import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { get } from "@/lib/api-client";
import { useCommandCircles } from "../use-command-circles";
import { createQueryWrapper } from "./test-utils";

vi.mock("@/lib/api-client", () => ({ get: vi.fn() }));
const mockedGet = vi.mocked(get);

describe("useCommandCircles", () => {
  it("unwraps circles and defaults a missing name/status", async () => {
    mockedGet.mockResolvedValue({
      data: { circles: [{ id: "c1", name: { Valid: true, String: "Test" } }, { id: "c2" }] },
    });
    const { QueryWrapper } = createQueryWrapper();
    const { result } = renderHook(() => useCommandCircles(true), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([
      { id: "c1", name: "Test", status: undefined },
      { id: "c2", name: "Untitled circle", status: undefined },
    ]);
  });

  it("stays disabled and never fetches when enabled is false", () => {
    const { QueryWrapper } = createQueryWrapper();
    renderHook(() => useCommandCircles(false), { wrapper: QueryWrapper });

    expect(mockedGet).not.toHaveBeenCalled();
  });
});
