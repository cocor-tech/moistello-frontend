// @vitest-environment node
/**
 * setup/route.test.ts
 *
 * Tests for the dev-only POST /api/auth/setup route.
 *
 * Covers:
 *  1. Production guard — returns 404 in production (blockInProduction)
 *  2. Input validation — missing fields, invalid username, short password
 *  3. Token validation — invalid/expired token rejected
 *  4. Happy path — valid token creates user + sets session cookie
 *  5. Duplicate username rejected
 */
import crypto from "crypto"
import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import fs from "fs"

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/auth/setup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

const VALID_TOKEN_STR = "valid-setup-token-abc123"
const EXPIRED_TOKEN_STR = "expired-token-xyz"

// ── Shared spy references ─────────────────────────────────────────────────────
// Created fresh before each test to avoid stale spy state
let writeSpy: ReturnType<typeof vi.spyOn>

let capturedTokens: unknown[] = []
let capturedUsers: unknown[] = []
let capturedSessions: unknown[] = []

function setupMocks(opts: {
  tokens?: unknown[]
  users?: unknown[]
  sessions?: unknown[]
} = {}) {
  capturedTokens = opts.tokens ?? []
  capturedUsers = opts.users ?? []
  capturedSessions = opts.sessions ?? []

  vi.spyOn(fs, "existsSync").mockReturnValue(true)
  vi.spyOn(fs, "readFileSync").mockImplementation((p: unknown) => {
    const path = p as string
    if (path.endsWith("setup-tokens.json")) return JSON.stringify(capturedTokens)
    if (path.endsWith("users.json")) return JSON.stringify(capturedUsers)
    if (path.endsWith("sessions.json")) return JSON.stringify(capturedSessions)
    return "[]"
  })
  writeSpy = vi.spyOn(fs, "writeFileSync").mockImplementation((p: unknown, data: unknown) => {
    const path = p as string
    const parsed = JSON.parse(data as string)
    if (path.endsWith("setup-tokens.json")) capturedTokens = parsed
    if (path.endsWith("users.json")) capturedUsers = parsed
    if (path.endsWith("sessions.json")) capturedSessions = parsed
  })
  vi.spyOn(fs, "mkdirSync").mockImplementation(() => undefined as never)
}

function makeValidToken(overrides: Record<string, unknown> = {}) {
  return {
    token: VALID_TOKEN_STR,
    used: false,
    expiresAt: Date.now() + 60_000,
    ...overrides,
  }
}

function makeExpiredToken() {
  return {
    token: EXPIRED_TOKEN_STR,
    used: false,
    expiresAt: Date.now() - 1000,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/auth/setup — production guard", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it("returns 404 in production", async () => {
    vi.stubEnv("NODE_ENV", "production")
    setupMocks({ tokens: [makeValidToken()] })
    // Dynamic import so NODE_ENV is already set before the module evaluates
    const { POST } = await import("@/app/api/auth/setup/route")
    const res = await POST(
      makeRequest({ token: VALID_TOKEN_STR, username: "admin", password: "password123" })
    )
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body).toEqual({ error: "Not found" })
  })

  it("does not write any files in production", async () => {
    vi.stubEnv("NODE_ENV", "production")
    setupMocks({ tokens: [makeValidToken()] })
    const { POST } = await import("@/app/api/auth/setup/route")
    await POST(
      makeRequest({ token: VALID_TOKEN_STR, username: "admin", password: "password123" })
    )
    expect(writeSpy).not.toHaveBeenCalled()
  })
})

