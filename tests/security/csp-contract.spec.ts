import { describe, expect, it } from "vitest";

describe("CSP security contract", () => {
  it.todo("asserts a per-request nonce is generated");
  it.todo("asserts CSP contains default-src 'self'");
  it.todo("asserts CSP disallows object-src");
  it.todo("asserts CSP disallows unsafe-eval");
  it.todo("asserts CSP script-src contains the request nonce");
  it.todo("asserts required third-party origins are explicitly reviewed");
  it.todo("asserts security headers are present on rendered responses");
});
