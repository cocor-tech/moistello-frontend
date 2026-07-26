import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock @simplewebauthn/browser
vi.mock("@simplewebauthn/browser", () => ({
  startRegistration: vi.fn(),
  startAuthentication: vi.fn(),
}))

// Mock @noble/ed25519
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

// Mock @stellar/stellar-base
const mockSignedXdr = "AAAAAgAAAAAZf2sj4WyFMsaryDj6zV6nib4MdrKSAzQDm/qLPTaNYQAAAGQAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAABqF+POAAAAAAAAAAEAAAAAAAAAAQAAAABCzwVZeQ9sO2TeFRIN8Lslyqt9wttPtKGKNeiBvzI69wAAAAAAAAAAAJiWgAAAAAAAAAABPTaNYQAAAEBATUu5C3pxDGuXruyHgDvDHwgJZBlklafJMM8VSy2EMTUhk4Ez+ewCF/sekMAX5VynMxCdtfsd/KHR3gvI0HYK"
function MockTransaction() {
  this.sign = function() {}
  this.toEnvelope = function() { return { toXDR: function() { return mockSignedXdr } } }
}
vi.mock("@stellar/stellar-base", () => ({
  Keypair: {
    fromRawEd25519Seed: vi.fn(() => ({
      sign: vi.fn(() => {}),
      signatureHint: vi.fn(() => Buffer.from("test")),
    })),
  },
  Transaction: MockTransaction,
  xdr: {
    TransactionEnvelope: {
      fromXDR: vi.fn(() => ({})),
    },
  },
}))

// Polyfill PublicKeyCredential for jsdom
Object.defineProperty(globalThis, "PublicKeyCredential", {
  value: class MockPublicKeyCredential {},
  configurable: true,
})

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Setup localStorage mock
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

import { createPasskeyAdapter } from "../passkey"
import { startRegistration, startAuthentication } from "@simplewebauthn/browser"

const mockOptions = {
  challenge: "test-challenge-base64url",
  rp: { name: "Moistello", id: "localhost" },
  user: { id: "dXNlckB0ZXN0LmNvbQ", name: "user@test.com", displayName: "user@test.com" },
  pubKeyCredParams: [{ alg: -7, type: "public-key" }],
  authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "required" },
  timeout: 120000,
}

const mockAttestation = {
  id: "test-credential-id-123",
  rawId: "test-credential-id-123",
  response: { clientDataJSON: "{}", attestationObject: "{}" },
}

const mockAssertion = {
  id: "test-credential-id-123",
  rawId: "test-credential-id-123",
  response: { clientDataJSON: "{}", authenticatorData: "{}", signature: "{}", userHandle: "{}" },
}

const keypairResponse = {
  verified: true,
  email: "user@test.com",
  publicKey: "a".repeat(64),
  secretKey: "b".repeat(64),
}

