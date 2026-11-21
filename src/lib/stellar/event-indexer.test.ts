import { beforeEach, describe, expect, it, vi } from "vitest"

const redis = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
}))

vi.mock("../redis/client", () => ({
  getRedisClient: () => redis,
}))

import { EventIndexer } from "./event-indexer"

const CURSOR_KEY = "moistello:indexer:cursor"

describe("EventIndexer", () => {
  let indexer: EventIndexer

  beforeEach(() => {
    vi.clearAllMocks()
    indexer = new EventIndexer()
  })

  describe("currentCursor", () => {
    it("returns the stored cursor", async () => {
      redis.get.mockResolvedValue("ledger:12345")

      await expect(indexer.currentCursor()).resolves.toBe("ledger:12345")
      expect(redis.get).toHaveBeenCalledWith(CURSOR_KEY)
    })

    it("returns an empty string when no cursor has been saved", async () => {
      redis.get.mockResolvedValue(null)

      await expect(indexer.currentCursor()).resolves.toBe("")
    })
  })

  describe("saveCursor", () => {
    it("writes the cursor under the indexer key", async () => {
      redis.set.mockResolvedValue("OK")

      await indexer.saveCursor("ledger:67890")

      expect(redis.set).toHaveBeenCalledWith(CURSOR_KEY, "ledger:67890")
    })
  })

  describe("pollOnce", () => {
    it("returns no events in this stub implementation", async () => {
      await expect(indexer.pollOnce()).resolves.toEqual([])
    })

    it("does not touch the cursor", async () => {
      await indexer.pollOnce()

      expect(redis.get).not.toHaveBeenCalled()
      expect(redis.set).not.toHaveBeenCalled()
    })
  })
})
