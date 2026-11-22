import { describe, expect, it } from "vitest"
import { ticketSchema } from "../support"

const validInput = {
  name: "Ada Lovelace",
  subject: "Cannot join a circle",
  category: "Account",
  message: "The join button does nothing when I click it on the circle page.",
  priority: "high",
}

function messagesFor(input: unknown): string[] {
  const result = ticketSchema.safeParse(input)
  return result.success ? [] : result.error.issues.map((issue) => issue.message)
}

describe("ticketSchema", () => {
  it("accepts a valid ticket", () => {
    expect(ticketSchema.safeParse(validInput).success).toBe(true)
  })

  describe("name", () => {
    it("requires a name", () => {
      expect(messagesFor({ ...validInput, name: "" })).toContain("Name is required")
    })

    it("rejects a name longer than 120 characters", () => {
      expect(messagesFor({ ...validInput, name: "a".repeat(121) })).toContain(
        "Name is too long"
      )
    })
  })

  describe("subject", () => {
    it("requires a subject", () => {
      expect(messagesFor({ ...validInput, subject: "" })).toContain("Subject is required")
    })

    it("rejects a subject shorter than 4 characters", () => {
      expect(messagesFor({ ...validInput, subject: "abc" })).toContain(
        "Subject must be at least 4 characters"
      )
    })

    it("accepts a subject of exactly 4 characters", () => {
      expect(ticketSchema.safeParse({ ...validInput, subject: "help" }).success).toBe(true)
    })

    it("rejects a subject longer than 200 characters", () => {
      expect(messagesFor({ ...validInput, subject: "s".repeat(201) })).toContain(
        "Subject must be 200 characters or fewer"
      )
    })
  })

  describe("category", () => {
    it("requires a category", () => {
      expect(messagesFor({ ...validInput, category: "" })).toContain("Select a category")
    })
  })

  describe("message", () => {
    it("requires a message", () => {
      expect(messagesFor({ ...validInput, message: "" })).toContain("Describe your issue")
    })

    it("rejects a message shorter than 20 characters", () => {
      expect(messagesFor({ ...validInput, message: "a".repeat(19) })).toContain(
        "Please provide more detail (at least 20 characters)"
      )
    })

    it("accepts a message of exactly 20 characters", () => {
      expect(
        ticketSchema.safeParse({ ...validInput, message: "a".repeat(20) }).success
      ).toBe(true)
    })

    it("rejects a message longer than 5000 characters", () => {
      expect(messagesFor({ ...validInput, message: "a".repeat(5001) })).toContain(
        "Message must be 5000 characters or fewer"
      )
    })
  })

  describe("priority", () => {
    it.each(["low", "medium", "high", "urgent"])("keeps the %s priority", (priority) => {
      const result = ticketSchema.safeParse({ ...validInput, priority })
      expect(result.success && result.data.priority).toBe(priority)
    })

    it("falls back to medium for an unknown priority", () => {
      const result = ticketSchema.safeParse({ ...validInput, priority: "critical" })
      expect(result.success && result.data.priority).toBe("medium")
    })

    it("falls back to medium when priority is missing", () => {
      const { priority: _priority, ...withoutPriority } = validInput
      const result = ticketSchema.safeParse(withoutPriority)
      expect(result.success && result.data.priority).toBe("medium")
    })
  })
})
