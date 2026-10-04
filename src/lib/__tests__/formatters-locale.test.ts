import { describe, it, expect } from "vitest"
import type { Locale } from "date-fns"
import {
  formatRelativeTime,
  formatDate,
} from "../formatters"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a Date that is `minutes` minutes in the past. */
function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60 * 1000)
}

// A minimal mock that satisfies the `Locale` interface enough for date-fns
// to accept it and produce a recognisable string.
const mockFrLocale: Locale = {
  code: "fr",
  formatDistance: (token: string, count: number) => {
    const map: Record<string, string> = {
      lessThanXMinutes: `moins de ${count} minute(s)`,
      xMinutes: `${count} minute(s)`,
      aboutXHours: `environ ${count} heure(s)`,
      xDays: `${count} jour(s)`,
    }
    return map[token] ?? token
  },
  formatLong: {
    date: () => "dd/MM/yyyy",
    time: () => "HH:mm:ss",
    dateTime: () => "dd/MM/yyyy HH:mm:ss",
  },
  formatRelative: () => "",
  localize: {
    ordinalNumber: (n: number) => String(n),
    era: () => "",
    quarter: () => "",
    month: () => "",
    day: () => "",
    dayPeriod: () => "",
  },
  match: {
    ordinalNumber: () => ({ value: 0, rest: "" }),
    era: () => null,
    quarter: () => null,
    month: () => null,
    day: () => null,
    dayPeriod: () => null,
  },
  options: {
    weekStartsOn: 1,
    firstWeekContainsDate: 4,
  },
} as unknown as Locale

// ---------------------------------------------------------------------------
// formatRelativeTime
// ---------------------------------------------------------------------------

describe("formatRelativeTime", () => {
  it("returns an English relative string by default (no locale provided)", () => {
    const date = minutesAgo(5)
    const result = formatRelativeTime(date)
    // date-fns en-US default — "5 minutes ago"
    expect(result).toMatch(/minute(s)? ago/i)
  })

  it("accepts a Date object and adds suffix", () => {
    const date = minutesAgo(2)
    const result = formatRelativeTime(date)
    expect(result).toContain("ago")
  })

  it("accepts a date string and adds suffix", () => {
    const date = minutesAgo(3)
    const result = formatRelativeTime(date.toISOString())
    expect(result).toContain("ago")
  })

  it("uses the provided French locale mock", () => {
    const date = minutesAgo(5)
    const result = formatRelativeTime(date, mockFrLocale)
    // Our mock formatDistance maps "xMinutes" → "5 minute(s)"
    expect(result).toMatch(/minute/i)
  })

  it("falls back gracefully when locale object is undefined", () => {
    const date = minutesAgo(10)
    const result = formatRelativeTime(date, undefined)
    // Should return the default English string, not throw
    expect(typeof result).toBe("string")
    expect(result.length).toBeGreaterThan(0)
  })

  it("returns an empty string when the date is invalid", () => {
    // NaN timestamp is guarded up front, so neither the relative formatter
    // nor the absolute-date fallback is ever reached.
    const result = formatRelativeTime(new Date(NaN))
    expect(typeof result).toBe("string")
    expect(result).toBe("")
  })
})

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------

describe("formatDate", () => {
  it("formats using en-US by default", () => {
    const date = new Date("2024-03-15T12:00:00Z")
    const result = formatDate(date)
    // e.g. "Mar 15, 2024"
    expect(result).toMatch(/2024/)
    expect(result).toMatch(/15/)
  })

  it("formats using the supplied locale code", () => {
    const date = new Date("2024-03-15T12:00:00Z")
    // fr locale spells March differently
    const fr = formatDate(date, undefined, "fr")
    const enUS = formatDate(date, undefined, "en-US")
    // Both should contain the year
    expect(fr).toMatch(/2024/)
    expect(enUS).toMatch(/2024/)
  })

  it("accepts custom DateTimeFormat options", () => {
    const date = new Date("2024-03-15T12:00:00Z")
    const result = formatDate(date, { month: "long" }, "en-US")
    expect(result).toMatch(/March/i)
  })

  it("accepts a date string", () => {
    const result = formatDate("2024-06-01")
    expect(result).toMatch(/2024/)
  })

  it("falls back to en-US when locale code is undefined", () => {
    const date = new Date("2024-03-15T12:00:00Z")
    const result = formatDate(date, undefined, undefined)
    expect(result).toMatch(/2024/)
  })
})
