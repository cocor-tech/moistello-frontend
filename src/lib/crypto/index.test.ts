import { describe, expect, it } from "vitest"
import {
  deriveStellarKeypair,
  hexEncode,
  publicKeyToStellarAddress,
  secureZeroMemory,
  signWithSeed,
} from "./index"

describe("hexEncode", () => {
  it("encodes a byte array to a lowercase hex string", () => {
    const bytes = new Uint8Array([0x00, 0xff, 0x10, 0xab])
    expect(hexEncode(bytes)).toBe("00ff10ab")
  })

  it("returns an empty string for an empty array", () => {
    expect(hexEncode(new Uint8Array([]))).toBe("")
  })
})

describe("secureZeroMemory", () => {
  it("fills the buffer with zeros", () => {
    const buf = new Uint8Array([1, 2, 3, 4])
    secureZeroMemory(buf)
    expect(Array.from(buf)).toEqual([0, 0, 0, 0])
  })

  it("handles an empty buffer without throwing", () => {
    expect(() => secureZeroMemory(new Uint8Array([]))).not.toThrow()
  })
})

describe("deriveStellarKeypair", () => {
  it("returns a publicKey and secretKey of 32 bytes each", async () => {
    const { publicKey, secretKey } = await deriveStellarKeypair("cred-id-001")
    expect(publicKey).toHaveLength(32)
    expect(secretKey).toHaveLength(32)
  })

  it("produces a different keypair for a different credential ID", async () => {
    const a = await deriveStellarKeypair("cred-a")
    const b = await deriveStellarKeypair("cred-b")
    expect(hexEncode(a.publicKey)).not.toBe(hexEncode(b.publicKey))
  })

  it("produces the same keypair for the same inputs", async () => {
    const a = await deriveStellarKeypair("cred-stable", "pepper", "user@example.com")
    const b = await deriveStellarKeypair("cred-stable", "pepper", "user@example.com")
    expect(hexEncode(a.publicKey)).toBe(hexEncode(b.publicKey))
    expect(hexEncode(a.secretKey)).toBe(hexEncode(b.secretKey))
  })
})

describe("publicKeyToStellarAddress", () => {
  it("returns a string that starts with G", async () => {
    const { publicKey } = await deriveStellarKeypair("cred-addr-test")
    const address = publicKeyToStellarAddress(publicKey)
    expect(address).toMatch(/^G/)
  })

  it("returns a 56-character Stellar address", async () => {
    const { publicKey } = await deriveStellarKeypair("cred-addr-len")
    const address = publicKeyToStellarAddress(publicKey)
    expect(address).toHaveLength(56)
  })
})

describe("signWithSeed", () => {
  it("returns a 64-byte signature", async () => {
    const { secretKey } = await deriveStellarKeypair("cred-sign-test")
    const message = new TextEncoder().encode("hello moistello")
    const sig = await signWithSeed(message, secretKey)
    expect(sig).toHaveLength(64)
  })

  it("produces the same signature for the same message and seed", async () => {
    const { secretKey } = await deriveStellarKeypair("cred-det")
    const message = new TextEncoder().encode("deterministic")
    const sig1 = await signWithSeed(message, secretKey)
    const sig2 = await signWithSeed(message, secretKey)
    expect(hexEncode(sig1)).toBe(hexEncode(sig2))
  })

  it("produces different signatures for different messages", async () => {
    const { secretKey } = await deriveStellarKeypair("cred-diff-msg")
    const sig1 = await signWithSeed(new TextEncoder().encode("msg-a"), secretKey)
    const sig2 = await signWithSeed(new TextEncoder().encode("msg-b"), secretKey)
    expect(hexEncode(sig1)).not.toBe(hexEncode(sig2))
  })
})
