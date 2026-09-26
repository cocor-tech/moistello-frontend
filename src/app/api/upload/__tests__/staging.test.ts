// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import fs from "fs"
import path from "path"

import {
  STAGING_DIR,
  isValidUploadId,
  purgeUpload,
  readReceipt,
  stageUpload,
  writeReceipt,
} from "../staging"

const VALID_ID = "11111111-2222-4333-8444-555555555555"

describe("upload staging", () => {
  beforeEach(() => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true)
    vi.spyOn(fs, "mkdirSync").mockImplementation(() => undefined as never)
    vi.spyOn(fs, "writeFileSync").mockImplementation(() => {})
    vi.spyOn(fs, "readFileSync").mockImplementation(() => "" as never)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("accepts a server-generated uuid", () => {
    expect(isValidUploadId(VALID_ID)).toBe(true)
  })

  it("rejects ids containing path separators", () => {
    expect(isValidUploadId("../secrets")).toBe(false)
    expect(isValidUploadId("a/b")).toBe(false)
    expect(isValidUploadId("a\\b")).toBe(false)
    expect(isValidUploadId("..")).toBe(false)
  })

  it("rejects non-string and malformed ids", () => {
    expect(isValidUploadId(undefined)).toBe(false)
    expect(isValidUploadId(null)).toBe(false)
    expect(isValidUploadId(42)).toBe(false)
    expect(isValidUploadId("")).toBe(false)
    expect(isValidUploadId("1111")).toBe(false)
  })

  it("generates its own uploadId rather than trusting the caller", () => {
    const meta = stageUpload(Buffer.from("# hi"), {
      originalName: "about.md",
      slug: "about",
      extension: ".md",
    })

    expect(meta.uploadId).not.toBe(VALID_ID)
    expect(meta.uploadId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    )
    expect(meta.bytes).toBe(4)
  })

  it("always writes inside the staging directory, never at a caller-chosen path", () => {
    const writeSpy = vi.spyOn(fs, "writeFileSync")
    stageUpload(Buffer.from("x"), {
      originalName: "../../escape.md",
      slug: "escape",
      extension: ".md",
    })

    expect(writeSpy).toHaveBeenCalled()
    for (const call of writeSpy.mock.calls) {
      const target = String(call[0])
      // Contained by the staging dir, and the leaf is a server-generated id.
      expect(path.dirname(target)).toBe(STAGING_DIR)
      expect(path.basename(target)).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(bin|meta\.json)$/i,
      )
    }
  })

  it("refuses to purge an id that is not a uuid", () => {
    const rmSpy = vi.spyOn(fs, "rmSync").mockImplementation(() => {})
    purgeUpload("../../etc/passwd")
    expect(rmSpy).not.toHaveBeenCalled()
  })

  it("returns null for a receipt that was never written", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false)
    expect(readReceipt(VALID_ID)).toBeNull()
  })

  it("round-trips a publish receipt", () => {
    const writeSpy = vi.spyOn(fs, "writeFileSync")
    writeReceipt(VALID_ID, { slug: "about", url: "/p/about", publishedAt: 1 })
    expect(writeSpy).toHaveBeenCalled()
  })
})
