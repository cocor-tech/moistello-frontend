import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  HmacKeyNotReadyError,
  _setHmacKeyForTest,
  clearHmacKeyCache,
  ensureHmacKey,
  isHmacKeyReady,
  withHmacKey,
  computeHmacSha256Sync,
  computeHmacSha256,
} from "../hmac"
import { logger } from "@/lib/logger"

const SAMPLE_KEY_HEX =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

describe("wallet hmac module", () => {
  beforeEach(() => {
    clearHmacKeyCache()
    localStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    clearHmacKeyCache()
    localStorage.clear()
    vi.restoreAllMocks()
  })

  describe("HmacKeyNotReadyError", () => {
    it("constructs with expected name and message", () => {
      const err = new HmacKeyNotReadyError()
      expect(err).toBeInstanceOf(Error)
      expect(err.name).toBe("HmacKeyNotReadyError")
      expect(err.message).toBe("HMAC key is not loaded yet")
    })
  })

  describe("computeHmacSha256Sync", () => {
    it("throws HmacKeyNotReadyError if no key is set", () => {
      expect(() => computeHmacSha256Sync("test-payload")).toThrow(
        HmacKeyNotReadyError,
      )
    })

    it("computes deterministic HMAC when key is set", () => {
      _setHmacKeyForTest(SAMPLE_KEY_HEX)
      expect(isHmacKeyReady()).toBe(true)

      const sig1 = computeHmacSha256Sync("test-payload")
      const sig2 = computeHmacSha256Sync("test-payload")

      expect(typeof sig1).toBe("string")
      expect(sig1.length).toBe(64) // SHA-256 hex is 64 chars
      expect(sig1).toBe(sig2)

      const sigDifferent = computeHmacSha256Sync("different-payload")
      expect(sigDifferent).not.toBe(sig1)
    })
  })

  describe("clearHmacKeyCache", () => {
    it("clears memory cache and localStorage keys", () => {
      _setHmacKeyForTest(SAMPLE_KEY_HEX)
      localStorage.setItem("wallet:hmac:key", SAMPLE_KEY_HEX)
      localStorage.setItem("wallet:hmac:key:ts", String(Date.now()))

      expect(isHmacKeyReady()).toBe(true)

      clearHmacKeyCache()

      expect(isHmacKeyReady()).toBe(false)
      expect(localStorage.getItem("wallet:hmac:key")).toBeNull()
      expect(localStorage.getItem("wallet:hmac:key:ts")).toBeNull()
    })
  })

  describe("ensureHmacKey and localStorage caching", () => {
    it("restores valid unexpired key from localStorage without fetch", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch")
      localStorage.setItem("wallet:hmac:key", SAMPLE_KEY_HEX)
      localStorage.setItem("wallet:hmac:key:ts", String(Date.now()))

      const key = await ensureHmacKey()

      expect(key).not.toBeNull()
      expect(fetchSpy).not.toHaveBeenCalled()
      expect(isHmacKeyReady()).toBe(true)
    })

    it("evicts expired key from localStorage (> 24h) and fetches fresh key", async () => {
      const expiredTs = Date.now() - 25 * 60 * 60 * 1000 // 25 hours ago
      localStorage.setItem("wallet:hmac:key", SAMPLE_KEY_HEX)
      localStorage.setItem("wallet:hmac:key:ts", String(expiredTs))

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ keyHex: SAMPLE_KEY_HEX }),
      } as Response)

      const key = await ensureHmacKey()

      expect(fetchSpy).toHaveBeenCalledWith("/api/wallet/hmac/key")
      expect(key).not.toBeNull()
      expect(Number(localStorage.getItem("wallet:hmac:key:ts"))).toBeGreaterThan(
        expiredTs,
      )
    })

    it("fetches key from server when cache is empty and saves to storage", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ keyHex: SAMPLE_KEY_HEX }),
      } as Response)

      const key = await ensureHmacKey()

      expect(fetchSpy).toHaveBeenCalledWith("/api/wallet/hmac/key")
      expect(key).not.toBeNull()
      expect(localStorage.getItem("wallet:hmac:key")).toBe(SAMPLE_KEY_HEX)
      expect(localStorage.getItem("wallet:hmac:key:ts")).toBeTruthy()
    })

    it("handles fetch failure gracefully, logs warning, and returns null", async () => {
      const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {})
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        status: 500,
      } as Response)

      const key = await ensureHmacKey()

      expect(key).toBeNull()
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("[hmac] Failed to load key"),
        expect.any(Error),
      )
    })

    it("deduplicates concurrent fetches", async () => {
      let resolveFetch!: (res: Response) => void
      const fetchPromise = new Promise<Response>((resolve) => {
        resolveFetch = resolve
      })
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockReturnValue(fetchPromise)

      const p1 = ensureHmacKey()
      const p2 = ensureHmacKey()

      resolveFetch({
        ok: true,
        json: async () => ({ keyHex: SAMPLE_KEY_HEX }),
      } as Response)

      const [k1, k2] = await Promise.all([p1, p2])

      expect(fetchSpy).toHaveBeenCalledTimes(1)
      expect(k1).toEqual(k2)
    })
  })

  describe("computeHmacSha256 (async)", () => {
    it("computes HMAC successfully using fetched key", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ keyHex: SAMPLE_KEY_HEX }),
      } as Response)

      const hmac = await computeHmacSha256("async-test-payload")
      expect(typeof hmac).toBe("string")
      expect(hmac.length).toBe(64)
    })

    it("throws HmacKeyNotReadyError when key cannot be obtained", async () => {
      vi.spyOn(logger, "warn").mockImplementation(() => {})
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"))

      await expect(computeHmacSha256("async-test-payload")).rejects.toThrow(
        HmacKeyNotReadyError,
      )
    })
  })

  describe("withHmacKey", () => {
    it("runs callback immediately if key is already cached", () => {
      _setHmacKeyForTest(SAMPLE_KEY_HEX)
      const callback = vi.fn()

      withHmacKey(callback)

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith(expect.any(Uint8Array))
    })

    it("defers execution until key is loaded, then flushes queued writes in order", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ keyHex: SAMPLE_KEY_HEX }),
      } as Response)

      const order: number[] = []
      const cb1 = vi.fn(() => order.push(1))
      const cb2 = vi.fn(() => order.push(2))

      withHmacKey(cb1)
      withHmacKey(cb2)

      expect(cb1).not.toHaveBeenCalled()
      expect(cb2).not.toHaveBeenCalled()

      // Allow microtasks to resolve fetch and callbacks
      await new Promise((r) => setTimeout(r, 10))

      expect(cb1).toHaveBeenCalledTimes(1)
      expect(cb2).toHaveBeenCalledTimes(1)
      expect(order).toEqual([1, 2])
    })

    it("drops queued writes without calling them if key fetch fails", async () => {
      vi.spyOn(logger, "warn").mockImplementation(() => {})
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Fetch failed"))

      const callback = vi.fn()
      withHmacKey(callback)

      await new Promise((r) => setTimeout(r, 10))

      expect(callback).not.toHaveBeenCalled()
    })
  })
})
