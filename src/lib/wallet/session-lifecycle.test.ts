import { describe, expect, it } from "vitest"
import {
  SESSION_TTL_MS,
  computeSessionExpiry,
  filterExpiredSessions,
  isSessionExpired,
} from "./session-lifecycle"

describe("session-lifecycle", () => {
  describe("computeSessionExpiry", () => {
    it("returns now + SESSION_TTL_MS", () => {
      const now = 1_000_000
      expect(computeSessionExpiry(now)).toBe(now + SESSION_TTL_MS)
    })

    it("uses Date.now() when no argument is supplied", () => {
      const before = Date.now()
      const expiry = computeSessionExpiry()
      const after = Date.now()
      expect(expiry).toBeGreaterThanOrEqual(before + SESSION_TTL_MS)
      expect(expiry).toBeLessThanOrEqual(after + SESSION_TTL_MS)
    })
  })

  describe("isSessionExpired", () => {
    it("returns false when the session has not yet expired", () => {
      const now = 1_000_000
      const expiresAt = now + 1000
      expect(isSessionExpired(expiresAt, now)).toBe(false)
    })

    it("returns true when now is past expiresAt", () => {
      const now = 1_000_000
      const expiresAt = now - 1
      expect(isSessionExpired(expiresAt, now)).toBe(true)
    })

    it("returns false when now equals expiresAt exactly", () => {
      const now = 1_000_000
      expect(isSessionExpired(now, now)).toBe(false)
    })
  })

  describe("filterExpiredSessions", () => {
    it("keeps sessions whose lastConnected is within the TTL", () => {
      const now = SESSION_TTL_MS * 2
      const active = { lastConnected: now - 1000, id: "a" }
      const result = filterExpiredSessions([active], now)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe("a")
    })

    it("removes sessions whose lastConnected is older than the TTL", () => {
      const now = SESSION_TTL_MS * 2
      const stale = { lastConnected: now - SESSION_TTL_MS - 1, id: "b" }
      const result = filterExpiredSessions([stale], now)
      expect(result).toHaveLength(0)
    })

    it("returns an empty array for an empty input", () => {
      expect(filterExpiredSessions([], Date.now())).toHaveLength(0)
    })

    it("filters mixed active and expired sessions correctly", () => {
      const now = SESSION_TTL_MS * 2
      const sessions = [
        { lastConnected: now - 1000, id: "active" },
        { lastConnected: now - SESSION_TTL_MS - 1, id: "stale" },
      ]
      const result = filterExpiredSessions(sessions, now)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe("active")
    })

    it("preserves extra fields on the session objects", () => {
      const now = SESSION_TTL_MS * 2
      const session = { lastConnected: now - 500, id: "x", extra: "data" }
      const result = filterExpiredSessions([session], now)
      expect(result[0].extra).toBe("data")
    })
  })
})
