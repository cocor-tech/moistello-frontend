import { describe, it, expect } from "vitest"
import { filterTransactions, type TxItem } from "../page"

const mockTransactions: TxItem[] = [
  {
    id: "tx-1",
    type: "sent",
    amount: 100,
    description: "Monthly Contribution to Circle Alpha",
    createdAt: "2026-07-20T12:00:00.000Z",
    txnHash: "hash_abc123",
    source: "contribution",
  },
  {
    id: "tx-2",
    type: "received",
    amount: 500,
    description: "Payout from Circle Beta",
    createdAt: "2026-06-01T12:00:00.000Z",
    txnHash: "hash_xyz789",
    source: "payout",
  },
  {
    id: "tx-3",
    type: "sent",
    amount: 50,
    description: "Weekly Contribution to Circle Gamma",
    createdAt: "2026-07-24T12:00:00.000Z",
    txnHash: "hash_def456",
    source: "contribution",
  },
]

describe("filterTransactions", () => {
  const now = new Date("2026-07-25T12:00:00.000Z")

  it("returns all transactions when filters are default", () => {
    const filtered = filterTransactions(mockTransactions, {
      type: "all",
      source: "all",
      dateRange: "all",
      minAmount: "",
      maxAmount: "",
      search: "",
    }, now)
    expect(filtered.length).toBe(3)
  })

  it("filters by transaction type (sent vs received)", () => {
    const sentOnly = filterTransactions(mockTransactions, {
      type: "sent",
      source: "all",
      dateRange: "all",
      minAmount: "",
      maxAmount: "",
      search: "",
    }, now)
    expect(sentOnly.length).toBe(2)
    expect(sentOnly.every((t) => t.type === "sent")).toBe(true)

    const receivedOnly = filterTransactions(mockTransactions, {
      type: "received",
      source: "all",
      dateRange: "all",
      minAmount: "",
      maxAmount: "",
      search: "",
    }, now)
    expect(receivedOnly.length).toBe(1)
    expect(receivedOnly[0].id).toBe("tx-2")
  })

  it("filters by source (contribution vs payout)", () => {
    const payouts = filterTransactions(mockTransactions, {
      type: "all",
      source: "payout",
      dateRange: "all",
      minAmount: "",
      maxAmount: "",
      search: "",
    }, now)
    expect(payouts.length).toBe(1)
    expect(payouts[0].source).toBe("payout")
  })

  it("filters by amount range", () => {
    const results = filterTransactions(mockTransactions, {
      type: "all",
      source: "all",
      dateRange: "all",
      minAmount: "75",
      maxAmount: "200",
      search: "",
    }, now)
    expect(results.length).toBe(1)
    expect(results[0].id).toBe("tx-1")
  })

  it("filters by search query (description or hash)", () => {
    const searchResults = filterTransactions(mockTransactions, {
      type: "all",
      source: "all",
      dateRange: "all",
      minAmount: "",
      maxAmount: "",
      search: "xyz789",
    }, now)
    expect(searchResults.length).toBe(1)
    expect(searchResults[0].id).toBe("tx-2")
  })

  it("filters by date range (e.g. past 7 days)", () => {
    // tx-3 is July 24 (1 day ago), tx-1 is July 20 (5 days ago), tx-2 is June 1
    const recent = filterTransactions(mockTransactions, {
      type: "all",
      source: "all",
      dateRange: "7d",
      minAmount: "",
      maxAmount: "",
      search: "",
    }, now)
    expect(recent.length).toBe(2)
    expect(recent.map((t) => t.id)).toEqual(["tx-3", "tx-1"])
  })
})
