// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest, NextResponse } from "next/server"

vi.mock("@simplewebauthn/server", () => ({
  generateRegistrationOptions: vi.fn().mockResolvedValue({
    challenge: "mock-reg-challenge-123",
    rp: { name: "Moistello", id: "localhost" },
    user: { id: "user-123", name: "user-123", displayName: "user-123" },
    pubKeyCredParams: [{ alg: -7, type: "public-key" }],
    timeout: 120000,
  }),
  generateAuthenticationOptions: vi.fn().mockResolvedValue({
    challenge: "mock-auth-challenge-456",
    rpId: "localhost",
    allowCredentials: [{ id: "cred-1", transports: ["internal"] }],
    userVerification: "required",
    timeout: 60000,
  }),
}))

const mockRequireAuthenticatedUser = vi.fn()
const mockCheckRateLimit = vi.fn()

vi.mock("@/lib/passkey/auth-guard", () => ({
  requireAuthenticatedUser: (...args: unknown[]) => mockRequireAuthenticatedUser(...args),
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}))

const mockGetRpId = vi.fn().mockReturnValue("localhost")
const mockSetTempChallenge = vi.fn().mockResolvedValue("temp-challenge-key-abc")
const mockGetCredential = vi.fn()

vi.mock("@/lib/passkey/store", () => ({
  getRpId: () => mockGetRpId(),
  setTempChallenge: (c: string) => mockSetTempChallenge(c),
  getCredential: (id: string) => mockGetCredential(id),
}))

import { POST } from "./route"

function makeRequest(body?: unknown, headers: Record<string, string> = {}) {
  const reqInit: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  }
  if (body !== undefined) {
    reqInit.body = typeof body === "string" ? body : JSON.stringify(body)
  }
  return new NextRequest("http://localhost/api/auth/passkey/generate-options", reqInit)
}

describe("POST /api/auth/passkey/generate-options", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAuthenticatedUser.mockReturnValue({
      ok: true,
      user: { id: "user-123", username: "tester" },
    })
    mockCheckRateLimit.mockReturnValue({
      allowed: true,
      retryAfterMs: 60000,
    })
  })

  it("returns 401 when the user is not authenticated", async () => {
    mockRequireAuthenticatedUser.mockReturnValueOnce({
      ok: false,
      response: NextResponse.json({ error: "unauthenticated" }, { status: 401 }),
    })

    const req = makeRequest({ mode: "register" })
    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe("unauthenticated")
  })

  it("returns 429 when rate limit is exceeded", async () => {
    mockCheckRateLimit.mockReturnValueOnce({
      allowed: false,
      retryAfterMs: 30000,
    })

    const req = makeRequest({ mode: "register" })
    const res = await POST(req)
    expect(res.status).toBe(429)
    expect(res.headers.get("Retry-After")).toBe("30")
    const json = await res.json()
    expect(json.error).toBe("rate_limited")
  })

  it("returns 500 when request body contains invalid JSON", async () => {
    const req = makeRequest("invalid json{")
    const res = await POST(req)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it("returns 400 when mode is invalid or missing", async () => {
    const reqNoMode = makeRequest({})
    const resNoMode = await POST(reqNoMode)
    expect(resNoMode.status).toBe(400)
    const jsonNoMode = await resNoMode.json()
    expect(jsonNoMode.error).toBe("invalid_mode")

    const reqInvalid = makeRequest({ mode: "unknown-mode" })
    const resInvalid = await POST(reqInvalid)
    expect(resInvalid.status).toBe(400)
    const jsonInvalid = await resInvalid.json()
    expect(jsonInvalid.error).toBe("invalid_mode")
  })

  it("returns registration options and tempKey on register mode", async () => {
    const req = makeRequest({ mode: "register" })
    const res = await POST(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.options).toBeDefined()
    expect(json.challenge).toBe("mock-reg-challenge-123")
    expect(json.tempKey).toBe("temp-challenge-key-abc")
    expect(mockSetTempChallenge).toHaveBeenCalledWith("mock-reg-challenge-123")
  })

  it("returns authentication options for discoverable credential (no credentialId)", async () => {
    const req = makeRequest({ mode: "authenticate" })
    const res = await POST(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.options).toBeDefined()
    expect(json.challenge).toBe("mock-auth-challenge-456")
    expect(json.tempKey).toBe("temp-challenge-key-abc")
    expect(mockSetTempChallenge).toHaveBeenCalledWith("mock-auth-challenge-456")
  })

  it("returns 404 when credentialId is not found", async () => {
    mockGetCredential.mockResolvedValueOnce(null)

    const req = makeRequest({ mode: "authenticate", credentialId: "missing-cred" })
    const res = await POST(req)
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe("credential_not_found")
  })

  it("returns 404 when credentialId belongs to another user", async () => {
    mockGetCredential.mockResolvedValueOnce({
      credentialId: "other-cred",
      userId: "different-user-999",
      publicKey: new Uint8Array(32),
      counter: 0,
    })

    const req = makeRequest({ mode: "authenticate", credentialId: "other-cred" })
    const res = await POST(req)
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe("credential_not_found")
  })

  it("returns authentication options when credentialId is valid and matches user", async () => {
    mockGetCredential.mockResolvedValueOnce({
      credentialId: "cred-1",
      userId: "user-123",
      publicKey: new Uint8Array(32),
      counter: 0,
    })

    const req = makeRequest({ mode: "authenticate", credentialId: "cred-1" })
    const res = await POST(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.options).toBeDefined()
    expect(json.challenge).toBe("mock-auth-challenge-456")
    expect(json.tempKey).toBe("temp-challenge-key-abc")
    expect(mockSetTempChallenge).toHaveBeenCalledWith("mock-auth-challenge-456")
  })
})
