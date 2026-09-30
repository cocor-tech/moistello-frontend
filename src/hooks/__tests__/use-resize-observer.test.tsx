import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useResizeObserver } from "../use-resize-observer"

describe("useResizeObserver", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it("returns ref and initial dimensions", () => {
    const { result } = renderHook(() => useResizeObserver({ debounceMs: 50 }))
    expect(result.current.ref).toBeDefined()
    expect(result.current.width).toBe(0)
    expect(result.current.height).toBe(0)
  })
})
