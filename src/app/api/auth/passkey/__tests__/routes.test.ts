import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import fs from "fs"
import path from "path"
import { NextRequest } from "next/server"

vi.mock("@simplewebauthn/server", () => ({
  generateRegistrationOptions: vi.fn().mockResolvedValue({
    challenge: "reg-challenge-abc",
    rp: { name: "Moistello", id: "localhost" },
    user: { id: "user-123", name: "user@test.com", displayName: "user@test.com" },
    pubKeyCredParams: [{ alg: -7, type: "public-key" }],
    authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "required" },
    timeout: 120000,
    attestation: "none",
  }),
  generateAuthenticationOptions: vi.fn().mockResolvedValue({
    challenge: "auth-challenge-xyz",
    rpId: "localhost",
    allowCredentials: [{ id: "cred-id-123", transports: ["internal"] }],
    userVerification: "required",
    timeout: 60000,
  }),
  verifyRegistrationResponse: vi.fn().mockResolvedValue({
    verified: true,
    registrationInfo: {
      credential: {
        id: "new-cred-id",
        publicKey: new Uint8Array(32).fill(42),
        counter: 0,
        transports: ["internal"],
      },
    },
  }),
  verifyAuthenticationResponse: vi.fn().mockResolvedValue({
    verified: true,
    authenticationInfo: {
      newCounter: 1,
      credentialId: "cred-id-123",
    },
  }),
}))

import { POST as generateOptions } from "../generate-options/route"
import { POST as register } from "../register/route"
import { POST as authVerify } from "../auth-verify/route"

function writeSessionFixture(userId = "user-123") {
  const contentDir = path.join(process.cwd(), "content")
  fs.mkdirSync(contentDir, { recursive: true })
  fs.writeFileSync(path.join(contentDir, "sessions.json"), JSON.stringify([{ token: "session-token", userId, createdAt: Date.now() }], null, 2))
  fs.writeFileSync(path.join(contentDir, "users.json"), JSON.stringify([{ id: userId, username: "demo", role: "user" }], null, 2))
}

function makeRequest(body: unknown, ip = "127.0.0.1") {
  return new NextRequest("http://localhost:1110/api/auth/passkey/test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
      Cookie: "moistello_session=session-token",
    },
    body: JSON.stringify(body),
  })
}