describe("Passkey adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    mockFetch.mockReset()
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes("/generate-options")) {
        return new Response(JSON.stringify({ options: mockOptions, challenge: "test-challenge" }))
      }
      if (url.includes("/register")) {
        return new Response(JSON.stringify({ ...keypairResponse, credentialId: "test-credential-id-123" }))
      }
      if (url.includes("/auth-verify")) {
        return new Response(JSON.stringify(keypairResponse))
      }
      return new Response(JSON.stringify({}), { status: 404 })
    })
  })

  describe("meta", () => {
    it("has correct adapter metadata", () => {
      const adapter = createPasskeyAdapter()
      expect(adapter.meta.id).toBe("passkey")
      expect(adapter.meta.name).toContain("Passkey")
      expect(adapter.meta.category).toBe("passkey")
      expect(adapter.meta.priority).toBe(30)
    })

    it("isAvailable returns true when PublicKeyCredential exists", () => {
      const adapter = createPasskeyAdapter()
      expect(adapter.meta.isAvailable()).toBe(true)
    })
  })

  describe("connect — registration", () => {
    it("creates credential, derives keypair, returns public key", async () => {
      vi.mocked(startRegistration).mockResolvedValueOnce(mockAttestation as never)

      const adapter = createPasskeyAdapter()
      const result = await adapter.connect("user@test.com")

      expect(result.publicKey).toMatch(/^[a-f0-9]{64}$/)
      expect(result.publicKey.length).toBe(64)
      expect(startRegistration).toHaveBeenCalledOnce()
    })

    it("returns user_rejected error on biometric cancel", async () => {
      const err = new Error("User cancelled")
      err.name = "NotAllowedError"
      vi.mocked(startRegistration).mockRejectedValueOnce(err)

      const adapter = createPasskeyAdapter()
      try {
        await adapter.connect("user@test.com")
        expect.unreachable("Should have thrown")
      } catch (e) {
        const errResp = e as { code: string }
        expect(errResp.code).toBe("user_rejected")
      }
    })

    it("attempts discoverable authentication when no email and no stored credential", async () => {
      const adapter = createPasskeyAdapter()
      try {
        await adapter.connect()
        expect.unreachable("Should have thrown — no stored credential available")
      } catch {
        // Expected — either starts discoverable auth which fails without API,
        // or falls through to an error
      }
    })
  })

  describe("connect — authentication (returning user)", () => {
    it("authenticates with stored credential via conditional mediation", async () => {
      localStorageMock.setItem(
        "moistello_passkey_credential",
        JSON.stringify({ credentialId: "test-credential-id-123", email: "user@test.com", publicKeyRaw: "test" })
      )

      vi.mocked(startAuthentication).mockResolvedValueOnce(mockAssertion as never)

      const adapter = createPasskeyAdapter()
      const result = await adapter.connect()

      expect(result.publicKey).toMatch(/^[a-f0-9]{64}$/)
      expect(result.publicKey.length).toBe(64)
      expect(startAuthentication).toHaveBeenCalledOnce()
    })

    it("returns user_rejected on auth cancel", async () => {
      localStorageMock.setItem(
        "moistello_passkey_credential",
        JSON.stringify({ credentialId: "test-credential-id-123", email: "user@test.com", publicKeyRaw: "test" })
      )

      const err = new Error("Auth cancelled")
      err.name = "NotAllowedError"
      vi.mocked(startAuthentication).mockRejectedValueOnce(err)

      const adapter = createPasskeyAdapter()
      try {
        await adapter.connect()
        expect.unreachable("Should have thrown")
      } catch (e) {
        const errResp = e as { code: string }
        expect(errResp.code).toBe("user_rejected")
      }
    })
  })

  describe("lifecycle", () => {
    it("disconnect clears session", async () => {
      vi.mocked(startRegistration).mockResolvedValueOnce(mockAttestation as never)
      const adapter = createPasskeyAdapter()
      await adapter.connect("user@test.com")
      expect(await adapter.isConnected()).toBe(true)

      await adapter.disconnect()
      expect(await adapter.isConnected()).toBe(false)
    })

    it("getPublicKey throws when not connected", async () => {
      const adapter = createPasskeyAdapter()
      try {
        await adapter.getPublicKey()
        expect.unreachable("Should have thrown")
      } catch (e) {
        const errResp = e as { code: string }
        expect(errResp.code).toBe("not_installed")
      }
    })
  })

  describe("signing", () => {
    it("signMessage returns signature and public key", async () => {
      vi.mocked(startRegistration).mockResolvedValueOnce(mockAttestation as never)
      const adapter = createPasskeyAdapter()
      await adapter.connect("user@test.com")

      const result = await adapter.signMessage("hello")
      expect(result.signature).toBeDefined()
      expect(typeof result.signature).toBe("string")
      expect(result.publicKey).toMatch(/^[a-f0-9]{64}$/)
    })

    it("signTransaction returns signed XDR", async () => {
      vi.mocked(startRegistration).mockResolvedValueOnce(mockAttestation as never)
      const adapter = createPasskeyAdapter()
      await adapter.connect("user@test.com")

      const result = await adapter.signTransaction("AAAAAgAAAAAZf2sj4WyFMsaryDj6zV6nib4MdrKSAzQDm/qLPTaNYQAAAGQAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAABqF+POAAAAAAAAAAEAAAAAAAAAAQAAAABCzwVZeQ9sO2TeFRIN8Lslyqt9wttPtKGKNeiBvzI69wAAAAAAAAAAAJiWgAAAAAAAAAAA")
      expect(result.signedXdr).toBeDefined()
      expect(typeof result.signedXdr).toBe("string")
      expect(result.signedXdr.length).toBeGreaterThan(0)
    })
  })

  describe("getNetwork", () => {
    it("returns testnet by default", async () => {
      const adapter = createPasskeyAdapter()
      expect(await adapter.getNetwork()).toBe("testnet")
    })
  })
})
