import { describe, expect, it } from "vitest"
import {
  ALLOWED_TYPES_LIST,
  UPLOAD_LIMITS_BY_TYPE,
  formatFileSize,
  getFileExtension,
  getLimitForExtension,
  getUploadPath,
  getUploadSlug,
  isAllowedExtension,
  isAllowedUpload,
  validateUploadFile,
} from "./upload"

describe("upload utilities & limits", () => {
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

  it("identifies allowed extensions correctly", () => {
    expect(isAllowedExtension(".md")).toBe(true)
    expect(isAllowedExtension(".MD")).toBe(true)
    expect(isAllowedExtension(".html")).toBe(true)
    expect(isAllowedExtension(".HTML")).toBe(true)
    expect(isAllowedExtension(".exe")).toBe(false)
    expect(isAllowedExtension(".json")).toBe(false)
  })

  it("provides distinct per-type limits", () => {
    expect(UPLOAD_LIMITS_BY_TYPE[".md"].maxBytes).toBe(2 * 1024 * 1024)
    expect(UPLOAD_LIMITS_BY_TYPE[".html"].maxBytes).toBe(5 * 1024 * 1024)
    expect(getLimitForExtension(".md")?.formattedLimit).toBe("2MB")
    expect(getLimitForExtension(".html")?.formattedLimit).toBe("5MB")
  })

  describe("validateUploadFile", () => {
    it("rejects unsupported extensions instantly with allowed types listed", () => {
      const result = validateUploadFile("payload.exe", 100)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toContain("Unsupported file type")
        expect(result.error).toContain(ALLOWED_TYPES_LIST)
        expect(result.status).toBe(400)
      }
    })

    it("enforces per-type size limit for .md (2MB limit)", () => {
      const validMd = validateUploadFile("doc.md", 2 * 1024 * 1024)
      expect(validMd.ok).toBe(true)

      const oversizedMd = validateUploadFile("doc.md", 2 * 1024 * 1024 + 1)
      expect(oversizedMd.ok).toBe(false)
      if (!oversizedMd.ok) {
        expect(oversizedMd.error).toContain("File too large for .md")
        expect(oversizedMd.error).toContain("max 2MB")
        expect(oversizedMd.error).toContain(ALLOWED_TYPES_LIST)
      }
    })

    it("enforces per-type size limit for .html (5MB limit)", () => {
      // 3MB HTML file passes because HTML limit is 5MB
      const html3MB = validateUploadFile("page.html", 3 * 1024 * 1024)
      expect(html3MB.ok).toBe(true)

      const oversizedHtml = validateUploadFile("page.html", 5 * 1024 * 1024 + 1)
      expect(oversizedHtml.ok).toBe(false)
      if (!oversizedHtml.ok) {
        expect(oversizedHtml.error).toContain("File too large for .html")
        expect(oversizedHtml.error).toContain("max 5MB")
        expect(oversizedHtml.error).toContain(ALLOWED_TYPES_LIST)
      }
    })

    it("validates filename slug characters", () => {
      expect(validateUploadFile("valid_name-1.md", 100).ok).toBe(true)
      const invalid = validateUploadFile("invalid name!.md", 100)
      expect(invalid.ok).toBe(false)
      if (!invalid.ok) {
        expect(invalid.error).toMatch(/letters, numbers, hyphens, or underscores/)
      }
    })
  })
})
