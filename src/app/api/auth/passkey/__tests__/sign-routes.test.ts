// @vitest-environment node
// jsdom's polyfilled crypto/Buffer globals conflict with @noble/curves' bytes
// checks inside @stellar/stellar-base. These are server-side API routes, so
// run them under the real Node environment instead.
import { describe, it, expect, vi, beforeEach } from "vitest"
import fs from "fs"
import path from "path"
import { NextRequest } from "next/server"
import { Account, BASE_FEE, Keypair, Networks, Operation, Transaction, TransactionBuilder } from "@stellar/stellar-base"

// The real `@/lib/passkey/store` module throws at import time (a pre-existing,
// unrelated bug: it calls a `sweepExpired` function that is never defined in
// that file). Mock it here so these tests exercise the sign routes' own
// logic — auth/ownership checks and server-side key derivation — without
// being blocked by that unrelated breakage.
const TEST_PEPPER = "test-server-pepper-for-signing"
const credentials = new Map<string, { userId: string }>()

vi.mock("@/lib/passkey/store", () => ({
  getCredential: vi.fn(async (credentialId: string) => credentials.get(credentialId)),
  getPepper: vi.fn(() => TEST_PEPPER),
}))

import { POST as signTransaction } from "../sign-transaction/route"
import { POST as signMessage } from "../sign-message/route"
import { deriveStellarKeypair, signWithSeed, hexEncode } from "@/lib/crypto/key-derivation"

function writeSessionFixture(userId = "user-123") {
  const contentDir = path.join(process.cwd(), "content")
  fs.mkdirSync(contentDir, { recursive: true })
  fs.writeFileSync(path.join(contentDir, "sessions.json"), JSON.stringify([{ token: "session-token", userId, createdAt: Date.now() }], null, 2))
  fs.writeFileSync(path.join(contentDir, "users.json"), JSON.stringify([{ id: userId, username: "demo", role: "user" }], null, 2))
}

let ipCounter = 0
function nextIp() {
  ipCounter += 1
  return `127.0.0.${ipCounter}`
}

function makeRequest(body: unknown, ip = nextIp()) {
  return new NextRequest("http://localhost:1110/api/auth/passkey/test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
      Cookie: "moistello_session=session-token",
      Origin: "http://localhost:1110",
    },
    body: JSON.stringify(body),
  })
}

function makeUnauthenticatedRequest(body: unknown) {
  return new NextRequest("http://localhost:1110/api/auth/passkey/test", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost:1110" },
    body: JSON.stringify(body),
  })
}

