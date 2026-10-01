import { describe, it, expect } from "vitest"
import { evaluatePasswordStrength, MIN_REQUIRED_PASSWORD_SCORE } from "../password-strength"

describe("evaluatePasswordStrength", () => {
  it("flags common weak passwords with score 0 and warnings", () => {
    const res = evaluatePasswordStrength("password123")
    expect(res.score).toBe(0)
    expect(res.isAcceptable).toBe(false)
    expect(res.warning).toContain("commonly used")
  })

  it("rates short passwords under 8 chars as unacceptable", () => {
    const res = evaluatePasswordStrength("Ab1!")
    expect(res.score).toBe(0)
    expect(res.isAcceptable).toBe(false)
    expect(res.warning).toContain("too short")
  })

  it("calculates fair to strong score for diverse passwords meeting policy", () => {
    const fairRes = evaluatePasswordStrength("P@ssw0rd99")
    expect(fairRes.score).toBeGreaterThanOrEqual(MIN_REQUIRED_PASSWORD_SCORE)
    expect(fairRes.isAcceptable).toBe(true)

    const strongRes = evaluatePasswordStrength("C0mplex#Secure!Pass2026")
    expect(strongRes.score).toBe(4)
    expect(strongRes.isAcceptable).toBe(true)
    expect(strongRes.suggestions).toBeDefined()
  })
})
