import { describe, expect, it } from "vitest"
import { searchSchema } from "./search"

describe("searchSchema", () => {
  it("accepts a valid search query", () => {
    const result = searchSchema.safeParse({ query: "hello" })
    expect(result.success).toBe(true)
  })

  it("accepts a query at the maximum length of 200 characters", () => {
    const result = searchSchema.safeParse({ query: "a".repeat(200) })
    expect(result.success).toBe(true)
  })

  it("rejects an empty string", () => {
    const result = searchSchema.safeParse({ query: "" })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe("Enter a search term")
  })

  it("rejects a query longer than 200 characters", () => {
    const result = searchSchema.safeParse({ query: "a".repeat(201) })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe("Search term is too long")
  })

  it("rejects a missing query field", () => {
    const result = searchSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it("rejects a non-string query", () => {
    const result = searchSchema.safeParse({ query: 42 })
    expect(result.success).toBe(false)
  })
})
