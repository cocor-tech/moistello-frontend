import { describe, expect, it } from "vitest"
import {
  EXPORT_SCHEMA_VERSION,
  buildPersonalDataArchive,
  filterByUser,
  redact,
  toArchiveFilename,
  type ExportNotification,
  type ExportProfile,
} from "../personal-data"
import type { Contribution } from "@/types"

const GENERATED_AT = new Date("2026-06-17T12:00:00.000Z")

const alice: ExportProfile = { id: "user-alice", username: "alice", email: "alice@example.com" }
const bob: ExportProfile = { id: "user-bob", username: "bob" }

function contribution(id: string, userId: string, amount = 100): Contribution {
  return {
    id,
    circleId: "circle-1",
    userId,
    roundNumber: 1,
    amount,
    status: "confirmed",
    onTime: true,
    createdAt: "2026-06-01T10:00:00.000Z",
  }
}

function notification(id: string, userId: string): ExportNotification {
  return { id, userId, title: "Round started", read: false, createdAt: "2026-06-01T10:00:00.000Z" }
}

describe("filterByUser", () => {
  it("keeps only records belonging to the user", () => {
    const records = [contribution("c1", "alice"), contribution("c2", "bob")]
    expect(filterByUser(records, "alice").map((r) => r.id)).toEqual(["c1"])
  })

  it("drops records with no userId rather than assuming they are safe", () => {
    // "I cannot prove this is yours" must not resolve to "include it".
    const orphan = { id: "c9" } as Contribution
    expect(filterByUser([orphan], "alice")).toEqual([])
  })

  it("returns an empty list for a non-array input", () => {
    expect(filterByUser(undefined as unknown as Contribution[], "alice")).toEqual([])
  })

  it("is not confused by a userId that is a prefix of another", () => {
    const records = [contribution("c1", "alice"), contribution("c2", "alice2")]
    expect(filterByUser(records, "alice")).toHaveLength(1)
  })
})

describe("buildPersonalDataArchive", () => {
  it("includes profile, contributions and notifications", () => {
    const archive = buildPersonalDataArchive({
      user: alice,
      contributions: [contribution("c1", "user-alice")],
      notifications: [notification("n1", "user-alice")],
      generatedAt: GENERATED_AT,
    })

    expect(archive.schemaVersion).toBe(EXPORT_SCHEMA_VERSION)
    expect(archive.profile.username).toBe("alice")
    expect(archive.contributions).toHaveLength(1)
    expect(archive.notifications).toHaveLength(1)
  })

  it("reflects the requesting user only", () => {
    // The acceptance criterion: even if the backend returns another user's rows,
    // they must not reach the file.
    const archive = buildPersonalDataArchive({
      user: alice,
      contributions: [
        contribution("c1", "user-alice"),
        contribution("c2", "user-bob"),
        contribution("c3", "user-carol"),
      ],
      notifications: [notification("n1", "user-alice"), notification("n2", "user-bob")],
      generatedAt: GENERATED_AT,
    })

    expect(archive.contributions.map((c) => c.id)).toEqual(["c1"])
    expect(archive.notifications.map((n) => n.id)).toEqual(["n1"])
    expect(JSON.stringify(archive)).not.toContain("user-bob")
    expect(JSON.stringify(archive)).not.toContain("user-carol")
  })

  it("reports counts that match the filtered contents", () => {
    const archive = buildPersonalDataArchive({
      user: alice,
      contributions: [contribution("c1", "user-alice"), contribution("c2", "user-bob")],
      notifications: [],
      generatedAt: GENERATED_AT,
    })

    expect(archive.counts).toEqual({ contributions: 1, notifications: 0 })
  })

  it("stamps the subject and generation time", () => {
    const archive = buildPersonalDataArchive({
      user: alice,
      contributions: [],
      notifications: [],
      generatedAt: GENERATED_AT,
    })

    expect(archive.subject).toEqual({ userId: "user-alice" })
    expect(archive.generatedAt).toBe("2026-06-17T12:00:00.000Z")
  })

  it("produces a valid, parseable JSON document", () => {
    const archive = buildPersonalDataArchive({
      user: alice,
      contributions: [contribution("c1", "user-alice")],
      notifications: [notification("n1", "user-alice")],
      generatedAt: GENERATED_AT,
    })

    expect(() => JSON.parse(JSON.stringify(archive))).not.toThrow()
  })

  it("handles a user with no records at all", () => {
    const archive = buildPersonalDataArchive({
      user: bob,
      contributions: [],
      notifications: [],
      generatedAt: GENERATED_AT,
    })

    expect(archive.counts).toEqual({ contributions: 0, notifications: 0 })
    expect(archive.subject.userId).toBe("user-bob")
  })
})

describe("toArchiveFilename", () => {
  it("includes the user id and date", () => {
    expect(toArchiveFilename("user-alice", GENERATED_AT)).toBe(
      "moistello-data-user-alice-2026-06-17.json",
    )
  })

  it("strips characters that would be unsafe in a header", () => {
    // CRLF in a filename would let a caller inject response headers.
    const name = toArchiveFilename("evil\r\nX-Injected: 1", GENERATED_AT)
    expect(name).not.toContain("\r")
    expect(name).not.toContain("\n")
    expect(name).toBe("moistello-data-evilX-Injected1-2026-06-17.json")
  })

  it("falls back to a placeholder when nothing usable remains", () => {
    expect(toArchiveFilename("///", GENERATED_AT)).toBe("moistello-data-user-2026-06-17.json")
  })

  it("caps an overlong id", () => {
    // The invariant is on the id segment, not the whole filename.
    const name = toArchiveFilename("x".repeat(200), GENERATED_AT)
    const idSegment = name.replace("moistello-data-", "").replace("-2026-06-17.json", "")

    expect(idSegment).toHaveLength(40)
    expect(name).toBe(`moistello-data-${"x".repeat(40)}-2026-06-17.json`)
  })
})

describe("redact", () => {
  it("replaces session and key material", () => {
    const redacted = redact({
      id: "user-1",
      password: "hunter2",
      accessToken: "abc",
      refreshToken: "def",
      privateKey: "0xdead",
      mnemonic: "twelve words",
    })

    expect(redacted.password).toBe("[redacted]")
    expect(redacted.accessToken).toBe("[redacted]")
    expect(redacted.refreshToken).toBe("[redacted]")
    expect(redacted.privateKey).toBe("[redacted]")
    expect(redacted.mnemonic).toBe("[redacted]")
    expect(redacted.id).toBe("user-1")
  })

  it("recurses into nested objects and arrays", () => {
    const redacted = redact({ profile: { token: "leak" }, sessions: [{ secret: "leak" }] })
    expect(redacted.profile.token).toBe("[redacted]")
    expect(redacted.sessions[0].secret).toBe("[redacted]")
  })

  it("leaves primitives alone", () => {
    expect(redact(5)).toBe(5)
    expect(redact(null)).toBeNull()
  })
})
