import { describe, expect, it } from "vitest";

import {
  createIdempotencyKey,
  getUploadIntentSignature,
  isValidIdempotencyKey,
} from "./upload-idempotency";

describe("upload idempotency keys", () => {
  it("mints a distinct, server-acceptable key each time", () => {
    const first = createIdempotencyKey();
    const second = createIdempotencyKey();

    expect(isValidIdempotencyKey(first)).toBe(true);
    expect(isValidIdempotencyKey(second)).toBe(true);
    expect(first).not.toBe(second);
  });

  it("rejects keys that could escape the staging directory or blow up a filename", () => {
    expect(isValidIdempotencyKey("../../etc/passwd")).toBe(false);
    expect(isValidIdempotencyKey("a/b")).toBe(false);
    expect(isValidIdempotencyKey("short")).toBe(false);
    expect(isValidIdempotencyKey("x".repeat(129))).toBe(false);
    expect(isValidIdempotencyKey("")).toBe(false);
    expect(isValidIdempotencyKey(undefined)).toBe(false);
    expect(isValidIdempotencyKey(42)).toBe(false);
  });

  it("treats two handles on the same file as the same upload intent", () => {
    const fromDisk = () =>
      new File(["# hello"], "about.md", {
        type: "text/markdown",
        lastModified: 1700000000000,
      });

    expect(getUploadIntentSignature(fromDisk())).toBe(getUploadIntentSignature(fromDisk()));
  });

  it("separates a different file, and an edited file of the same name", () => {
    const base = new File(["# hello"], "about.md", { lastModified: 1700000000000 });
    const other = new File(["# hello"], "pricing.md", { lastModified: 1700000000000 });
    const edited = new File(["# hello, again"], "about.md", { lastModified: 1700000000001 });

    expect(getUploadIntentSignature(other)).not.toBe(getUploadIntentSignature(base));
    expect(getUploadIntentSignature(edited)).not.toBe(getUploadIntentSignature(base));
  });
});