function makeUnauthenticatedRequest(body: unknown) {
  return new NextRequest("http://localhost:1110/api/auth/passkey/test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
}

describe("passkey API security", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns registration options with tempKey", async () => {
    const res = await generateOptions(makeRequest({ mode: "register" }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.options).toBeDefined()
    expect(data.options.challenge).toBe("reg-challenge-abc")
    expect(data.challenge).toBe("reg-challenge-abc")
    expect(data.tempKey).toBeDefined()
    expect(typeof data.tempKey).toBe("string")
  })

  it("returns authentication options with tempKey for valid credentialId", async () => {
    const res = await generateOptions(makeRequest({ credentialId: "cred-id-123", mode: "authenticate" }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.options).toBeDefined()
    expect(data.options.challenge).toBe("auth-challenge-xyz")
    expect(data.tempKey).toBeDefined()
  })

  it("returns 200 for authenticate mode without credentialId (discoverable)", async () => {
    const res = await generateOptions(makeRequest({ mode: "authenticate" }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tempKey).toBeDefined()
  })

  it("returns 400 for invalid mode", async () => {
    const res = await generateOptions(makeRequest({ mode: "unknown" }))
    expect(res.status).toBe(400)
  })

  it("stores challenge retrievable via tempKey for registration", async () => {
    const res = await generateOptions(makeRequest({ mode: "register" }))
    const { tempKey } = await res.json()
    const { getAndVerifyTempChallenge } = await import("@/lib/passkey/store")
    expect(getAndVerifyTempChallenge(tempKey, "reg-challenge-abc")).toBe(true)
  })

  it("stores challenge retrievable via tempKey for authentication", async () => {
    const res = await generateOptions(makeRequest({ credentialId: "cred-id-123", mode: "authenticate" }))
    const { tempKey } = await res.json()
    const { getAndVerifyTempChallenge } = await import("@/lib/passkey/store")
    expect(getAndVerifyTempChallenge(tempKey, "auth-challenge-xyz")).toBe(true)
  })
})

describe("register API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 400 for missing attestation", async () => {
    const res = await register(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it("returns 400 for missing clientDataJSON", async () => {
    const res = await register(makeRequest({ attestation: { id: "test" } }))
    expect(res.status).toBe(400)
  })

  it("returns 400 when tempKey is missing", async () => {
    const res = await register(makeRequest({
      attestation: { id: "test", rawId: "test", response: { clientDataJSON: btoa(JSON.stringify({ challenge: "x" })) } },
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe("challenge_mismatch")
  })

  it("returns 400 when challenge not stored (replay attack)", async () => {
    const res = await register(makeRequest({
      tempKey: "nonexistent-key",
      attestation: { id: "test", rawId: "test", response: { clientDataJSON: btoa(JSON.stringify({ challenge: "never-stored" })) } },
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe("challenge_mismatch")
  })

  it("returns verified response with keypair on success", async () => {
    const genRes = await generateOptions(makeRequest({ mode: "register" }))
    const { tempKey } = await genRes.json()

    const res = await register(makeRequest({
      tempKey,
      attestation: { id: "some-id", rawId: "some-id", response: { clientDataJSON: btoa(JSON.stringify({ challenge: "reg-challenge-abc" })) } },
    }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.verified).toBe(true)
    expect(data.credentialId).toBe("new-cred-id")
    expect(data.publicKey).toBeDefined()
    expect(typeof data.publicKey).toBe("string")
    expect(data.secretKey).toBeDefined()
    expect(typeof data.secretKey).toBe("string")
  })

  it("stores credential after successful registration", async () => {
    const genRes = await generateOptions(makeRequest({ mode: "register" }))
    const { tempKey } = await genRes.json()

    await register(makeRequest({
      tempKey,
      attestation: { id: "some-id", rawId: "some-id", response: { clientDataJSON: btoa(JSON.stringify({ challenge: "reg-challenge-abc" })) } },
    }))

    const { getCredential } = await import("@/lib/passkey/store")
    const cred = await getCredential("new-cred-id")
    expect(cred).toBeDefined()
    expect(cred!.credentialId).toBe("new-cred-id")
    expect(cred!.counter).toBe(0)
  })
})

describe("auth-verify API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 400 for missing credentialId", async () => {
    const res = await authVerify(makeRequest({ assertion: {} }))
    expect(res.status).toBe(400)
  })

  it("returns 400 for missing assertion", async () => {
    const res = await authVerify(makeRequest({ credentialId: "cred-id" }))
    expect(res.status).toBe(400)
  })

  it("returns 400 for unknown credential", async () => {
    const res = await authVerify(makeRequest({
      credentialId: "unknown-cred",
      assertion: { response: { clientDataJSON: btoa(JSON.stringify({ challenge: "x" })) } },
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe("credential_not_found")
  })

  it("returns 400 when tempKey is missing", async () => {
    const { storeCredential } = await import("@/lib/passkey/store")
    await storeCredential("cred-id-123", {
      publicKey: new Uint8Array(32).fill(1),
      counter: 0,
    })

    const res = await authVerify(makeRequest({
      credentialId: "cred-id-123",
      assertion: { response: { clientDataJSON: btoa(JSON.stringify({ challenge: "x" })) } },
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe("challenge_mismatch")
  })

  it("returns 400 when challenge not stored (replay)", async () => {
    const { storeCredential } = await import("@/lib/passkey/store")
    await storeCredential("cred-id-123", {
      publicKey: new Uint8Array(32).fill(1),
      counter: 0,
    })

    const res = await authVerify(makeRequest({
      credentialId: "cred-id-123",
      tempKey: "nonexistent-key",
      assertion: { response: { clientDataJSON: btoa(JSON.stringify({ challenge: "never-stored" })) } },
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe("challenge_mismatch")
  })

  it("returns verified response with keypair on success", async () => {
    const { storeCredential } = await import("@/lib/passkey/store")
    await storeCredential("cred-id-123", {
      publicKey: new Uint8Array(32).fill(1),
      counter: 0,
    })

    const genRes = await generateOptions(makeRequest({ credentialId: "cred-id-123", mode: "authenticate" }))
    const { tempKey } = await genRes.json()

    const res = await authVerify(makeRequest({
      credentialId: "cred-id-123",
      tempKey,
      assertion: { response: { clientDataJSON: btoa(JSON.stringify({ challenge: "auth-challenge-xyz" })) } },
    }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.verified).toBe(true)
    expect(data.publicKey).toBeDefined()
    expect(typeof data.publicKey).toBe("string")
    expect(data.secretKey).toBeDefined()
    expect(typeof data.secretKey).toBe("string")
  })

  it("updates counter after successful verification", async () => {
    const { storeCredential, getCredential } = await import("@/lib/passkey/store")
    await storeCredential("cred-counter-test", {
      publicKey: new Uint8Array(32).fill(1),
      counter: 0,
    })

    const genRes = await generateOptions(makeRequest({ credentialId: "cred-counter-test", mode: "authenticate" }))
    const { tempKey } = await genRes.json()

    await authVerify(makeRequest({
      credentialId: "cred-counter-test",
      tempKey,
      assertion: { response: { clientDataJSON: btoa(JSON.stringify({ challenge: "auth-challenge-xyz" })) } },
    }))

    const cred = await getCredential("cred-counter-test")
    expect(cred).toBeDefined()
    expect(cred!.counter).toBe(1)
  })
})
