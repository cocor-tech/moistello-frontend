import { describe, it, expect, vi, beforeEach } from "vitest"
import { EN_SEED } from "../en-seed"
import { loadLocaleWithRetry } from "../context"

describe("i18n lazy loading", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe("EN_SEED", () => {
    it("contains critical UI keys", () => {
      expect(EN_SEED["common.loading"]).toBeDefined()
      expect(EN_SEED["common.error"]).toBeDefined()
      expect(EN_SEED["common.retry"]).toBeDefined()
    })

    it("is small — under 30 keys", () => {
      expect(Object.keys(EN_SEED).length).toBeLessThan(30)
    })

    it("common.loading matches the full en.json value", () => {
      expect(EN_SEED["common.loading"]).toBe("Loading...")
    })

    it("has nav keys for immediate shell rendering", () => {
      expect(EN_SEED["nav.wallet"]).toBe("Wallet")
      expect(EN_SEED["nav.circles"]).toBe("Circles")
      expect(EN_SEED["nav.dashboard"]).toBe("Dashboard")
    })
  })

  describe("loadLocaleWithRetry", () => {
    it("fetches from /locale/{code}.json", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ "common.loading": "Chargement..." }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      const result = await loadLocaleWithRetry("fr")
      expect(fetchSpy).toHaveBeenCalledWith("/locale/fr.json")
      expect(result["common.loading"]).toBe("Chargement...")
    })

    it("throws after max retries when fetch keeps failing", async () => {
      vi.useFakeTimers()
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network error"))
      const promise = loadLocaleWithRetry("xx")
      const rejection = expect(promise).rejects.toThrow()
      // Advance through the retry delays
      await vi.advanceTimersByTimeAsync(10_000)
      await rejection
      expect(fetchSpy.mock.calls.length).toBeGreaterThanOrEqual(1)
      vi.useRealTimers()
    })

    it("returns the dict on first success", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ hello: "world" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      const result = await loadLocaleWithRetry("de")
      expect(result.hello).toBe("world")
    })
  })
})