describe("sign-transaction API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    credentials.clear()
    writeSessionFixture()
  })

  it("returns 401 when unauthenticated", async () => {
    const res = await signTransaction(makeUnauthenticatedRequest({ credentialId: "cred-1", xdr: "AAAA" }))
    expect(res.status).toBe(401)
  })

  it("returns 400 for missing credentialId", async () => {
    const res = await signTransaction(makeRequest({ xdr: "AAAA" }))
    expect(res.status).toBe(400)
  })

  it("returns 400 for missing xdr", async () => {
    const res = await signTransaction(makeRequest({ credentialId: "cred-1" }))
    expect(res.status).toBe(400)
  })

  it("returns 400 for unknown credential", async () => {
    const res = await signTransaction(makeRequest({ credentialId: "unknown-cred", xdr: "AAAA" }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe("credential_not_found")
  })

  it("returns 403 when credential belongs to another user", async () => {
    credentials.set("cred-1", { userId: "someone-else" })
    const res = await signTransaction(makeRequest({ credentialId: "cred-1", xdr: "AAAA" }))
    expect(res.status).toBe(403)
  })

  it("returns 400 for invalid XDR", async () => {
    credentials.set("cred-1", { userId: "user-123" })
    const res = await signTransaction(makeRequest({ credentialId: "cred-1", xdr: "not-valid-xdr!!" }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe("invalid_xdr")
  })

  it("never returns a secretKey field", async () => {
    credentials.set("cred-1", { userId: "user-123" })
    // jsdom's crypto shim doesn't play well with Keypair.random()'s CSPRNG
    // call, so use a fixed raw seed for a deterministic test-only source account.
    const sourceKeypair = Keypair.fromRawEd25519Seed(Buffer.from(new Uint8Array(32).fill(7)))
    const account = new Account(sourceKeypair.publicKey(), "0")
    const unsignedXdr = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
      .addOperation(Operation.bumpSequence({ bumpTo: "1" }))
      .setTimeout(30)
      .build()
      .toXDR()

    const res = await signTransaction(makeRequest({ credentialId: "cred-1", xdr: unsignedXdr, networkPassphrase: Networks.TESTNET }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.secretKey).toBeUndefined()
  }, 30000)

  it("signs the transaction server-side with the credential-derived keypair", async () => {
    // 600K-iteration PBKDF2 runs twice here (once in the route, once to
    // compute the expected keypair for verification) — needs headroom.
    credentials.set("cred-1", { userId: "user-123" })
    // jsdom's crypto shim doesn't play well with Keypair.random()'s CSPRNG
    // call, so use a fixed raw seed for a deterministic test-only source account.
    const sourceKeypair = Keypair.fromRawEd25519Seed(Buffer.from(new Uint8Array(32).fill(7)))
    const account = new Account(sourceKeypair.publicKey(), "0")
    const unsignedXdr = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
      .addOperation(Operation.bumpSequence({ bumpTo: "1" }))
      .setTimeout(30)
      .build()
      .toXDR()

    const res = await signTransaction(makeRequest({ credentialId: "cred-1", xdr: unsignedXdr, networkPassphrase: Networks.TESTNET }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(typeof data.signedXdr).toBe("string")

    const signedTx = new Transaction(data.signedXdr, Networks.TESTNET)
    expect(signedTx.signatures.length).toBe(1)

    const expectedKeypair = await deriveStellarKeypair("cred-1", TEST_PEPPER)
    const expectedKp = Keypair.fromRawEd25519Seed(Buffer.from(expectedKeypair.secretKey))
    const verified = expectedKp.verify(signedTx.hash(), signedTx.signatures[0].signature())
    expect(verified).toBe(true)
  }, 30000)
})

describe("sign-message API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    credentials.clear()
    writeSessionFixture()
  })

  it("returns 401 when unauthenticated", async () => {
    const res = await signMessage(makeUnauthenticatedRequest({ credentialId: "cred-1", message: "hello" }))
    expect(res.status).toBe(401)
  })

  it("returns 400 for missing message", async () => {
    const res = await signMessage(makeRequest({ credentialId: "cred-1" }))
    expect(res.status).toBe(400)
  })

  it("returns 403 when credential belongs to another user", async () => {
    credentials.set("cred-1", { userId: "someone-else" })
    const res = await signMessage(makeRequest({ credentialId: "cred-1", message: "hello" }))
    expect(res.status).toBe(403)
  })

  it("never returns a secretKey field", async () => {
    credentials.set("cred-1", { userId: "user-123" })
    const res = await signMessage(makeRequest({ credentialId: "cred-1", message: "hello" }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.secretKey).toBeUndefined()
  }, 30000)

  it("signs the message server-side with the credential-derived keypair", async () => {
    credentials.set("cred-1", { userId: "user-123" })
    const res = await signMessage(makeRequest({ credentialId: "cred-1", message: "hello" }))
    expect(res.status).toBe(200)
    const data = await res.json()

    const expectedKeypair = await deriveStellarKeypair("cred-1", TEST_PEPPER)
    expect(data.publicKey).toBe(hexEncode(expectedKeypair.publicKey))

    const { sha256 } = await import("@noble/hashes/sha2.js")
    const hashBytes = sha256(new TextEncoder().encode("hello"))
    const expectedSignature = await signWithSeed(hashBytes, expectedKeypair.secretKey)
    expect(data.signature).toBe(hexEncode(expectedSignature))
  }, 30000)
})
