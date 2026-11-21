import { describe, expect, it } from "vitest"
import { loginSchema, registerSchema } from "../auth"

describe("loginSchema", () => {
  it("accepts a valid email and password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "secret123",
    })
    expect(result.success).toBe(true)
  })

  it("rejects an empty email", () => {
    const result = loginSchema.safeParse({ email: "", password: "secret123" })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe("Email is required")
  })

  it("rejects a malformed email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "secret123",
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe("Enter a valid email address")
  })

  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "",
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe("Password is required")
  })

  it("rejects a password shorter than 8 characters", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "short",
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe(
      "Password must be at least 8 characters"
    )
  })
})

describe("registerSchema", () => {
  const validPayload = {
    name: "Alice Smith",
    email: "alice@example.com",
    password: "Str0ng!Pass99",
  }

  it("accepts a valid registration payload", () => {
    const result = registerSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
  })

  it("rejects an empty name", () => {
    const result = registerSchema.safeParse({ ...validPayload, name: "" })
    expect(result.success).toBe(false)
  })

  it("rejects a name shorter than 2 characters", () => {
    const result = registerSchema.safeParse({ ...validPayload, name: "A" })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe(
      "Name must be at least 2 characters"
    )
  })

  it("rejects a name longer than 60 characters", () => {
    const result = registerSchema.safeParse({
      ...validPayload,
      name: "A".repeat(61),
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe(
      "Name must be 60 characters or fewer"
    )
  })

  it("rejects a password with no letters", () => {
    const result = registerSchema.safeParse({
      ...validPayload,
      password: "12345678",
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe(
      "Password must contain at least one letter"
    )
  })

  it("rejects a password with no numbers", () => {
    const result = registerSchema.safeParse({
      ...validPayload,
      password: "NoNumbers!",
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe(
      "Password must contain at least one number"
    )
  })

  it("rejects a password exceeding 128 characters", () => {
    const result = registerSchema.safeParse({
      ...validPayload,
      password: "Aa1!" + "x".repeat(126),
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe(
      "Password must be 128 characters or fewer"
    )
  })

  it("rejects a weak password that passes format rules", () => {
    // passes letter+number check but is too weak (score < 2)
    const result = registerSchema.safeParse({
      ...validPayload,
      password: "aaaaa1aa",
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toMatch(/too weak/i)
  })
})
