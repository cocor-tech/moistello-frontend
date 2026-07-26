/**
 * Tests for src/app/api/auth/login/route.ts
 *
 * Covers:
 *  - Successful login with a 600K hash (new format) — no migration needed
 *  - Successful login with a 100K hash (legacy) — hash is migrated to 600K on the fly
 *  - Wrong password rejected (both hash formats checked, neither matches)
 *  - Missing fields rejected (400)
 *  - Unknown username rejected (401)
 */

import crypto from "crypto"
import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "./route"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeHash(password: string, salt: string, iterations: number): string {
  return crypto.pbkdf2Sync(password, salt, iterations, 64, "sha512").toString("hex")
}

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

// ---------------------------------------------------------------------------
// fs mock — intercepts reads/writes to the users and sessions files
// ---------------------------------------------------------------------------

const SALT = crypto.randomBytes(16).toString("hex")

const users600k = [
  {
    id: "user-600k",
    username: "alice",
    passwordHash: makeHash("correct-horse", SALT, 600_000),
    passwordSalt: SALT,
    role: "admin",
  },
]

const users100k = [
  {
    id: "user-100k",
    username: "bob",
    passwordHash: makeHash("battery-staple", SALT, 100_000),
    passwordSalt: SALT,
    role: "admin",
  },
]

// Track what gets written to users.json so we can assert the migration
let writtenUsers: unknown[] = []
let writtenSessions: unknown[] = []

function setupFsMock(usersFixture: typeof users600k) {
  writtenUsers = []
  writtenSessions = []

  vi.mock("fs", () => {
    const actual = vi.importActual<typeof import("fs")>("fs")
    return {
      ...actual,
      existsSync: vi.fn((p: string) => {
        if (p.includes("users.json")) return true
        if (p.includes("sessions.json")) return true
        return false
      }),
      readFileSync: vi.fn((p: string) => {
        if (p.includes("users.json")) return JSON.stringify(usersFixture)
        if (p.includes("sessions.json")) return "[]"
        return "[]"
      }),
      writeFileSync: vi.fn((_p: string, data: string) => {
        const parsed = JSON.parse(data) as unknown[]
        if (_p.includes("users.json")) writtenUsers = parsed
        if (_p.includes("sessions.json")) writtenSessions = parsed
      }),
    }
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("returns 400 when username or password is missing", async () => {
    setupFsMock(users600k)
    const res = await POST(makeRequest({ username: "alice" }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/required/i)
  })

  it("returns 401 for an unknown username", async () => {
    setupFsMock(users600k)
    const res = await POST(makeRequest({ username: "nobody", password: "whatever" }))
    expect(res.status).toBe(401)
  })

  it("returns 401 for a wrong password", async () => {
    setupFsMock(users600k)
    const res = await POST(makeRequest({ username: "alice", password: "wrong-password" }))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe("Invalid credentials")
  })

  it("accepts a correct password against a 600K hash without migration", async () => {
    setupFsMock([...users600k])
    const res = await POST(makeRequest({ username: "alice", password: "correct-horse" }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.user.username).toBe("alice")

    // users.json must NOT be rewritten — no migration needed
    expect(writtenUsers).toHaveLength(0)
  })

  it("accepts a correct password against a legacy 100K hash and migrates to 600K", async () => {
    const fixture = [{ ...users100k[0] }]
    setupFsMock(fixture)

    const res = await POST(makeRequest({ username: "bob", password: "battery-staple" }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)

    // users.json must have been rewritten with the upgraded hash
    expect(writtenUsers).toHaveLength(1)
    const upgraded = (writtenUsers as typeof users100k)[0]
    expect(upgraded.passwordSalt).toBe(SALT)

    // The stored hash must now match 600K, not the old 100K hash
    const expected600k = makeHash("battery-staple", SALT, 600_000)
    const old100k = makeHash("battery-staple", SALT, 100_000)
    expect(upgraded.passwordHash).toBe(expected600k)
    expect(upgraded.passwordHash).not.toBe(old100k)
  })

  it("sets the session cookie on a successful login", async () => {
    setupFsMock([...users600k])
    const res = await POST(makeRequest({ username: "alice", password: "correct-horse" }))
    expect(res.status).toBe(200)
    const setCookie = res.headers.get("set-cookie") ?? ""
    expect(setCookie).toMatch(/moistello_session=/)
  })
})
