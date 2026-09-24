import { describe, it, expect } from "vitest"
import {
  loginSchema,
  registerSchema,
  ticketSchema,
  contributorSchema,
} from "@/lib/validation"

describe("loginSchema", () => {
  it("accepts a valid email and password", () => {
    const result = loginSchema.safeParse({
      email: "jane@example.com",
      password: "hunter2secret",
    })
    expect(result.success).toBe(true)
  })

  it("rejects an empty email", () => {
    const result = loginSchema.safeParse({ email: "", password: "hunter2secret" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Email is required")
    }
  })

  it("rejects a malformed email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "hunter2secret" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Enter a valid email address")
    }
  })

  it("rejects a short password", () => {
    const result = loginSchema.safeParse({ email: "jane@example.com", password: "short" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Password must be at least 8 characters")
    }
  })
})

describe("registerSchema", () => {
  it("accepts a valid registration", () => {
    const result = registerSchema.safeParse({
      name: "Jane Doe",
      email: "jane@example.com",
      password: "hunter2secret",
    })
    expect(result.success).toBe(true)
  })

  it("rejects a short name", () => {
    const result = registerSchema.safeParse({
      name: "J",
      email: "jane@example.com",
      password: "hunter2secret",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Name must be at least 2 characters")
    }
  })

  it("rejects a password without a number", () => {
    const result = registerSchema.safeParse({
      name: "Jane Doe",
      email: "jane@example.com",
      password: "onlyletters",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message)
      expect(messages).toContain("Password must contain at least one number")
    }
  })

  it("rejects a password without a letter", () => {
    const result = registerSchema.safeParse({
      name: "Jane Doe",
      email: "jane@example.com",
      password: "12345678",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message)
      expect(messages).toContain("Password must contain at least one letter")
    }
  })
})

describe("ticketSchema", () => {
  it("accepts a valid ticket", () => {
    const result = ticketSchema.safeParse({
      name: "Jane Doe",
      subject: "Withdrawal stuck",
      category: "Payments & Withdrawals",
      message: "My withdrawal has been stuck in processing for three days now.",
      priority: "high",
    })
    expect(result.success).toBe(true)
  })

  it("defaults priority to medium when omitted", () => {
    const result = ticketSchema.safeParse({
      name: "Jane Doe",
      subject: "Withdrawal stuck",
      category: "Payments & Withdrawals",
      message: "My withdrawal has been stuck in processing for three days now.",
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.priority).toBe("medium")
  })

  it("rejects a too-short message", () => {
    const result = ticketSchema.safeParse({
      name: "Jane Doe",
      subject: "Withdrawal stuck",
      category: "Payments & Withdrawals",
      message: "Too short",
      priority: "medium",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Please provide more detail (at least 20 characters)",
      )
    }
  })
})

describe("contributorSchema", () => {
  it("accepts a valid contribution", () => {
    const result = contributorSchema.safeParse({
      name: "Jane Doe",
      github: "https://github.com/janedoe",
      contribution: "Frontend Development (TypeScript/Next.js)",
      bio: "I love building interfaces.",
    })
    expect(result.success).toBe(true)
  })

  it("accepts a blank bio", () => {
    const result = contributorSchema.safeParse({
      name: "Jane Doe",
      github: "https://github.com/janedoe",
      contribution: "Design & UI/UX",
    })
    expect(result.success).toBe(true)
  })

  it("rejects a non-GitHub URL", () => {
    const result = contributorSchema.safeParse({
      name: "Jane Doe",
      github: "https://example.com/janedoe",
      contribution: "Design & UI/UX",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/GitHub/)
    }
  })

  it("rejects a missing contribution area", () => {
    const result = contributorSchema.safeParse({
      name: "Jane Doe",
      github: "https://github.com/janedoe",
      contribution: "",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Select an area")
    }
  })
})