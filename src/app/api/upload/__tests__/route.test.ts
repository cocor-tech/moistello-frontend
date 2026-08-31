// @vitest-environment node
import { NextRequest } from "next/server"
import { describe, expect, it, vi, afterEach, beforeEach } from "vitest"
import fs from "fs"
import { POST } from "../route"

function makeUploadRequest(opts?: { cookie?: string; overwrite?: boolean }) {
  const form = new FormData()
  form.append("file", new File(["# Test content"], "test.md", { type: "text/markdown" }))
  const url = new URL("http://localhost/api/upload")
  if (opts?.overwrite) url.searchParams.set("overwrite", "true")
  return new NextRequest(url.toString(), {
    method: "POST",
    body: form,
    headers: opts?.cookie ? { cookie: opts.cookie } : {},
  })
}

// ── Production guard — primary concern for this test file ────────────────────

describe("POST /api/upload – production guard (runtime blockInProduction)", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it("returns 404 in production", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const res = await POST(makeUploadRequest())
    expect(res.status).toBe(404)
  })

  it("returns JSON { error: 'Not found' } in production", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const res = await POST(makeUploadRequest())
    const body = await res.json()
    expect(body).toEqual({ error: "Not found" })
  })

  it("does not write any files in production", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const spy = vi.spyOn(fs, "writeFileSync").mockImplementation(() => {})
    await POST(makeUploadRequest())
    expect(spy).not.toHaveBeenCalled()
  })

  it("does not read the sessions file in production", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const spy = vi.spyOn(fs, "readFileSync").mockImplementation(() => "[]" as never)
    await POST(makeUploadRequest())
    expect(spy).not.toHaveBeenCalled()
  })
})

// ── Dev mode — auth guard ────────────────────────────────────────────────────

describe("POST /api/upload – auth guard (dev mode)", () => {
  const existsSyncSpy = vi.spyOn(fs, "existsSync")
  const readFileSyncSpy = vi.spyOn(fs, "readFileSync")
  const writeFileSyncSpy = vi.spyOn(fs, "writeFileSync")
  const mkdirSyncSpy = vi.spyOn(fs, "mkdirSync")

  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development")

    existsSyncSpy.mockImplementation(((...args: unknown[]) => {
      const p = args[0] as string
      if (p.includes("sessions.json")) return true
      if (p.includes("pages")) return true
      return false
    }) as typeof fs.existsSync)

    readFileSyncSpy.mockImplementation(((...args: unknown[]) => {
      const p = args[0] as string
      if (p.includes("sessions.json")) return "[]"
      return ""
    }) as typeof fs.readFileSync)

    writeFileSyncSpy.mockImplementation(() => {})
    mkdirSyncSpy.mockImplementation(() => undefined as never)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it("returns 401 when no session cookie is provided", async () => {
    const res = await POST(makeUploadRequest())
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toMatch(/unauthorized/i)
  })

  it("returns 401 when session token is not in sessions.json", async () => {
    readFileSyncSpy.mockImplementation(((...args: unknown[]) => {
      const p = args[0] as string
      if (p.includes("sessions.json")) {
        return JSON.stringify([
          { token: "other-token", userId: "u1", createdAt: Date.now() },
        ])
      }
      return ""
    }) as typeof fs.readFileSync)
    const res = await POST(makeUploadRequest({ cookie: "moistello_session=bad-token" }))
    expect(res.status).toBe(401)
  })
})

