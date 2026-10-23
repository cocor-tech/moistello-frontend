import { describe, it, expect, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useSubmitGuard } from "../use-submit-guard"

describe("useSubmitGuard hook (#479)", () => {
  it("prevents double-submission on rapid concurrent interactions", async () => {
    let callCount = 0
    let resolveFn: (val: string) => void

    const slowSubmit = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          callCount++
          resolveFn = resolve
        }),
    )

    const { result } = renderHook(() => useSubmitGuard())
    const guarded = result.current.guard(slowSubmit)

    // Fire two rapid invocations before the first completes
    const p1 = guarded()
    const p2 = guarded()

    // Second call should have been ignored (guard returned undefined)
    expect(callCount).toBe(1)
    expect(result.current.isPending).toBe(true)

    // Resolve first
    act(() => {
      resolveFn("done")
    })
    await p1
    await p2

    expect(result.current.isPending).toBe(false)
    expect(callCount).toBe(1)
  })

  it("provides visible pending state and maintains idempotency key", async () => {
    const { result } = renderHook(() => useSubmitGuard())
    expect(result.current.isPending).toBe(false)
    expect(result.current.idempotencyKey).toBeTruthy()

    let resolvePromise: () => void
    const promise = new Promise<void>((res) => {
      resolvePromise = res
    })

    const wrapped = result.current.guard(async () => {
      await promise
      return "success"
    })

    const inFlight = wrapped()
    expect(result.current.isPending).toBe(true)

    act(() => {
      resolvePromise()
    })
    const res = await inFlight

    expect(res).toBe("success")
    expect(result.current.isPending).toBe(false)
  })

  it("releases lock and resets pending state on error", async () => {
    const { result } = renderHook(() => useSubmitGuard())
    const failingSubmit = vi.fn().mockRejectedValue(new Error("Network Error"))

    const guarded = result.current.guard(failingSubmit)

    await expect(guarded()).rejects.toThrow("Network Error")
    expect(result.current.isPending).toBe(false)

    // Can submit again after failure
    const successSubmit = vi.fn().mockResolvedValue("recovered")
    const guardedSuccess = result.current.guard(successSubmit)
    const res = await guardedSuccess()

    expect(res).toBe("recovered")
  })
})
