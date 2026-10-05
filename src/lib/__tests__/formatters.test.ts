import { describe, it, expect } from "vitest"
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatRelativeTime,
  DEFAULT_LOCALE,
} from "@/lib/formatters"

describe("formatCurrency", () => {
  it("defaults to en-US when no locale is passed", () => {
    expect(formatCurrency(10, "NGN")).toContain("10.00")
  })

  it("localizes grouping separators", () => {
    // en-US: comma thousands, dot decimals
    expect(formatCurrency(1234.5, "NGN", "en-US")).toBe("₦1,234.50")
    // de-DE: dot thousands, comma decimals (symbol position varies by ICU)
    expect(formatCurrency(1234.5, "NGN", "de-DE")).toContain("1.234,50")
    expect(formatCurrency(1234.5, "NGN", "de-DE")).toContain("₦")
  })

  it("renders XLM as a plain localized number, not a currency symbol", () => {
    expect(formatCurrency(1.234567, "XLM", "en-US")).toBe("1.2346 XLM")
  })

  it("does not throw on a Stellar asset, which is not an ISO 4217 code", () => {
    // `Intl.NumberFormat` raises a RangeError for any code it cannot resolve.
    // USDC is offered as a circle currency, so this is reachable from ordinary
    // use and used to take the whole render down rather than just misformat.
    expect(() => formatCurrency(500, "USDC", "en-US")).not.toThrow()
    expect(formatCurrency(500, "USDC", "en-US")).toBe("500.00 USDC")
  })

  it("falls back for any unresolvable asset code, not just the known ones", () => {
    expect(formatCurrency(42, "MYTOKEN", "en-US")).toBe("42.00 MYTOKEN")
    expect(formatCurrency(42, "not-a-currency", "en-US")).toBe("42.00 not-a-currency")
  })

  it("leaves real ISO currencies on the Intl path", () => {
    expect(formatCurrency(500, "USD", "en-US")).toBe("$500.00")
    expect(formatCurrency(500, "NGN", "en-US")).toContain("500.00")
  })
})

describe("formatDate", () => {
  it("honors the active locale month names", () => {
    const d = new Date("2024-03-05T12:00:00Z")
    expect(formatDate(d, undefined, "en-US")).toMatch(/Mar/)
    expect(formatDate(d, undefined, "fr")).toMatch(/mars/i)
  })

  it("honors explicit options while overriding locale", () => {
    const d = new Date("2024-03-05T12:00:00Z")
    expect(
      formatDate(d, { year: "numeric", month: "long", day: "numeric" }, "fr")
    ).toMatch(/2024/)
  })
})

describe("formatNumber", () => {
  it("groups according to the active locale", () => {
    expect(formatNumber(1234567, "en-US")).toBe("1,234,567")
    expect(formatNumber(1234567, "de-DE")).toBe("1.234.567")
  })

  it("defaults to DEFAULT_LOCALE", () => {
    expect(formatNumber(1000)).toBe(formatNumber(1000, DEFAULT_LOCALE))
  })
})

describe("formatRelativeTime", () => {
  it("returns an English relative string by default", () => {
    const s = formatRelativeTime(new Date(Date.now() - 5 * 60 * 1000))
    expect(typeof s).toBe("string")
    expect(s.length).toBeGreaterThan(0)
  })
})