import { describe, it, expect } from "vitest"
import {
  loginSchema,
  ticketSchema,
  zodResolver,
} from "@/lib/validation"

describe("zodResolver", () => {
  const resolver = zodResolver(loginSchema)

  it("resolves valid values without errors", async () => {
    const result = await resolver(
      { email: "jane@example.com", password: "hunter2secret" },
      undefined,
      {} as never,
    )
    if ("errors" in result) {
      expect(result.errors).toEqual({})
      expect(result.values).toEqual({
        email: "jane@example.com",
        password: "hunter2secret",
      })
    }
  })

  it("maps zod issues to field errors keyed by path", async () => {
    const result = await resolver(
      { email: "not-an-email", password: "" },
      undefined,
      {} as never,
    )
    if ("errors" in result) {
      expect(result.errors.email?.message).toBe("Enter a valid email address")
      expect(result.errors.password?.message).toBe("Password is required")
    }
  })

  it("keeps the first message when a field has multiple issues", async () => {
    const result = await resolver({ email: "", password: "" }, undefined, {} as never)
    if ("errors" in result) {
      expect(result.errors.email?.message).toBe("Email is required")
    }
  })

  it("reflects parsed output values including defaults", async () => {
    const ticket = zodResolver(ticketSchema)
    const result = await ticket(
      {
        name: "Jane Doe",
        subject: "Hello there",
        category: "Payments",
        message: "This is a sufficiently detailed message over twenty characters.",
        priority: "" as never,
      },
      undefined,
      {} as never,
    )
    if ("errors" in result) {
      expect(result.errors).toEqual({})
      expect(result.values.priority).toBe("medium")
    }
  })
})