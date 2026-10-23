import { describe, it, expect } from "vitest"
import { z } from "zod"

import {
  safeParse,
  loginSchema,
  createCircleSchema,
  updateProfileSchema,
} from "@/lib/validators"

const VALID_ADDRESS = "GAX23V3WWDPPR5WRER3KTEUTDLSCGZYMSJY5FDRRKKCIQ4JADF5T27RC"

const validCircle = {
  name: "Savings Circle",
  circleType: "public",
  payoutType: "random",
  contributionAmount: 50,
  currency: "USDC",
  frequency: "monthly",
  maxMembers: 10,
} as const

describe("safeParse", () => {
  it("returns the parsed data on success", () => {
    const schema = z.object({ count: z.number() })

    const result = safeParse(schema, { count: 3 })

    expect(result).toEqual({ success: true, data: { count: 3 } })
  })

  it("maps each failing field path to its message", () => {
    const schema = z.object({
      email: z.string().email("Bad email"),
      age: z.number().min(18, "Too young"),
    })

    const result = safeParse(schema, { email: "nope", age: 12 })

    expect(result).toEqual({
      success: false,
      errors: { email: "Bad email", age: "Too young" },
    })
  })

  it("joins nested and array paths with dots", () => {
    const schema = z.object({
      members: z.array(z.object({ name: z.string().min(2, "Too short") })),
    })

    const result = safeParse(schema, { members: [{ name: "ok" }, { name: "x" }] })

    expect(result).toEqual({
      success: false,
      errors: { "members.1.name": "Too short" },
    })
  })

  it("falls back to the legacy `errors` array when `issues` is missing", () => {
    const legacySchema = {
      safeParse: () => ({
        success: false,
        error: {
          errors: [{ path: ["wallet", "address"], message: "Invalid address" }],
        },
      }),
    } as unknown as z.ZodSchema<unknown>

    const result = safeParse(legacySchema, {})

    expect(result).toEqual({
      success: false,
      errors: { "wallet.address": "Invalid address" },
    })
  })

  it("returns no field errors when the error carries no issues at all", () => {
    const emptySchema = {
      safeParse: () => ({ success: false, error: {} }),
    } as unknown as z.ZodSchema<unknown>

    expect(safeParse(emptySchema, {})).toEqual({ success: false, errors: {} })
  })
})

describe("loginSchema", () => {
  it("accepts a 56-character wallet address with a signature", () => {
    const result = safeParse(loginSchema, {
      walletAddress: VALID_ADDRESS,
      signature: "sig",
    })

    expect(result.success).toBe(true)
  })

  it("rejects an address that is not 56 characters", () => {
    const result = safeParse(loginSchema, {
      walletAddress: VALID_ADDRESS.slice(1),
      signature: "sig",
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.errors).toHaveProperty("walletAddress")
  })

  it("requires a non-empty signature", () => {
    const result = safeParse(loginSchema, {
      walletAddress: VALID_ADDRESS,
      signature: "",
    })

    expect(result).toEqual({
      success: false,
      errors: { signature: "Signature is required" },
    })
  })
})

describe("createCircleSchema", () => {
  it("applies defaults for the optional fee, grace and strike settings", () => {
    const result = safeParse(createCircleSchema, validCircle)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.lateFeePercent).toBe(5)
      expect(result.data.gracePeriodHours).toBe(24)
      expect(result.data.maxStrikes).toBe(3)
    }
  })

  it("accepts an empty description and empty start date", () => {
    const result = safeParse(createCircleSchema, {
      ...validCircle,
      description: "",
      startDate: "",
    })

    expect(result.success).toBe(true)
  })

  it("rejects a name shorter than three characters", () => {
    const result = safeParse(createCircleSchema, { ...validCircle, name: "ab" })

    expect(result).toEqual({
      success: false,
      errors: { name: "Name must be at least 3 characters" },
    })
  })

  it("rejects a non-positive contribution amount", () => {
    const result = safeParse(createCircleSchema, {
      ...validCircle,
      contributionAmount: 0,
    })

    expect(result).toEqual({
      success: false,
      errors: { contributionAmount: "Contribution must be positive" },
    })
  })

  it("rejects a member count outside the 2 to 100 range", () => {
    expect(safeParse(createCircleSchema, { ...validCircle, maxMembers: 1 }).success).toBe(false)
    expect(safeParse(createCircleSchema, { ...validCircle, maxMembers: 101 }).success).toBe(false)
  })

  it("rejects an unknown payout type", () => {
    const result = safeParse(createCircleSchema, {
      ...validCircle,
      payoutType: "lottery",
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.errors).toHaveProperty("payoutType")
  })
})

describe("updateProfileSchema", () => {
  it("accepts a profile with only a display name", () => {
    expect(safeParse(updateProfileSchema, { displayName: "Ada" }).success).toBe(true)
  })

  it("accepts empty strings for the optional contact fields", () => {
    const result = safeParse(updateProfileSchema, {
      email: "",
      phone: "",
      countryCode: "",
      preferredLanguage: "",
    })

    expect(result.success).toBe(true)
  })

  it("rejects a display name shorter than two characters", () => {
    const result = safeParse(updateProfileSchema, { displayName: "A" })

    expect(result).toEqual({
      success: false,
      errors: { displayName: "Display name must be at least 2 characters" },
    })
  })

  it("rejects a malformed email address", () => {
    const result = safeParse(updateProfileSchema, { email: "not-an-email" })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.errors).toHaveProperty("email")
  })

  it("accepts an optional leading plus and 7 to 15 digits for phone", () => {
    expect(safeParse(updateProfileSchema, { phone: "+2348012345678" }).success).toBe(true)
    expect(safeParse(updateProfileSchema, { phone: "12345" }).success).toBe(false)
    expect(safeParse(updateProfileSchema, { phone: "+1-555-0100" }).success).toBe(false)
  })

  it("requires exactly two characters for the country code", () => {
    const result = safeParse(updateProfileSchema, { countryCode: "NGA" })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.errors).toHaveProperty("countryCode")
  })
})
