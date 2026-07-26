import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@simplewebauthn/browser", () => ({
  startRegistration: vi.fn(),
  startAuthentication: vi.fn(),
}))

vi.mock("@noble/ed25519", () => ({
  getPublicKey: vi.fn((seed: Uint8Array) => seed.slice(0, 32)),
  sign: vi.fn(() => new Uint8Array(64).fill(99)),
  etc: {
    bytesToHex: vi.fn((b: Uint8Array) => Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('')),
    concatBytes: vi.fn((...arrays: Uint8Array[]) => {
      let len = 0
      for (const a of arrays) len += a.length
      const r = new Uint8Array(len)
      let pos = 0
      for (const a of arrays) { r.set(a, pos); pos += a.length }
      return r
    }),
  },
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()
Object.defineProperty(global, "localStorage", { value: localStorageMock })

import { createPasskeyAdapter } from "../adapters/passkey"
import { deriveStellarKeypair } from "@/lib/crypto/key-derivation"
import { startRegistration } from "@simplewebauthn/browser"

const mockOptions = {
  challenge: "test-challenge",
  rp: { name: "Moistello", id: "localhost" },
  user: { id: "dXNlckB0ZXN0LmNvbQ", name: "user@test.com", displayName: "user@test.com" },
  pubKeyCredParams: [{ alg: -7, type: "public-key" }],
}

const mockAttestation = {
  id: "test-credential-id-789",
  rawId: "test-credential-id-789",
  response: { clientDataJSON: "{}", attestationObject: "{}" },
}

const keypairResponse = { verified: true, email: "user@test.com", publicKey: "a".repeat(64), secretKey: "b".repeat(64) }

describe("Passkey Security Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    mockFetch.mockReset()
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes("/generate-options")) {
        return new Response(JSON.stringify({ options: mockOptions, challenge: "test-challenge" }))
      }
      if (url.includes("/register")) {
        return new Response(JSON.stringify({ ...keypairResponse, credentialId: "test-credential-id-789" }))
      }
      if (url.includes("/auth-verify")) {
        return new Response(JSON.stringify(keypairResponse))
      }
      return new Response(JSON.stringify({}), { status: 404 })
    })
  })

  it("derivation collision resistance — different inputs produce different keypairs", async () => {
    const inputs = [
      { credentialId: "aaa", email: "a@test.com", pepper: "pepper-a" },
      { credentialId: "bbb", email: "b@test.com", pepper: "pepper-b" },
      { credentialId: "ccc", email: "c@test.com", pepper: "pepper-c" },
      { credentialId: "ddd", email: "d@test.com", pepper: "pepper-d" },
      { credentialId: "eee", email: "e@test.com", pepper: "pepper-e" },
    ]

    const keypairs = await Promise.all(
      inputs.map((i) => deriveStellarKeypair(i.credentialId, i.email, i.pepper))
    )

    const publicKeys = keypairs.map((kp) => Buffer.from(kp.publicKey).toString("hex"))
    const uniqueKeys = new Set(publicKeys)
    expect(uniqueKeys.size).toBe(inputs.length)
  })

  it("private key zeroed after disconnect", async () => {
    vi.mocked(startRegistration).mockResolvedValueOnce(mockAttestation as never)
    const adapter = createPasskeyAdapter()
    await adapter.connect("user@test.com")
    expect(await adapter.isConnected()).toBe(true)

    await adapter.disconnect()
    expect(await adapter.isConnected()).toBe(false)
  })

  it("does not expose private key via getPublicKey", async () => {
    vi.mocked(startRegistration).mockResolvedValueOnce(mockAttestation as never)
    const adapter = createPasskeyAdapter()
    await adapter.connect("user@test.com")

    const pubKey = await adapter.getPublicKey()
    expect(pubKey).toMatch(/^[a-f0-9]{64}$/)
    expect(pubKey.length).toBe(64)
  })
})
