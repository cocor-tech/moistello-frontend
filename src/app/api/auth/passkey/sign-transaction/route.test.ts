// @vitest-environment node
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest"
import fs from "fs"
import path from "path"
import { NextRequest } from "next/server"
import { Account, BASE_FEE, Keypair, Networks, Operation, TransactionBuilder } from "@stellar/stellar-base"

const TEST_PEPPER = "test-server-pepper-for-signing"
const credentials = new Map<string, { userId: string }>()

vi.mock("@/lib/passkey/store", () => ({
  getCredential: vi.fn(async (credentialId: string) => credentials.get(credentialId)),
  getPepper: vi.fn(() => TEST_PEPPER),
}))

import { POST as signTransaction } from "./route"

const contentDir = path.join(process.cwd(), "content")
const sessionsFile = path.join(contentDir, "sessions.json")
const usersFile = path.join(contentDir, "users.json")
let originalSessions: string | null = null
let originalUsers: string | null = null

function writeSessionFixture(userId = "user-123") {
  fs.mkdirSync(contentDir, { recursive: true })
  fs.writeFileSync(
    sessionsFile,
    JSON.stringify([{ token: "session-token", userId, createdAt: Date.now() }], null, 2)
  )
  fs.writeFileSync(
    usersFile,
    JSON.stringify([{ id: userId, username: "demo", role: "user" }], null, 2)
  )
}

let ipCounter = 200
function nextIp() {
  ipCounter += 1
  return `127.0.0.${ipCounter}`
}

function makeRequest(body: unknown, ip = nextIp()) {
  return new NextRequest("http://localhost:1110/api/auth/passkey/sign-transaction", {
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
  return new NextRequest("http://localhost:1110/api/auth/passkey/sign-transaction", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost:1110" },
    body: JSON.stringify(body),
  })
}

describe("POST /api/auth/passkey/sign-transaction (route-level tests)", () => {
  beforeAll(() => {
    if (fs.existsSync(sessionsFile)) originalSessions = fs.readFileSync(sessionsFile, "utf-8")
    if (fs.existsSync(usersFile)) originalUsers = fs.readFileSync(usersFile, "utf-8")
  })

  afterAll(() => {
    if (originalSessions !== null) {
      fs.writeFileSync(sessionsFile, originalSessions)
    }
    if (originalUsers !== null) {
      fs.writeFileSync(usersFile, originalUsers)
    }
  })

  beforeEach(() => {
    vi.clearAllMocks()
    credentials.clear()
    writeSessionFixture()
  })

  describe("Authentication & Authorization Guard", () => {
    it("returns 401 when request is unauthenticated", async () => {
      const res = await signTransaction(
        makeUnauthenticatedRequest({ credentialId: "cred-1", xdr: "AAAA" })
      )
      expect(res.status).toBe(401)
    })

    it("returns 403 when credential belongs to a different user", async () => {
      credentials.set("cred-other", { userId: "someone-else" })
      const res = await signTransaction(
        makeRequest({ credentialId: "cred-other", xdr: "AAAA" })
      )
      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toBe("forbidden")
    })
  })

  describe("Validation & Error States", () => {
    it("returns 400 when credentialId is missing", async () => {
      const res = await signTransaction(makeRequest({ xdr: "AAAA" }))
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe("missing_credential_id")
    })

    it("returns 400 when xdr is missing", async () => {
      const res = await signTransaction(makeRequest({ credentialId: "cred-1" }))
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe("missing_xdr")
    })

    it("returns 400 when credential is not found in store", async () => {
      const res = await signTransaction(
        makeRequest({ credentialId: "non-existent-cred", xdr: "AAAA" })
      )
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe("credential_not_found")
    })

    it("returns 400 when xdr is malformed", async () => {
      credentials.set("cred-1", { userId: "user-123" })
      const res = await signTransaction(
        makeRequest({ credentialId: "cred-1", xdr: "not-valid-xdr!!" })
      )
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe("invalid_xdr")
    })
  })

  describe("Success & Secure Signing State", () => {
    it("signs valid transaction envelope and never exposes secretKey", async () => {
      credentials.set("cred-1", { userId: "user-123" })
      const sourceKeypair = Keypair.fromRawEd25519Seed(Buffer.from(new Uint8Array(32).fill(7)))
      const account = new Account(sourceKeypair.publicKey(), "0")
      const unsignedXdr = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(Operation.bumpSequence({ bumpTo: "1" }))
        .setTimeout(30)
        .build()
        .toXDR()

      const res = await signTransaction(
        makeRequest({
          credentialId: "cred-1",
          xdr: unsignedXdr,
          networkPassphrase: Networks.TESTNET,
        })
      )
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(typeof data.signedXdr).toBe("string")
      expect(data.signedXdr.length).toBeGreaterThan(0)
      expect(data.secretKey).toBeUndefined()
    }, 30000)
  })
})
