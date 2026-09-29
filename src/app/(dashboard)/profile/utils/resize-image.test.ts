import { describe, expect, it } from "vitest"
import { computeCenterSquareCrop, validateAvatarFile, MAX_SOURCE_BYTES, getExifOrientation } from "./resize-image"

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

describe("getExifOrientation", () => {
  it("defaults to 1 for non-JPEG or missing EXIF", async () => {
    const pngFile = new File(["png data"], "test.png", { type: "image/png" })
    const orientation = await getExifOrientation(pngFile)
    expect(orientation).toBe(1)
  })

  it("extracts orientation tag from EXIF binary buffer", async () => {
    // Construct minimal valid JPEG EXIF header with Orientation = 6 (Rotate 90 CW)
    const buffer = new ArrayBuffer(50)
    const view = new DataView(buffer)
    view.setUint16(0, 0xffd8) // JPEG SOI
    view.setUint16(2, 0xffe1) // APP1 marker
    view.setUint16(4, 40)     // Length
    view.setUint32(6, 0x45786966) // 'Exif'
    view.setUint16(10, 0x0000)   // '\0\0'
    view.setUint16(12, 0x4949)   // 'II' Little endian
    view.setUint16(14, 0x002a, true) // TIFF version 42
    view.setUint32(16, 8, true)  // IFD0 offset
    view.setUint16(20, 1, true)  // 1 tag
    view.setUint16(22, 0x0112, true) // Tag: Orientation
    view.setUint16(24, 3, true)      // Type: SHORT
    view.setUint32(26, 1, true)      // Count: 1
    view.setUint16(30, 6, true)      // Value: 6 (Rotate 90 CW)

    const orientation = await getExifOrientation(buffer)
    expect(orientation).toBe(6)
  })
})
