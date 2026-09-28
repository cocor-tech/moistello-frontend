import { describe, expect, it } from "vitest"
import { formatCurrency } from "../formatters"

/**
 * `Currency` in this app is `"USDC" | "XLM"`, and `Intl` only accepts
 * three-letter ISO 4217 codes. Passing `"USDC"` used to throw a `RangeError`,
 * taking down every screen that rendered a USDC amount.
 */
describe("formatCurrency with non-ISO currency codes", () => {
  it("renders USDC instead of throwing", () => {
    expect(() => formatCurrency(100, "USDC")).not.toThrow()
    expect(formatCurrency(100, "USDC")).toBe("100 USDC")
  })

  it("keeps the numeric formatting locale-aware for non-ISO codes", () => {
    expect(formatCurrency(1234.5, "USDC", "en-US")).toBe("1,234.5 USDC")
    expect(formatCurrency(1234.5, "USDC", "de-DE")).toBe("1.234,5 USDC")
  })

  it("is unchanged for a real ISO currency", () => {
    expect(formatCurrency(1234.5, "USD")).toBe("$1,234.50")
  })

  it("is unchanged for XLM", () => {
    expect(formatCurrency(0.1234, "XLM")).toBe("0.1234 XLM")
  })

  it("handles an empty currency code without throwing", () => {
    expect(() => formatCurrency(10, "")).not.toThrow()
  })

  it("handles a lowercase ISO code", () => {
    // `Intl` is case-insensitive, but the guard is not, so this must still
    // reach Intl rather than falling into the code-appending path.
    expect(formatCurrency(10, "usd")).toBe("$10.00")
  })
})
