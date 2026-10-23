import { describe, it, expect, vi, beforeEach } from "vitest"
import { RealtimeHub, type HubConnection, type CircleAuthorizer } from "../hub"
import type { RealtimeEvent, ServerMessage } from "../protocol"

interface MockConnection extends HubConnection {
  sent: ServerMessage[]
  closedWith: { code: number; reason: string } | null
  aliveState: boolean
}

function createMockConnection(id: string, initialAlive = true): MockConnection {
  const sent: ServerMessage[] = []
  let closedWith: { code: number; reason: string } | null = null
  let aliveState = initialAlive

  return {
    id,
    send: vi.fn((msg: ServerMessage) => {
      sent.push(msg)
    }),
    close: vi.fn((code: number, reason: string) => {
      closedWith = { code, reason }
    }),
    isAlive: vi.fn(() => aliveState),
    markAlive: vi.fn(() => {
      aliveState = true
    }),
    get sent() {
      return sent
    },
    get closedWith() {
      return closedWith
    },
    get aliveState() {
      return aliveState
    },
    set aliveState(v: boolean) {
      aliveState = v
    },
  }
}

describe("RealtimeHub", () => {
  let authorizer: CircleAuthorizer
  let hub: RealtimeHub

  beforeEach(() => {
    authorizer = {
      canSubscribe: vi.fn().mockResolvedValue(true),
    }
    hub = new RealtimeHub(authorizer, 3)
  })

  describe("connection lifecycle", () => {
    it("tracks connection size as connections are added and removed", () => {
      expect(hub.size()).toBe(0)

      const conn1 = createMockConnection("c1")
      const conn2 = createMockConnection("c2")

      hub.addConnection(conn1)
      expect(hub.size()).toBe(1)

      hub.addConnection(conn2)
      expect(hub.size()).toBe(2)

      hub.removeConnection("c1")
      expect(hub.size()).toBe(1)

      hub.removeConnection("nonexistent")
      expect(hub.size()).toBe(1)
    })

    it("marks connection alive and updates lastSeenAt", () => {
      const conn = createMockConnection("c1")
      hub.addConnection(conn)

      hub.markAlive("c1")
      expect(conn.markAlive).toHaveBeenCalled()

      // Calling markAlive on a non-existent connection does not throw
      expect(() => hub.markAlive("unknown")).not.toThrow()
    })
  })

  describe("subscribe", () => {
    it("throws if connection does not exist", async () => {
      await expect(
        hub.subscribe("c_unknown", "circle-1", "req-1"),
      ).rejects.toThrow("Connection not found")
    })

    it("subscribes successfully when authorized", async () => {
      const conn = createMockConnection("c1")
      hub.addConnection(conn)

      await hub.subscribe("c1", "circle-1", "req-1")

      expect(authorizer.canSubscribe).toHaveBeenCalledWith("c1", "circle-1")
      expect(conn.send).toHaveBeenCalledWith({
        type: "subscribed",
        requestId: "req-1",
        circleId: "circle-1",
      })
    })

    it("sends FORBIDDEN error when authorizer denies subscription", async () => {
      const conn = createMockConnection("c1")
      hub.addConnection(conn)
      vi.mocked(authorizer.canSubscribe).mockResolvedValue(false)

      await hub.subscribe("c1", "circle-1", "req-2")

      expect(conn.send).toHaveBeenCalledWith({
        type: "error",
        requestId: "req-2",
        code: "FORBIDDEN",
        message: "Subscription is not authorized",
      })
    })

    it("sends RATE_LIMITED error when maxSubscriptionsPerConnection is reached", async () => {
      const conn = createMockConnection("c1")
      hub.addConnection(conn)

      await hub.subscribe("c1", "circle-1", "req-1")
      await hub.subscribe("c1", "circle-2", "req-2")
      await hub.subscribe("c1", "circle-3", "req-3")

      // Limit is 3
      await hub.subscribe("c1", "circle-4", "req-4")

      expect(conn.send).toHaveBeenLastCalledWith({
        type: "error",
        requestId: "req-4",
        code: "RATE_LIMITED",
        message: "Subscription limit reached",
      })
    })
  })

  describe("unsubscribe", () => {
    it("throws if connection does not exist", () => {
      expect(() => hub.unsubscribe("unknown", "circle-1", "req-1")).toThrow(
        "Connection not found",
      )
    })

    it("removes subscription and sends unsubscribed message", async () => {
      const conn = createMockConnection("c1")
      hub.addConnection(conn)
      await hub.subscribe("c1", "circle-1", "req-1")

      hub.unsubscribe("c1", "circle-1", "req-unsub")

      expect(conn.send).toHaveBeenLastCalledWith({
        type: "unsubscribed",
        requestId: "req-unsub",
        circleId: "circle-1",
      })
    })
  })

  describe("broadcast", () => {
    const event: RealtimeEvent = {
      eventId: "evt-1",
      sequence: 1,
      circleId: "circle-100",
      eventType: "contribution_made",
      occurredAt: "2026-01-01T00:00:00Z",
      payload: { amount: 100 },
    }

    it("delivers events only to subscribed and alive connections", async () => {
      const conn1 = createMockConnection("c1")
      const conn2 = createMockConnection("c2")
      const conn3 = createMockConnection("c3")

      hub.addConnection(conn1)
      hub.addConnection(conn2)
      hub.addConnection(conn3)

      // c1 subscribed to circle-100
      await hub.subscribe("c1", "circle-100", "r1")
      // c2 subscribed to circle-200
      await hub.subscribe("c2", "circle-200", "r2")
      // c3 subscribed to circle-100 but dead
      await hub.subscribe("c3", "circle-100", "r3")
      conn3.aliveState = false

      const delivered = hub.broadcast(event)

      expect(delivered).toBe(1)
      expect(conn1.send).toHaveBeenLastCalledWith({
        type: "event",
        eventId: "evt-1",
        sequence: 1,
        circleId: "circle-100",
        eventType: "contribution_made",
        occurredAt: "2026-01-01T00:00:00Z",
        payload: { amount: 100 },
      })
      expect(conn2.send).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: "event" }),
      )
      expect(conn3.send).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: "event" }),
      )
    })
  })

  describe("heartbeat", () => {
    it("closes and removes timed-out connections", () => {
      const conn = createMockConnection("c1", true)
      hub.addConnection(conn)

      const now = Date.now()
      const stale = hub.heartbeat(now + 35_000, 30_000)

      expect(stale).toEqual(["c1"])
      expect(conn.close).toHaveBeenCalledWith(1001, "Heartbeat timeout")
      expect(hub.size()).toBe(0)
    })

    it("closes and removes dead connections even if not timed out", () => {
      const conn = createMockConnection("c2", false) // dead
      hub.addConnection(conn)

      const now = Date.now()
      const stale = hub.heartbeat(now, 30_000)

      expect(stale).toEqual(["c2"])
      expect(conn.close).toHaveBeenCalledWith(1001, "Heartbeat timeout")
      expect(hub.size()).toBe(0)
    })

    it("keeps recent and alive connections", () => {
      const conn = createMockConnection("c3", true)
      hub.addConnection(conn)

      const now = Date.now()
      const stale = hub.heartbeat(now + 5_000, 30_000)

      expect(stale).toEqual([])
      expect(conn.close).not.toHaveBeenCalled()
      expect(hub.size()).toBe(1)
    })
  })
})
