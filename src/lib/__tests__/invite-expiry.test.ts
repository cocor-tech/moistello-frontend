import { describe, expect, it } from "vitest"
import {
  describeInviteProblem,
  formatTimeRemaining,
  inviteStatus,
  isInviteExhausted,
  isInviteExpired,
  msUntilExpiry,
} from "../invite-expiry"

const NOW = new Date("2026-01-15T12:00:00.000Z").getTime()
const HOUR = 3_600_000

describe("msUntilExpiry", () => {
  it("returns the time remaining", () => {
    expect(msUntilExpiry("2026-01-15T13:00:00.000Z", NOW)).toBe(HOUR)
  })

  it("never returns a negative value for a past expiry", () => {
    // A raw difference would be negative and would render as a countdown that
    // starts below zero; the join page decides on the boolean separately.
    expect(msUntilExpiry("2026-01-15T11:00:00.000Z", NOW)).toBe(0)
  })

  it("treats a missing or unparseable expiry as no time left", () => {
    expect(msUntilExpiry(null, NOW)).toBe(0)
    expect(msUntilExpiry("not-a-date", NOW)).toBe(0)
  })
})

describe("isInviteExpired", () => {
  it("is false before the expiry", () => {
    expect(isInviteExpired("2026-01-15T13:00:00.000Z", NOW)).toBe(false)
  })

  it("is true at and after the expiry", () => {
    // Exactly at the boundary counts as expired, not active.
    expect(isInviteExpired("2026-01-15T12:00:00.000Z", NOW)).toBe(true)
    expect(isInviteExpired("2026-01-15T11:00:00.000Z", NOW)).toBe(true)
  })

  it("treats a null expiry as never expiring", () => {
    expect(isInviteExpired(null, NOW)).toBe(false)
  })

  it("fails closed on an unparseable expiry", () => {
    // If we cannot tell when it expires we must not grant access on a guess.
    expect(isInviteExpired("garbage", NOW)).toBe(true)
  })
})

describe("isInviteExhausted", () => {
  it("is true once the allowance is used up", () => {
    expect(isInviteExhausted({ useCount: 5, maxUses: 5 })).toBe(true)
    expect(isInviteExhausted({ useCount: 6, maxUses: 5 })).toBe(true)
  })

  it("is false while uses remain", () => {
    expect(isInviteExhausted({ useCount: 4, maxUses: 5 })).toBe(false)
  })
})

describe("inviteStatus", () => {
  it("is active when there is time and uses left", () => {
    expect(
      inviteStatus({ expiresAt: "2026-01-15T13:00:00.000Z", useCount: 1, maxUses: 5 }, NOW),
    ).toBe("active")
  })

  it("is expired when past its expiry", () => {
    expect(
      inviteStatus({ expiresAt: "2026-01-15T11:00:00.000Z", useCount: 0, maxUses: 5 }, NOW),
    ).toBe("expired")
  })

  it("is exhausted when all uses are taken", () => {
    expect(
      inviteStatus({ expiresAt: "2026-01-15T13:00:00.000Z", useCount: 5, maxUses: 5 }, NOW),
    ).toBe("exhausted")
  })

  it("reports expiry ahead of exhaustion when both apply", () => {
    // Both are true, but "expired" is the actionable reason: asking for a fresh
    // link fixes it, whereas "exhausted" implies waiting for someone else.
    expect(
      inviteStatus({ expiresAt: "2026-01-15T11:00:00.000Z", useCount: 5, maxUses: 5 }, NOW),
    ).toBe("expired")
  })

  it("is active for an invite that never expires", () => {
    expect(inviteStatus({ expiresAt: null, useCount: 0, maxUses: 5 }, NOW)).toBe("active")
  })
})

describe("formatTimeRemaining", () => {
  it.each([
    [HOUR + 30 * 60_000, "1h 30m"],
    [2 * HOUR, "2h 0m"],
    [30 * 60_000, "30m"],
    [45_000, "less than a minute"],
    [25 * HOUR, "1d 1h"],
  ])("formats %i ms as %s", (ms, expected) => {
    expect(formatTimeRemaining(ms)).toBe(expected)
  })

  it("drops the leading unit so the label stays short as it runs down", () => {
    // "0h 5m" reads worse than "5m" in a ticking countdown.
    expect(formatTimeRemaining(5 * 60_000)).toBe("5m")
  })

  it("says Expired at or below zero", () => {
    expect(formatTimeRemaining(0)).toBe("Expired")
    expect(formatTimeRemaining(-1)).toBe("Expired")
    expect(formatTimeRemaining(Number.NaN)).toBe("Expired")
  })
})

describe("describeInviteProblem", () => {
  it("names the actual reason rather than a generic failure", () => {
    expect(describeInviteProblem("expired")).toMatch(/expired/i)
    expect(describeInviteProblem("exhausted")).toMatch(/maximum number of times/i)
  })

  it("tells an expired recipient to request a new link", () => {
    expect(describeInviteProblem("expired")).toMatch(/new one/i)
  })
})
