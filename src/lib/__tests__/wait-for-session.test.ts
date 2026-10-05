import { describe, it, expect, vi } from "vitest"
import { waitForSessionEstablished } from "@/lib/wait-for-session"

describe("waitForSessionEstablished (issue #494)", () => {
  it("resolves true immediately when the session is already established", async () => {
    const check = vi.fn().mockResolvedValue(true)
    const result = await waitForSessionEstablished(check, { delayMs: 0 })
    expect(result).toBe(true)
    expect(check).toHaveBeenCalledTimes(1)
  })

  it("retries and succeeds once the session establishes on a later attempt", async () => {
    const check = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(false).mockResolvedValueOnce(true)
    const result = await waitForSessionEstablished(check, { maxAttempts: 5, delayMs: 0 })
    expect(result).toBe(true)
    expect(check).toHaveBeenCalledTimes(3)
  })

  it("gives up after maxAttempts instead of retrying forever", async () => {
    const check = vi.fn().mockResolvedValue(false)
    const result = await waitForSessionEstablished(check, { maxAttempts: 3, delayMs: 0 })
    expect(result).toBe(false)
    expect(check).toHaveBeenCalledTimes(3)
  })
})
