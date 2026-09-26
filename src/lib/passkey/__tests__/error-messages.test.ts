import { describe, it, expect } from "vitest"
import {
  classifyPasskeyError,
  type PasskeyErrorInfo,
} from "@/lib/passkey/error-messages"

function makeDomError(name: string): DOMException {
  const e = new DOMException("test", name)
  return e
}

describe("classifyPasskeyError", () => {
  it("maps NotAllowedError to cancelled / canRetry=true", () => {
    const result: PasskeyErrorInfo = classifyPasskeyError(makeDomError("NotAllowedError"))
    expect(result.kind).toBe("cancelled")
    expect(result.canRetry).toBe(true)
    // Must not contain raw exception text
    expect(result.title).not.toContain("DOMException")
    expect(result.description).not.toContain("DOMException")
  })

  it("maps SecurityError to security_error / canRetry=false", () => {
    const result = classifyPasskeyError(makeDomError("SecurityError"))
    expect(result.kind).toBe("security_error")
    expect(result.canRetry).toBe(false)
  })

  it("maps InvalidStateError to invalid_state / canRetry=false", () => {
    const result = classifyPasskeyError(makeDomError("InvalidStateError"))
    expect(result.kind).toBe("invalid_state")
    expect(result.canRetry).toBe(false)
  })

  it("maps NotReadableError to not_readable / canRetry=false", () => {
    const result = classifyPasskeyError(makeDomError("NotReadableError"))
    expect(result.kind).toBe("not_readable")
    expect(result.canRetry).toBe(false)
  })

  it("maps ConstraintError to constraint / canRetry=false", () => {
    const result = classifyPasskeyError(makeDomError("ConstraintError"))
    expect(result.kind).toBe("constraint")
    expect(result.canRetry).toBe(false)
  })

  it("maps TimeoutError to timeout / canRetry=true", () => {
    const result = classifyPasskeyError(makeDomError("TimeoutError"))
    expect(result.kind).toBe("timeout")
    expect(result.canRetry).toBe(true)
  })

  it("maps NotSupportedError to unsupported_device / canRetry=false", () => {
    const result = classifyPasskeyError(makeDomError("NotSupportedError"))
    expect(result.kind).toBe("unsupported_device")
    expect(result.canRetry).toBe(false)
  })

  it("maps AbortError to cancelled / canRetry=true", () => {
    const result = classifyPasskeyError(makeDomError("AbortError"))
    expect(result.kind).toBe("cancelled")
    expect(result.canRetry).toBe(true)
  })

  it("maps adapter user_rejected code to cancelled", () => {
    const result = classifyPasskeyError({ adapter: "passkey", code: "user_rejected" })
    expect(result.kind).toBe("cancelled")
  })

  it("maps adapter not_supported code to unsupported_device", () => {
    const result = classifyPasskeyError({ adapter: "passkey", code: "not_supported" })
    expect(result.kind).toBe("unsupported_device")
  })

  it("returns unknown for unrecognised errors", () => {
    const result = classifyPasskeyError(new Error("some random error"))
    expect(result.kind).toBe("unknown")
    expect(result.canRetry).toBe(true)
  })

  it("never exposes raw error messages in the returned description", () => {
    const rawMsg = "some internal browser error: secret detail"
    const err = new Error(rawMsg)
    const result = classifyPasskeyError(err)
    expect(result.description).not.toContain(rawMsg)
    expect(result.title).not.toContain(rawMsg)
  })

  it("returns distinct messages for each mapped error type", () => {
    const names = [
      "NotAllowedError",
      "SecurityError",
      "InvalidStateError",
      "NotReadableError",
      "ConstraintError",
      "TimeoutError",
      "NotSupportedError",
      "AbortError",
    ]
    const titles = names.map((n) => classifyPasskeyError(makeDomError(n)).title)
    const uniqueTitles = new Set(titles)
    // Every error type should have a distinct title
    expect(uniqueTitles.size).toBe(names.length)
  })
})
