import { describe, expect, it } from "vitest"
import { cn } from "./cn"

describe("cn", () => {
  it("returns a single class unchanged", () => {
    expect(cn("text-red-500")).toBe("text-red-500")
  })

  it("merges multiple classes", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2")
  })

  it("resolves conflicting Tailwind classes, keeping the last one", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500")
  })

  it("ignores falsy values", () => {
    expect(cn("px-4", false, undefined, null, "py-2")).toBe("px-4 py-2")
  })

  it("handles conditional class objects", () => {
    expect(cn({ "font-bold": true, "font-normal": false })).toBe("font-bold")
  })

  it("returns an empty string when given no arguments", () => {
    expect(cn()).toBe("")
  })

  it("handles arrays of classes", () => {
    expect(cn(["px-2", "py-2"])).toBe("px-2 py-2")
  })
})