describe("POST /api/auth/setup — input validation", () => {
  let POST: (req: NextRequest) => Promise<Response>

  beforeEach(async () => {
    vi.stubEnv("NODE_ENV", "development")
    setupMocks({ tokens: [makeValidToken()] })
    const mod = await import("@/app/api/auth/setup/route")
    POST = mod.POST
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it("returns 400 when all fields are missing", async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/missing/i)
  })

  it("returns 400 when token is missing", async () => {
    const res = await POST(makeRequest({ username: "admin", password: "password123" }))
    expect(res.status).toBe(400)
  })

  it("returns 400 when username is missing", async () => {
    const res = await POST(makeRequest({ token: VALID_TOKEN_STR, password: "password123" }))
    expect(res.status).toBe(400)
  })

  it("returns 400 when password is missing", async () => {
    const res = await POST(makeRequest({ token: VALID_TOKEN_STR, username: "admin" }))
    expect(res.status).toBe(400)
  })

  it("returns 400 when username is too short (< 3 chars)", async () => {
    const res = await POST(makeRequest({ token: VALID_TOKEN_STR, username: "ab", password: "password123" }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/username/i)
  })

  it("returns 400 when username is too long (> 30 chars)", async () => {
    const res = await POST(makeRequest({ token: VALID_TOKEN_STR, username: "a".repeat(31), password: "password123" }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/username/i)
  })

  it("returns 400 when username has invalid characters", async () => {
    const res = await POST(makeRequest({ token: VALID_TOKEN_STR, username: "user name", password: "password123" }))
    expect(res.status).toBe(400)
  })

  it("returns 400 when password is too short (< 8 chars)", async () => {
    const res = await POST(makeRequest({ token: VALID_TOKEN_STR, username: "admin", password: "short" }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/password/i)
  })
})

describe("POST /api/auth/setup — token validation", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it("returns 401 for an invalid token", async () => {
    vi.stubEnv("NODE_ENV", "development")
    setupMocks({ tokens: [makeValidToken()] })
    const { POST } = await import("@/app/api/auth/setup/route")
    const res = await POST(makeRequest({ token: "wrong-token", username: "admin", password: "password123" }))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toMatch(/invalid|expired/i)
  })

  it("returns 401 for an already-used token", async () => {
    vi.stubEnv("NODE_ENV", "development")
    setupMocks({ tokens: [makeValidToken({ used: true })] })
    const { POST } = await import("@/app/api/auth/setup/route")
    const res = await POST(makeRequest({ token: VALID_TOKEN_STR, username: "admin", password: "password123" }))
    expect(res.status).toBe(401)
  })

  it("returns 410 for an expired token", async () => {
    vi.stubEnv("NODE_ENV", "development")
    setupMocks({ tokens: [makeExpiredToken()] })
    const { POST } = await import("@/app/api/auth/setup/route")
    const res = await POST(makeRequest({ token: EXPIRED_TOKEN_STR, username: "admin", password: "password123" }))
    expect(res.status).toBe(410)
    const body = await res.json()
    expect(body.error).toMatch(/expired/i)
  })
})

describe("POST /api/auth/setup — happy path", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it("returns 200 with success:true and username", async () => {
    vi.stubEnv("NODE_ENV", "development")
    setupMocks({ tokens: [makeValidToken()] })
    const { POST } = await import("@/app/api/auth/setup/route")
    const res = await POST(makeRequest({ token: VALID_TOKEN_STR, username: "newadmin", password: "securepass1" }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.username).toBe("newadmin")
  })

  it("creates the user in users.json with admin role", async () => {
    vi.stubEnv("NODE_ENV", "development")
    setupMocks({ tokens: [makeValidToken()] })
    const { POST } = await import("@/app/api/auth/setup/route")
    await POST(makeRequest({ token: VALID_TOKEN_STR, username: "newadmin", password: "securepass1" }))
    expect(capturedUsers).toHaveLength(1)
    const user = capturedUsers[0] as { username: string; role: string; passwordHash: string; passwordSalt: string }
    expect(user.username).toBe("newadmin")
    expect(user.role).toBe("admin")
    // Password must be hashed, not stored in plain text
    expect(user.passwordHash).not.toBe("securepass1")
    expect(user.passwordSalt).toBeDefined()
  })

  it("marks the setup token as used after successful setup", async () => {
    vi.stubEnv("NODE_ENV", "development")
    setupMocks({ tokens: [makeValidToken()] })
    const { POST } = await import("@/app/api/auth/setup/route")
    await POST(makeRequest({ token: VALID_TOKEN_STR, username: "newadmin", password: "securepass1" }))
    const usedToken = (capturedTokens as Array<{ token: string; used: boolean; usedBy?: string }>)
      .find((t) => t.token === VALID_TOKEN_STR)
    expect(usedToken?.used).toBe(true)
    expect(usedToken?.usedBy).toBe("newadmin")
  })

  it("sets an HttpOnly session cookie on success", async () => {
    vi.stubEnv("NODE_ENV", "development")
    setupMocks({ tokens: [makeValidToken()] })
    const { POST } = await import("@/app/api/auth/setup/route")
    const res = await POST(makeRequest({ token: VALID_TOKEN_STR, username: "newadmin", password: "securepass1" }))
    expect(res.status).toBe(200)
    const setCookie = res.headers.get("set-cookie")
    expect(setCookie).toContain("moistello_session")
    expect(setCookie).toContain("HttpOnly")
  })

  it("creates a session entry in sessions.json", async () => {
    vi.stubEnv("NODE_ENV", "development")
    setupMocks({ tokens: [makeValidToken()] })
    const { POST } = await import("@/app/api/auth/setup/route")
    await POST(makeRequest({ token: VALID_TOKEN_STR, username: "newadmin", password: "securepass1" }))
    expect(capturedSessions).toHaveLength(1)
  })

  it("uses PBKDF2-SHA512 with 600K iterations to hash the password", async () => {
    vi.stubEnv("NODE_ENV", "development")
    setupMocks({ tokens: [makeValidToken()] })
    const { POST } = await import("@/app/api/auth/setup/route")
    await POST(makeRequest({ token: VALID_TOKEN_STR, username: "newadmin", password: "securepass1" }))
    const user = (capturedUsers[0] as { passwordHash: string; passwordSalt: string })
    const expectedHash = crypto
      .pbkdf2Sync("securepass1", user.passwordSalt, 600_000, 64, "sha512")
      .toString("hex")
    expect(user.passwordHash).toBe(expectedHash)
  })
})

describe("POST /api/auth/setup — duplicate username", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it("returns 409 when username is already taken", async () => {
    vi.stubEnv("NODE_ENV", "development")
    const existingUser = {
      id: "existing-id",
      username: "admin",
      passwordHash: "hash",
      passwordSalt: "salt",
      role: "admin",
      createdAt: new Date().toISOString(),
    }
    setupMocks({ tokens: [makeValidToken()], users: [existingUser] })
    const { POST } = await import("@/app/api/auth/setup/route")
    const res = await POST(makeRequest({ token: VALID_TOKEN_STR, username: "admin", password: "password123" }))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/taken/i)
  })
})
