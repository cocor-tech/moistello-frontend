// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

function makeRequest(body: unknown, url = "http://localhost/api/auth/verification/resend") {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function makeBadJsonRequest(url = "http://localhost/api/auth/verification/resend") {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{{not-valid-json",
  })
}

describe("POST /api/auth/verification/resend", () => {
  let sendPOST: (req: NextRequest) => Promise<Response>
  let resendPOST: (req: NextRequest) => Promise<Response>

  beforeEach(async () => {
    vi.resetModules()
    const [sendMod, resendMod] = await Promise.all([
      import("@/app/api/auth/verification/send/route"),
      import("./route"),
    ])
    sendPOST = sendMod.POST
    resendPOST = resendMod.POST
  })

  it("returns 400 when body is malformed JSON", async () => {
    const res = await resendPOST(makeBadJsonRequest())
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("Invalid JSON")
  })

  it("returns 400 when verificationId is missing", async () => {
    const res = await resendPOST(makeRequest({}))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/verification id is required/i)
  })

  it("returns 400 when verificationId is not a string", async () => {
    const resNum = await resendPOST(makeRequest({ verificationId: 12345 }))
    expect(resNum.status).toBe(400)
    const jsonNum = await resNum.json()
    expect(jsonNum.error).toMatch(/verification id is required/i)

    const resObj = await resendPOST(makeRequest({ verificationId: {} }))
    expect(resObj.status).toBe(400)
  })

  it("returns 404 for unknown or expired verificationId", async () => {
    const res = await resendPOST(makeRequest({ verificationId: "vid-non-existent" }))
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toMatch(/not found/i)
  })

  it("returns 200 with expiresIn after successful resend", async () => {
    const sendRes = await sendPOST(
      new NextRequest("http://localhost/api/auth/verification/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: `resend-test-${Date.now()}@example.com` }),
      })
    )
    expect(sendRes.status).toBe(200)
    const sendJson = await sendRes.json()
    const verificationId = sendJson.data.verificationId

    const res = await resendPOST(makeRequest({ verificationId }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(typeof json.expiresIn).toBe("number")
    expect(json.expiresIn).toBeGreaterThan(0)
  })

  it("returns 429 when resend rate limit is exceeded", async () => {
    const email = `resend-limit-${Date.now()}@example.com`
    const sendRes = await sendPOST(
      new NextRequest("http://localhost/api/auth/verification/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
    )
    const sendJson = await sendRes.json()
    const verificationId = sendJson.data.verificationId

    // Max 3 sends per window in store
    // 1 was used by sendCode, next 2 resends succeed
    await resendPOST(makeRequest({ verificationId }))
    await resendPOST(makeRequest({ verificationId }))

    // 4th send should hit rate limit
    const res = await resendPOST(makeRequest({ verificationId }))
    expect(res.status).toBe(429)
    const json = await res.json()
    expect(json.error).toMatch(/too many/i)
  })
})
