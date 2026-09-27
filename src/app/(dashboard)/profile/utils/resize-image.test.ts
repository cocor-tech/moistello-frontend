import { describe, expect, it } from "vitest"
import { computeCenterSquareCrop, validateAvatarFile, MAX_SOURCE_BYTES } from "./resize-image"

describe("computeCenterSquareCrop", () => {
  it("crops landscape images horizontally around the center", () => {
    expect(computeCenterSquareCrop(4000, 3000)).toEqual({ sx: 500, sy: 0, sWidth: 3000, sHeight: 3000 })
  })

  it("crops portrait images vertically around the center", () => {
    expect(computeCenterSquareCrop(1080, 1920)).toEqual({ sx: 0, sy: 420, sWidth: 1080, sHeight: 1080 })
  })

  it("leaves square images untouched", () => {
    expect(computeCenterSquareCrop(512, 512)).toEqual({ sx: 0, sy: 0, sWidth: 512, sHeight: 512 })
  })
})

describe("validateAvatarFile", () => {
  it("accepts supported image types", () => {
    expect(validateAvatarFile(new File(["x"], "a.png", { type: "image/png" }))).toBeNull()
  })

  it("rejects non-image files", () => {
    expect(validateAvatarFile(new File(["x"], "a.pdf", { type: "application/pdf" }))).toMatch(/JPEG/)
  })

  it("rejects oversized sources", () => {
    const file = new File(["x"], "big.jpg", { type: "image/jpeg" })
    Object.defineProperty(file, "size", { value: MAX_SOURCE_BYTES + 1 })
    expect(validateAvatarFile(file)).toMatch(/too large/)
  })
})
