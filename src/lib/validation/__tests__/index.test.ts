import { describe, it, expect } from "vitest"
import { loginSchema, registerSchema, searchSchema, ticketSchema } from "@/lib/validation"
import { zodResolver } from "@/lib/validation/zod-resolver"

describe("validation schemas", () => {
  describe("loginSchema", () => {
    it("resolves valid values without errors", async () => {
      const resolver = zodResolver(loginSchema)
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
      const resolver = zodResolver(loginSchema)
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
      const resolver = zodResolver(loginSchema)
      const result = await resolver({ email: "", password: "" }, undefined, {} as never)
      if ("errors" in result) {
        expect(result.errors.email?.message).toBe("Email is required")
      }
    })
  })

  describe("registerSchema", () => {
    it("resolves valid values without errors", async () => {
      const resolver = zodResolver(registerSchema)
      const result = await resolver(
        {
          name: "Jane Doe",
          email: "jane@example.com",
          password: "StrongPass123!",
        },
        undefined,
        {} as never,
      )
      if ("errors" in result) {
        expect(result.errors).toEqual({})
        expect(result.values).toEqual({
          name: "Jane Doe",
          email: "jane@example.com",
          password: "StrongPass123!",
        })
      }
    })

    it("maps zod issues to field errors keyed by path", async () => {
      const resolver = zodResolver(registerSchema)
      const result = await resolver(
        { name: "", email: "not-an-email", password: "" },
        undefined,
        {} as never,
      )
      if ("errors" in result) {
        expect(result.errors.name?.message).toBe("Full name is required")
        expect(result.errors.email?.message).toBe("Enter a valid email address")
        expect(result.errors.password?.message).toBe("Password is required")
      }
    })

    it("validates password contains required patterns", async () => {
      const resolver = zodResolver(registerSchema)
      const result = await resolver(
        {
          name: "Jane Doe",
          email: "jane@example.com",
          password: "12345678",
        },
        undefined,
        {} as never,
      )
      if ("errors" in result) {
        expect(result.errors.password?.message).toContain("must contain at least one letter")
      }
    })
  })

  describe("searchSchema", () => {
    it("resolves valid search query", async () => {
      const resolver = zodResolver(searchSchema)
      const result = await resolver({ query: "test search" }, undefined, {} as never)
      if ("errors" in result) {
        expect(result.errors).toEqual({})
        expect(result.values).toEqual({ query: "test search" })
      }
    })

    it("validates min length on search query", async () => {
      const resolver = zodResolver(searchSchema)
      const result = await resolver({ query: "" }, undefined, {} as never)
      if ("errors" in result) {
        expect(result.errors.query?.message).toBe("Enter a search term")
      }
    })
  })

  describe("ticketSchema", () => {
    it("resolves valid ticket values", async () => {
      const { ticketSchema } = await import("@/lib/validation")
      const resolver = zodResolver(ticketSchema)
      const result = await resolver(
        {
          name: "Test User",
          subject: "Test subject",
          category: "Test",
          message: "This is a sufficiently detailed message.",
          priority: "medium",
        },
        undefined,
        {} as never,
      )
      if ("errors" in result) {
        expect(result.errors).toEqual({})
        expect(result.values.priority).toBe("medium")
      }
    })

    it("validates required fields on ticket", async () => {
      const { ticketSchema } = await import("@/lib/validation")
      const resolver = zodResolver(ticketSchema)
      const result = await resolver(
        {
          name: "",
          subject: "",
          category: "",
          message: "",
          priority: "",
        },
        undefined,
        {} as never,
      )
      if ("errors" in result) {
        expect(result.errors.name?.message).toBe("Name is required")
        expect(result.errors.subject?.message).toBe("Subject is required")
        expect(result.errors.category?.message).toBe("Select a category")
        expect(result.errors.message?.message).toBe("Describe your issue")
      }
    })

    it("validates message min length", async () => {
      const { ticketSchema } = await import("@/lib/validation")
      const resolver = zodResolver(ticketSchema)
      const result = await resolver(
        {
          name: "Test",
          subject: "Sub",
          category: "Cat",
          message: "Short",
          priority: "medium",
        },
        undefined,
        {} as never,
      )
      if ("errors" in result) {
        expect(result.errors.message?.message).toBe("Please provide more detail (at least 20 characters)")
      }
    })

    it("uses default priority when not provided", async () => {
      const resolver = zodResolver(ticketSchema)
      const result = await resolver(
        {
          name: "Test",
          subject: "Test subject",
          category: "Cat",
          message: "A message over twenty characters long.",
          priority: undefined as never,
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
})