import { describe, it, expect, beforeEach } from "vitest"
import { IdempotentEventStore } from "../idempotent-event-store"

describe("IdempotentEventStore", () => {
  let store: IdempotentEventStore

  beforeEach(() => {
    store = new IdempotentEventStore()
  })

  it("generates deterministic idempotency keys", () => {
    const key = store.generateIdempotencyKey("0xabc123", 0)
    expect(key).toBe("0xabc123:0")
  })

  it("processes a new event successfully", async () => {
    const event = {
      idempotencyKey: "0xhash:0",
      txHash: "0xhash",
      contractAddress: "CC123",
      eventType: "CircleCreated",
      payload: { name: "Test Circle" },
    }

    const res = await store.processEvent(event)
    expect(res.success).toBe(true)
    expect(res.duplicate).toBe(false)
    expect(store.getEventCount()).toBe(1)
    expect(store.isTxHashProcessed("0xhash")).toBe(true)
  })

  it("rejects duplicate events gracefully without error (idempotent write)", async () => {
    const event = {
      idempotencyKey: "0xhash:0",
      txHash: "0xhash",
      contractAddress: "CC123",
      eventType: "CircleCreated",
      payload: { name: "Test Circle" },
    }

    const res1 = await store.processEvent(event)
    expect(res1.duplicate).toBe(false)

    // Replay same event
    const res2 = await store.processEvent(event)
    expect(res2.success).toBe(true)
    expect(res2.duplicate).toBe(true)
    expect(store.getEventCount()).toBe(1)
  })

  it("handles batch replay scenarios correctly", async () => {
    const events = [
      {
        idempotencyKey: "tx1:0",
        txHash: "tx1",
        contractAddress: "CC1",
        eventType: "Deposit",
        payload: { amount: 100 },
      },
      {
        idempotencyKey: "tx2:0",
        txHash: "tx2",
        contractAddress: "CC1",
        eventType: "Deposit",
        payload: { amount: 200 },
      },
    ]

    const batch1 = await store.processBatch(events)
    expect(batch1.processed).toBe(2)
    expect(batch1.skippedDuplicates).toBe(0)

    // Replay batch with 1 new event
    const eventsReplay = [
      ...events,
      {
        idempotencyKey: "tx3:0",
        txHash: "tx3",
        contractAddress: "CC1",
        eventType: "Deposit",
        payload: { amount: 300 },
      },
    ]

    const batch2 = await store.processBatch(eventsReplay)
    expect(batch2.processed).toBe(1)
    expect(batch2.skippedDuplicates).toBe(2)
    expect(store.getEventCount()).toBe(3)
  })

  it("generates correct SQL with ON CONFLICT DO NOTHING clause", () => {
    const event = {
      idempotencyKey: "tx1:0",
      txHash: "tx1",
      contractAddress: "CC1",
      eventType: "Deposit",
      payload: { amount: 100 },
      processedAt: 123456789,
    }

    const query = store.buildUpsertQuery(event)
    expect(query.sql).toContain("ON CONFLICT (idempotency_key) DO NOTHING")
    expect(query.params).toHaveLength(6)
  })
})
