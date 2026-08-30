"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowUpCircle, ArrowDownCircle, Search, Filter, Calendar, DollarSign, ChevronLeft, ChevronRight } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { get } from "@/lib/api-client"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { PageError, PageLoading } from "@/components/shared/page-state"
import type { ApiResponse } from "@/types"
import { cn } from "@/lib/cn"
import { formatAddress } from "@/lib/formatters"

interface TxItem {
  id: string
  type: "sent" | "received"
  amount: number
  description: string
  createdAt: string
  txnHash?: string
  source: "contribution" | "payout"
  status?: "completed" | "pending" | "failed"
}

const PAGE_SIZE = 15

export default function TransactionsPage() {
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("all")
  const [minAmount, setMinAmount] = useState<string>("")
  const [maxAmount, setMaxAmount] = useState<string>("")
  const [currentPage, setCurrentPage] = useState<number>(1)

  const { data: txns = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const [cRes, pRes] = await Promise.allSettled([
        get<ApiResponse<{ contributions?: Record<string, unknown>[] }>>("/contributions"),
        get<ApiResponse<{ payouts?: Record<string, unknown>[] }>>("/payouts"),
      ])
      const all: TxItem[] = []
      if (cRes.status === "fulfilled") {
        (cRes.value.data?.contributions ?? []).forEach((c) => {
          all.push({
            id: String(c.id ?? ""),
            type: "sent",
            amount: Number(c.amount ?? 0),
            description: "Contribution",
            createdAt: String(c.createdAt ?? ""),
            txnHash: c.txnHash ? String(c.txnHash) : undefined,
            source: "contribution",
            status: (c.status as "completed" | "pending" | "failed") ?? "completed",
          })
        })
      }
      if (pRes.status === "fulfilled") {
        (pRes.value.data?.payouts ?? []).forEach((p) => {
          all.push({
            id: String(p.id ?? ""),
            type: "received",
            amount: Number(p.amount ?? 0),
            description: "Payout",
            createdAt: String(p.createdAt ?? ""),
            txnHash: p.txnHash ? String(p.txnHash) : undefined,
            source: "payout",
            status: (p.status as "completed" | "pending" | "failed") ?? "completed",
          })
        })
      }
      return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    },
  })

  const filteredTxns = useMemo(() => {
    return txns.filter((tx) => {
      // Search query
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchesId = tx.id.toLowerCase().includes(q)
        const matchesDesc = tx.description.toLowerCase().includes(q)
        const matchesHash = tx.txnHash?.toLowerCase().includes(q) ?? false
        if (!matchesId && !matchesDesc && !matchesHash) return false
      }

      // Type filter
      if (typeFilter !== "all" && tx.type !== typeFilter) return false

      // Status filter
      if (statusFilter !== "all" && (tx.status ?? "completed") !== statusFilter) return false

      // Amount filters
      if (minAmount !== "" && !isNaN(Number(minAmount)) && tx.amount < Number(minAmount)) return false
      if (maxAmount !== "" && !isNaN(Number(maxAmount)) && tx.amount > Number(maxAmount)) return false

      // Date filters
      if (dateFilter !== "all") {
        const txDate = new Date(tx.createdAt).getTime()
        const now = Date.now()
        const diffDays = (now - txDate) / (1000 * 60 * 60 * 24)
        if (dateFilter === "7d" && diffDays > 7) return false
        if (dateFilter === "30d" && diffDays > 30) return false
        if (dateFilter === "90d" && diffDays > 90) return false
      }

      return true
    })
  }, [txns, search, typeFilter, statusFilter, dateFilter, minAmount, maxAmount])

  const totalPages = Math.ceil(filteredTxns.length / PAGE_SIZE) || 1
  const paginatedTxns = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredTxns.slice(start, start + PAGE_SIZE)
  }, [filteredTxns, currentPage])

  const columns: DataTableColumn<TxItem>[] = [
    {
      key: "type",
      header: "Type",
      cell: (tx) => (
        <div className="flex items-center gap-2">
          {tx.type === "sent" ? (
            <ArrowUpCircle className="h-5 w-5 text-red-500" />
          ) : (
            <ArrowDownCircle className="h-5 w-5 text-green-500" />
          )}
          <span className="capitalize font-medium">{tx.type}</span>
        </div>
      ),
    },
    {
      key: "description",
      header: "Description",
      cell: (tx) => (
        <div>
          <p className="font-medium text-foreground">{tx.description}</p>
          {tx.txnHash && <p className="text-xs text-muted-foreground font-mono">{formatAddress(tx.txnHash, 6, 4)}</p>}
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      cell: (tx) => (
        <span className={cn("font-semibold", tx.type === "sent" ? "text-red-600" : "text-green-600")}>
          {tx.type === "sent" ? "-" : "+"}${tx.amount.toFixed(2)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (tx) => {
        const st = tx.status ?? "completed"
        return (
          <span
            className={cn(
              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
              st === "completed" && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
              st === "pending" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
              st === "failed" && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
            )}
          >
            {st}
          </span>
        )
      },
    },
    {
      key: "createdAt",
      header: "Date",
      cell: (tx) => (
        <span className="text-sm text-muted-foreground">
          {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : "-"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (tx) => (
        <Link
          href={`/wallet/transactions/${tx.id}`}
          className="text-xs font-medium text-primary hover:underline"
        >
          View Detail
        </Link>
      ),
    },
  ]

  if (isLoading) return <PageLoading />
  if (isError) return <PageError message="Failed to load transactions" onRetry={() => refetch()} />

  return (
    <div className="space-y-6" data-testid="wallet-transactions-page">
      <PageHeader
        title="Transactions"
        description="View and filter your complete wallet history."
      />

      {/* Filters & Search Toolbar */}
      <div className="bg-card border rounded-xl p-4 space-y-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by ID, hash, or description..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full pl-9 pr-4 py-2 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full px-3 py-2 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Types</option>
              <option value="sent">Sent</option>
              <option value="received">Received</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full px-3 py-2 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full px-3 py-2 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Time</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
        </div>

        {/* Amount Range Filter */}
        <div className="flex items-center gap-4 pt-2 border-t text-sm">
          <span className="text-muted-foreground font-medium">Amount Range:</span>
          <input
            type="number"
            placeholder="Min $"
            value={minAmount}
            onChange={(e) => {
              setMinAmount(e.target.value)
              setCurrentPage(1)
            }}
            className="w-28 px-3 py-1.5 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <span>to</span>
          <input
            type="number"
            placeholder="Max $"
            value={maxAmount}
            onChange={(e) => {
              setMaxAmount(e.target.value)
              setCurrentPage(1)
            }}
            className="w-28 px-3 py-1.5 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {(search || typeFilter !== "all" || statusFilter !== "all" || dateFilter !== "all" || minAmount || maxAmount) && (
            <button
              onClick={() => {
                setSearch("")
                setTypeFilter("all")
                setStatusFilter("all")
                setDateFilter("all")
                setMinAmount("")
                setMaxAmount("")
                setCurrentPage(1)
              }}
              className="text-xs text-primary hover:underline ml-auto font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Table & Pagination */}
      {filteredTxns.length === 0 ? (
        <EmptyState
          title="No transactions found"
          description="Try adjusting your search or filter parameters."
        />
      ) : (
        <div className="space-y-4">
          <DataTable columns={columns} data={paginatedTxns} />

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2">
              <p className="text-sm text-muted-foreground">
                Showing page {currentPage} of {totalPages} ({filteredTxns.length} total)
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 border rounded-lg disabled:opacity-50 hover:bg-muted"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 border rounded-lg disabled:opacity-50 hover:bg-muted"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
