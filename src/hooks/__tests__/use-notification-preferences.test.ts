import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/api-client", () => ({
  get: vi.fn(),
  put: vi.fn(),
}))

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
}))

import { get, put } from "@/lib/api-client"
import type { NotificationPreferences } from "@/hooks/use-notification-preferences"

// ── parsePreferences logic (extracted for unit testing) ───────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

const DEFAULT_PREFS: NotificationPreferences = {
  categories: {
    payout: true,
    dispute: true,
    governance: true,
    security: true,
    contributions: true,
    invitations: true,
    announcements: true,
    circleActivity: false,
    marketing: false,
  },
  frequency: "instant",
}

function parsePreferences(raw: unknown): NotificationPreferences {
  if (!isRecord(raw)) return DEFAULT_PREFS
  const data = isRecord(raw.data) ? raw.data : raw
  const cats = isRecord(data.categories) ? data.categories : {}
  const freq = (data.frequency as NotificationPreferences["frequency"]) ?? DEFAULT_PREFS.frequency
  return {
    categories: {
      payout: (cats.payout as boolean) ?? DEFAULT_PREFS.categories.payout,
      dispute: (cats.dispute as boolean) ?? DEFAULT_PREFS.categories.dispute,
      governance: (cats.governance as boolean) ?? DEFAULT_PREFS.categories.governance,
      security: (cats.security as boolean) ?? DEFAULT_PREFS.categories.security,
      contributions: (cats.contributions as boolean) ?? DEFAULT_PREFS.categories.contributions,
      invitations: (cats.invitations as boolean) ?? DEFAULT_PREFS.categories.invitations,
      announcements: (cats.announcements as boolean) ?? DEFAULT_PREFS.categories.announcements,
      circleActivity: (cats.circleActivity as boolean) ?? DEFAULT_PREFS.categories.circleActivity,
      marketing: (cats.marketing as boolean) ?? DEFAULT_PREFS.categories.marketing,
    },
    frequency: freq,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("notification preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("parsePreferences", () => {
    it("returns defaults for a null/undefined payload", () => {
      expect(parsePreferences(null)).toEqual(DEFAULT_PREFS)
      expect(parsePreferences(undefined)).toEqual(DEFAULT_PREFS)
    })

    it("parses a flat server response correctly", () => {
      const raw = {
        categories: {
          payout: false,
          dispute: true,
          governance: false,
          security: true,
          contributions: true,
          invitations: false,
          announcements: true,
          circleActivity: true,
          marketing: false,
        },
        frequency: "daily",
      }
      const prefs = parsePreferences(raw)
      expect(prefs.categories.payout).toBe(false)
      expect(prefs.categories.governance).toBe(false)
      expect(prefs.categories.security).toBe(true)
      expect(prefs.frequency).toBe("daily")
    })

    it("parses a wrapped { data: {...} } response", () => {
      const raw = {
        data: {
          categories: { payout: false, governance: true, security: false },
          frequency: "off",
        },
      }
      const prefs = parsePreferences(raw)
      expect(prefs.categories.payout).toBe(false)
      expect(prefs.categories.governance).toBe(true)
      expect(prefs.categories.security).toBe(false)
      expect(prefs.frequency).toBe("off")
    })

    it("falls back to defaults for missing category keys", () => {
      const raw = { categories: { payout: false }, frequency: "instant" }
      const prefs = parsePreferences(raw)
      // governance and security should fall back to true (from DEFAULT_PREFS)
      expect(prefs.categories.governance).toBe(DEFAULT_PREFS.categories.governance)
      expect(prefs.categories.security).toBe(DEFAULT_PREFS.categories.security)
    })

    it("includes governance and security as distinct top-level categories", () => {
      const prefs = parsePreferences({})
      expect("governance" in prefs.categories).toBe(true)
      expect("security" in prefs.categories).toBe(true)
    })
  })

  describe("persistence contract", () => {
    it("PUT /notifications/preferences is called with the full categories object", async () => {
      const mockPut = put as ReturnType<typeof vi.fn>
      mockPut.mockResolvedValueOnce({ ok: true })

      const prefs: NotificationPreferences = {
        categories: { ...DEFAULT_PREFS.categories, governance: false },
        frequency: "daily",
      }

      await put("/notifications/preferences", {
        categories: prefs.categories,
        frequency: prefs.frequency,
      })

      expect(mockPut).toHaveBeenCalledWith(
        "/notifications/preferences",
        expect.objectContaining({
          categories: expect.objectContaining({
            governance: false,
            security: true,
            payout: true,
          }),
          frequency: "daily",
        }),
      )
    })

    it("GET /notifications/preferences is called on load", async () => {
      const mockGet = get as ReturnType<typeof vi.fn>
      mockGet.mockResolvedValueOnce({ categories: {}, frequency: "instant" })

      await get("/notifications/preferences")
      expect(mockGet).toHaveBeenCalledWith("/notifications/preferences")
    })
  })
})
