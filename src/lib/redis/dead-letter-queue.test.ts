import { beforeEach, describe, expect, it, vi } from "vitest"

const redis = vi.hoisted(() => ({
  rpush: vi.fn(),
  lrange: vi.fn(),
  lrem: vi.fn(),
}))

vi.mock("../redis/client", () => ({
  getRedisClient: () => redis,
}))

import { DeadLetterQueue, type DeadLetterEvent } from "./dead-letter-queue"

const KEY = "moistello:dlq"

const event: DeadLetterEvent = {
  id: "evt-1",
  type: "payout.failed",
  attempts: 3,
  error: "timeout",
}

describe("DeadLetterQueue", () => {
  let dlq: DeadLetterQueue

  beforeEach(() => {
    vi.clearAllMocks()
    dlq = new DeadLetterQueue()
  })

  describe("push", () => {
    it("appends the event as JSON to the DLQ list", async () => {
      redis.rpush.mockResolvedValue(1)

      await dlq.push(event)

      expect(redis.rpush).toHaveBeenCalledTimes(1)
      expect(redis.rpush).toHaveBeenCalledWith(KEY, JSON.stringify(event))
    })

    it("propagates Redis errors to the caller", async () => {
      redis.rpush.mockRejectedValue(new Error("redis down"))

      await expect(dlq.push(event)).rejects.toThrow("redis down")
    })
  })

  describe("list", () => {
    it("returns an empty array when the queue is empty", async () => {
      redis.lrange.mockResolvedValue([])

      await expect(dlq.list()).resolves.toEqual([])
      expect(redis.lrange).toHaveBeenCalledWith(KEY, 0, -1)
    })

    it("parses every stored entry in order", async () => {
      const second = { ...event, id: "evt-2", attempts: 1 }
      redis.lrange.mockResolvedValue([
        JSON.stringify(event),
        JSON.stringify(second),
      ])

      await expect(dlq.list()).resolves.toEqual([event, second])
    })

    it("throws when a stored entry is not valid JSON", async () => {
      redis.lrange.mockResolvedValue(["not-json"])

      await expect(dlq.list()).rejects.toThrow(SyntaxError)
    })
  })

  describe("retry", () => {
    it("removes the entry matching the given id from the list", async () => {
      redis.lrem.mockResolvedValue(1)

      await dlq.retry("evt-1")

      expect(redis.lrem).toHaveBeenCalledWith(
        KEY,
        0,
        JSON.stringify({ id: "evt-1" }),
      )
    })
  })
})
