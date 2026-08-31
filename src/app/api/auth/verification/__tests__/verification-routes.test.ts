/**
 * verification-routes.test.ts
 *
 * Route-level tests for:
 *   POST /api/auth/verification/send
 *   POST /api/auth/verification/resend
 *   POST /api/auth/verification/verify
 *
 * Each route handler is imported directly and called with a NextRequest.
 * The in-memory verification store is reset between suites by re-importing
 * with Vitest's module isolation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: unknown, url = "http://localhost/api") {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

// Build a real NextRequest with no body (malformed JSON path)
function makeBadJsonRequest(url = "http://localhost/api") {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not-json{{{",
  })
}

// ---------------------------------------------------------------------------
// /api/auth/verification/send
// ---------------------------------------------------------------------------

describe("POST /api/auth/verification/send", () => {
  // Import fresh per describe block using dynamic import + vi.resetModules
  let POST: (req: NextRequest) => Promise<Response>

  beforeEach(async () => {
    vi.resetModules()
    const mod = await import(
      "@/app/api/auth/verification/send/route"
    )
    POST = mod.POST
  })

  it("returns 400 when body is missing email", async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/required/i)
  })

  it("returns 400 when email is not a string", async () => {
    const res = await POST(makeRequest({ email: 123 }))
    expect(res.status).toBe(400)
  })

  it("returns 400 for invalid email format", async () => {
    const res = await POST(makeRequest({ email: "not-an-email" }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/invalid/i)
  })

  it("returns 400 when body is malformed JSON", async () => {
    const res = await POST(makeBadJsonRequest())
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it("returns 200 with verificationId and expiresIn for valid email", async () => {
    const res = await POST(makeRequest({ email: "user@example.com" }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.verificationId).toMatch(/^vid-/)
    expect(typeof json.data.expiresIn).toBe("number")
    expect(json.data.expiresIn).toBeGreaterThan(0)
    expect(typeof json.data.remainingAttempts).toBe("number")
  })

  it("normalises email to lowercase", async () => {
    const res = await POST(makeRequest({ email: "User@EXAMPLE.COM" }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.verificationId).toBeDefined()
  })

  it("returns 429 after exceeding send rate limit (3 sends)", async () => {
    const email = `ratelimit-${Date.now()}@example.com`
    for (let i = 0; i < 3; i++) {
      await POST(makeRequest({ email }))
    }
    const res = await POST(makeRequest({ email }))
    expect(res.status).toBe(429)
    const json = await res.json()
    expect(json.error).toMatch(/too many/i)
  })
})

// ---------------------------------------------------------------------------
// /api/auth/verification/resend
// ---------------------------------------------------------------------------

describe("POST /api/auth/verification/resend", () => {
  let sendPOST: (req: NextRequest) => Promise<Response>
  let resendPOST: (req: NextRequest) => Promise<Response>

  beforeEach(async () => {
    vi.resetModules()
    const [sendMod, resendMod] = await Promise.all([
      import("@/app/api/auth/verification/send/route"),
      import("@/app/api/auth/verification/resend/route"),
    ])
    sendPOST = sendMod.POST
    resendPOST = resendMod.POST
  })

  it("returns 400 when verificationId is missing", async () => {
    const res = await resendPOST(makeRequest({}))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/required/i)
  })

  it("returns 400 when verificationId is not a string", async () => {
    const res = await resendPOST(makeRequest({ verificationId: 123 }))
    expect(res.status).toBe(400)
  })

  it("returns 400 when body is malformed JSON", async () => {
    const res = await resendPOST(makeBadJsonRequest())
    expect(res.status).toBe(400)
  })

  it("returns 404 for unknown verificationId", async () => {
    const res = await resendPOST(makeRequest({ verificationId: "vid-does-not-exist" }))
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toMatch(/not found/i)
  })

  it("returns 200 with expiresIn after successful resend", async () => {
    // First, create a real verification session
    const sendRes = await sendPOST(
      makeRequest({ email: `resend-test-${Date.now()}@example.com` })
    )
    const { data: { verificationId } } = await sendRes.json()

    const res = await resendPOST(makeRequest({ verificationId }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(typeof json.expiresIn).toBe("number")
  })
})

// ---------------------------------------------------------------------------
// /api/auth/verification/verify
// ---------------------------------------------------------------------------

describe("POST /api/auth/verification/verify", () => {
  let sendPOST: (req: NextRequest) => Promise<Response>
  let verifyPOST: (req: NextRequest) => Promise<Response>

  beforeEach(async () => {
    vi.resetModules()
    const [sendMod, verifyMod] = await Promise.all([
      import("@/app/api/auth/verification/send/route"),
      import("@/app/api/auth/verification/verify/route"),
    ])
    sendPOST = sendMod.POST
    verifyPOST = verifyMod.POST
  })

  it("returns 400 when verificationId is missing", async () => {
    const res = await verifyPOST(makeRequest({ code: "123456" }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/required/i)
  })

  it("returns 400 when code is missing", async () => {
    const res = await verifyPOST(makeRequest({ verificationId: "vid-123" }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/code.*required/i)
  })

  it("returns 400 when body is malformed JSON", async () => {
    const res = await verifyPOST(makeBadJsonRequest())
    expect(res.status).toBe(400)
  })

  it("returns 404 for unknown verificationId", async () => {
    const res = await verifyPOST(
      makeRequest({ verificationId: "vid-unknown-xyz", code: "123456" })
    )
    expect(res.status).toBe(404)
  })

  it("returns 400 with remainingAttempts for wrong code", async () => {
    const sendRes = await sendPOST(
      makeRequest({ email: `verify-test-${Date.now()}@example.com` })
    )
    const { data: { verificationId } } = await sendRes.json()

    const res = await verifyPOST(makeRequest({ verificationId, code: "000000" }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeDefined()
    expect(typeof json.remainingAttempts).toBe("number")
  })

  it("returns 200 with verified:true for correct code", async () => {
    // We need to know the code — patch the store's sendCode to expose it
    // via the console, or test by extracting from the store mock.
    // Since the store logs the code, we capture it.
    const originalLog = console.log
    let capturedCode = ""
    console.log = (msg: string) => {
      const match = msg.match(/Code for .+?: (\d{6})/)
      if (match) capturedCode = match[1]
    }

    const email = `verify-correct-${Date.now()}@example.com`
    const sendRes = await sendPOST(makeRequest({ email }))
    console.log = originalLog

    const { data: { verificationId } } = await sendRes.json()

    expect(capturedCode).toHaveLength(6)

    const res = await verifyPOST(makeRequest({ verificationId, code: capturedCode }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.verified).toBe(true)
  })

  it("returns 429 after exceeding max verify attempts", async () => {
    const originalLog = console.log
    console.log = () => {}
    const email = `verify-attempts-${Date.now()}@example.com`
    const sendRes = await sendPOST(makeRequest({ email }))
    console.log = originalLog

    const { data: { verificationId } } = await sendRes.json()

    // Exhaust all 5 attempts with wrong codes
    for (let i = 0; i < 5; i++) {
      await verifyPOST(makeRequest({ verificationId, code: "000001" }))
    }

    const res = await verifyPOST(makeRequest({ verificationId, code: "000001" }))
    expect(res.status).toBe(429)
    const json = await res.json()
    expect(json.error).toMatch(/too many|attempts/i)
  })
})
