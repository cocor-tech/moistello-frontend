import { describe, expect, it } from "vitest"
import { contributorSchema } from "../contributor"

const validInput = {
  name: "Ada Lovelace",
  github: "https://github.com/ada-lovelace",
  contribution: "Engineering",
}

function messagesFor(input: unknown): string[] {
  const result = contributorSchema.safeParse(input)
  return result.success ? [] : result.error.issues.map((issue) => issue.message)
}

describe("contributorSchema", () => {
  it("accepts a valid contributor without a bio", () => {
    expect(contributorSchema.safeParse(validInput).success).toBe(true)
  })

  it("accepts a valid contributor with a bio", () => {
    const result = contributorSchema.safeParse({ ...validInput, bio: "Builds things." })
    expect(result.success).toBe(true)
  })

  describe("name", () => {
    it("requires a name", () => {
      expect(messagesFor({ ...validInput, name: "" })).toContain("Name is required")
    })

    it("rejects a single character name", () => {
      expect(messagesFor({ ...validInput, name: "A" })).toContain(
        "Name must be at least 2 characters"
      )
    })

    it("accepts a name of exactly 2 characters", () => {
      expect(contributorSchema.safeParse({ ...validInput, name: "Al" }).success).toBe(true)
    })

    it("accepts a name of exactly 120 characters", () => {
      const name = "a".repeat(120)
      expect(contributorSchema.safeParse({ ...validInput, name }).success).toBe(true)
    })

    it("rejects a name longer than 120 characters", () => {
      const name = "a".repeat(121)
      expect(messagesFor({ ...validInput, name })).toContain("Name is too long")
    })
  })

  describe("github", () => {
    it("requires a GitHub profile", () => {
      expect(messagesFor({ ...validInput, github: "" })).toContain(
        "GitHub profile is required"
      )
    })

    it("rejects a non-GitHub URL", () => {
      expect(messagesFor({ ...validInput, github: "https://gitlab.com/ada" })).toContain(
        "Please enter a GitHub URL starting with https://github.com/"
      )
    })

    it("rejects a URL that is not https", () => {
      expect(messagesFor({ ...validInput, github: "http://github.com/ada" })).toContain(
        "Please enter a GitHub URL starting with https://github.com/"
      )
    })

    it("accepts the https scheme regardless of letter case", () => {
      const result = contributorSchema.safeParse({
        ...validInput,
        github: "HTTPS://github.com/ada-lovelace",
      })
      expect(result.success).toBe(true)
    })

    it("rejects a repository path instead of a profile", () => {
      expect(
        messagesFor({ ...validInput, github: "https://github.com/ada/repo" })
      ).toContain("Please enter a valid GitHub profile URL")
    })

    it("accepts usernames containing dots, underscores and hyphens", () => {
      const result = contributorSchema.safeParse({
        ...validInput,
        github: "https://github.com/ada_l.ove-lace",
      })
      expect(result.success).toBe(true)
    })
  })

  describe("contribution", () => {
    it("requires a contribution area", () => {
      expect(messagesFor({ ...validInput, contribution: "" })).toContain("Select an area")
    })
  })

  describe("bio", () => {
    it("accepts a bio of exactly 1000 characters", () => {
      const bio = "b".repeat(1000)
      expect(contributorSchema.safeParse({ ...validInput, bio }).success).toBe(true)
    })

    it("rejects a bio longer than 1000 characters", () => {
      const bio = "b".repeat(1001)
      expect(messagesFor({ ...validInput, bio })).toContain(
        "Bio must be 1000 characters or fewer"
      )
    })
  })
})
