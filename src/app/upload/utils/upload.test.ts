import { describe, expect, it } from "vitest"
import {
  formatFileSize,
  getFileExtension,
  getUploadPath,
  getUploadSlug,
  isAllowedUpload,
} from "./upload"

describe("upload utilities", () => {
  it("accepts Markdown and HTML files case-insensitively", () => {
    expect(isAllowedUpload(new File(["# hello"], "README.MD"))).toBe(true)
    expect(isAllowedUpload(new File(["<p>hello</p>"], "page.HTML"))).toBe(true)
    expect(isAllowedUpload(new File(["{}"], "data.json"))).toBe(false)
  })

  it("extracts extensions and upload paths", () => {
    expect(getFileExtension("about.MD")).toBe(".md")
    expect(getFileExtension("README")).toBe("")
    expect(getUploadSlug("about.html")).toBe("about")
    expect(getUploadPath("about")).toBe("/p/about")
  })

  it("formats file sizes for the upload preview", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB")
    expect(formatFileSize(1536)).toBe("1.5 KB")
  })
})
