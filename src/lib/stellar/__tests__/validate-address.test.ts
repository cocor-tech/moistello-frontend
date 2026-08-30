import { describe, it, expect } from "vitest"
import { validateStellarAddress } from "../validate-address"

describe("validateStellarAddress", () => {
  const validAddress = "GAQVF6GRTN4R2JCFGJBOCXZOVNWLPT72PNVF5UYAS6LA4BUYQHNRET46"

  it("returns true for a valid Stellar public key", () => {
    expect(validateStellarAddress(validAddress)).toBe(true)
  })

  it("returns false for non-string inputs", () => {
    expect(validateStellarAddress(null)).toBe(false)
    expect(validateStellarAddress(undefined)).toBe(false)
    expect(validateStellarAddress(12345)).toBe(false)
    expect(validateStellarAddress({})).toBe(false)
  })

  it("returns false for lowercase letters (invalid Base32/Stellar characters)", () => {
    const lowercase = "gaqvf6grtn4r2jcfgjbocxzovnwlpt72pnvf5uyas6la4buyqhnret46"
    expect(validateStellarAddress(lowercase)).toBe(false)
  })

  it("returns false for excluded Base32 characters like 0, 1, 8, 9", () => {
    // Contains '0'
    const invalid0 = "G0QVF6GRTN4R2JCFGJBOCXZOVNWLPT72PNVF5UYAS6LA4BUYQHNRET46"
    expect(validateStellarAddress(invalid0)).toBe(false)

    // Contains '1'
    const invalid1 = "G1QVF6GRTN4R2JCFGJBOCXZOVNWLPT72PNVF5UYAS6LA4BUYQHNRET46"
    expect(validateStellarAddress(invalid1)).toBe(false)
  })

  it("returns false for incorrect length (<56 or >56 chars)", () => {
    const tooShort = "GAQVF6GRTN4R2JCFGJBOCXZOVNWLPT72PNVF5UYAS6LA4BUYQHNRET"
    const tooLong = "GAQVF6GRTN4R2JCFGJBOCXZOVNWLPT72PNVF5UYAS6LA4BUYQHNRET46A"
    expect(validateStellarAddress(tooShort)).toBe(false)
    expect(validateStellarAddress(tooLong)).toBe(false)
  })

  it("returns false when prefix is not 'G'", () => {
    const wrongPrefix = "SAQVF6GRTN4R2JCFGJBOCXZOVNWLPT72PNVF5UYAS6LA4BUYQHNRET46"
    expect(validateStellarAddress(wrongPrefix)).toBe(false)
  })
})
