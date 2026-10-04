/**
 * CSV/JSON export utilities for circle contributions and payouts.
 *
 * Pure functions — no React dependencies, fully testable without DOM.
 */

import type { Contribution, Payout, CircleMember } from "@/types"

export type ExportScope = "all" | "members" | "contributions" | "payouts"
export type ExportFormat = "csv" | "json"

export interface ExportColumn {
  key: string
  label: string
}

export const CONTRIBUTION_COLUMNS: ExportColumn[] = [
  { key: "id", label: "ID" },
  { key: "roundNumber", label: "Round" },
  { key: "userId", label: "User ID" },
  { key: "amount", label: "Amount" },
  { key: "status", label: "Status" },
  { key: "onTime", label: "On Time" },
  { key: "txnHash", label: "Txn Hash" },
  { key: "createdAt", label: "Created At" },
]

export const PAYOUT_COLUMNS: ExportColumn[] = [
  { key: "id", label: "ID" },
  { key: "roundNumber", label: "Round" },
  { key: "recipientId", label: "Recipient ID" },
  { key: "amount", label: "Amount" },
  { key: "feeAmount", label: "Fee Amount" },
  { key: "payoutType", label: "Payout Type" },
  { key: "txnHash", label: "Txn Hash" },
  { key: "createdAt", label: "Created At" },
]

export const MEMBER_COLUMNS: ExportColumn[] = [
  { key: "userId", label: "User ID" },
  { key: "userName", label: "Name" },
  { key: "position", label: "Position" },
  { key: "status", label: "Status" },
  { key: "joinedAt", label: "Joined At" },
]

/** Escape a value for CSV: wrap in quotes, escape inner quotes. */
function escapeCSV(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value)
  // Always quote — simplest safe approach
  return `"${str.replace(/"/g, '""')}"`
}

/**
 * Export columns are chosen at runtime by key, so rows are read dynamically.
 * Every row is a plain domain object — the narrowing lives here, once.
 */
function pickField(row: object, key: string): unknown {
  return (row as Record<string, unknown>)[key]
}

export interface BuildCSVOptions {
  scope: ExportScope
  contributionColumns: string[]
  payoutColumns: string[]
  memberColumns: string[]
  dateFrom?: string
  dateTo?: string
}

function inDateRange(date: string, from?: string, to?: string): boolean {
  if (!from && !to) return true
  const d = new Date(date).getTime()
  if (from && d < new Date(from).getTime()) return false
  if (to && d > new Date(to + "T23:59:59Z").getTime()) return false
  return true
}

export function buildContributionsCSV(
  contributions: Contribution[],
  selectedColumns: string[],
  dateFrom?: string,
  dateTo?: string,
): string {
  const cols = CONTRIBUTION_COLUMNS.filter((c) => selectedColumns.includes(c.key))
  if (cols.length === 0) return ""

  const header = cols.map((c) => escapeCSV(c.label)).join(",")
  const rows = contributions
    .filter((c) => inDateRange(c.createdAt, dateFrom, dateTo))
    .map((c) => {
      const row = cols.map((col) => escapeCSV(pickField(c, col.key)))
      return row.join(",")
    })

  return [header, ...rows].join("\n")
}

export function buildPayoutsCSV(
  payouts: Payout[],
  selectedColumns: string[],
  dateFrom?: string,
  dateTo?: string,
): string {
  const cols = PAYOUT_COLUMNS.filter((c) => selectedColumns.includes(c.key))
  if (cols.length === 0) return ""

  const header = cols.map((c) => escapeCSV(c.label)).join(",")
  const rows = payouts
    .filter((p) => inDateRange(p.createdAt, dateFrom, dateTo))
    .map((p) => {
      const row = cols.map((col) => escapeCSV(pickField(p, col.key)))
      return row.join(",")
    })

  return [header, ...rows].join("\n")
}

export function buildMembersCSV(
  members: CircleMember[],
  selectedColumns: string[],
): string {
  const cols = MEMBER_COLUMNS.filter((c) => selectedColumns.includes(c.key))
  if (cols.length === 0) return ""

  const header = cols.map((c) => escapeCSV(c.label)).join(",")
  const rows = members.map((m) => {
    const row = cols.map((col) => escapeCSV(pickField(m, col.key)))
    return row.join(",")
  })

  return [header, ...rows].join("\n")
}

/** Combine sections into one CSV with blank-line separators. */
export function buildCombinedCSV(options: {
  scope: ExportScope
  contributions: Contribution[]
  payouts: Payout[]
  members: CircleMember[]
  contributionColumns: string[]
  payoutColumns: string[]
  memberColumns: string[]
  dateFrom?: string
  dateTo?: string
}): string {
  const sections: string[] = []

  if (options.scope === "all" || options.scope === "members") {
    const s = buildMembersCSV(options.members, options.memberColumns)
    if (s) sections.push(s)
  }

  if (options.scope === "all" || options.scope === "contributions") {
    const s = buildContributionsCSV(
      options.contributions,
      options.contributionColumns,
      options.dateFrom,
      options.dateTo,
    )
    if (s) sections.push(s)
  }

  if (options.scope === "all" || options.scope === "payouts") {
    const s = buildPayoutsCSV(
      options.payouts,
      options.payoutColumns,
      options.dateFrom,
      options.dateTo,
    )
    if (s) sections.push(s)
  }

  return sections.join("\n\n")
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
