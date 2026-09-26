"use client"

import { useMemo, useState, useEffect } from "react"
import Link from "next/link"
import { ArrowUpCircle, ArrowDownCircle, Search, ChevronLeft, ChevronRight, X, DollarSign, Filter } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { PageHeader } from "@/components/shared/page-header"
import { get } from "@/lib/api-client"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { PageError, PageLoading } from "@/components/shared/page-state"
import type { ApiResponse } from "@/types"
import { cn } from "@/lib/cn"
import { formatAddress } from "@/lib/formatters"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

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

const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "sent", label: "Sent", icon: ArrowUpCircle, color: "text-red-500" },
  { value: "received", label: "Received", icon: ArrowDownCircle, color: "text-green-500" },
] as const

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "completed", label: "Completed", color: "bg-success/20 text-success border-success/30" },
  { value: "pending", label: "Pending", color: "bg-warning/20 text-warning border-warning/30" },
  { value: "failed", label: "Failed", color: "bg-destructive/20 text-destructive border-destructive/30" },
] as const

const DATE_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
] as const

function FilterChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  showAll = true,
}: {
  label: string
  options: readonly { value: T; label: string; icon?: React.ComponentType<{ className?: string }>; color?: string }[]
  value: T
  onChange: (val: T) => void
  showAll?: boolean
}) {
  const activeOptions = options.filter(o => o.value !== "all")

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {showAll && (
          <button
            type="button"
            onClick={() => onChange("all" as T)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
              value === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
            aria-pressed={value === "all"}
          >
            All
          </button>
        )}
        {activeOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
              "border",
              value === opt.value
                ? "bg-primary text-primary-foreground shadow-sm border-primary"
                : opt.color
                  ? opt.color.replace("bg-", "bg-").replace("text-", "text-").replace("border-", "border-") + " hover:bg-primary/10 hover:border-primary/30"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border-border"
            )}
            aria-pressed={value === opt.value}
          >
            {opt.icon && <opt.icon className="h-3.5 w-3.5" />}
            {opt.label}
            {value === opt.value && <X className="h-3 w-3" aria-hidden="true" />}
          </button>
        ))}
      </div>
    </div>
  )
}

function AmountRangeFilter({
  minAmount,
  maxAmount,
  onMinChange,
  onMaxChange,
  onClear,
  hasValues,
}: {
  minAmount: string
  maxAmount: string
  onMinChange: (val: string) => void
  onMaxChange: (val: string) => void
  onClear: () => void
  hasValues: boolean
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount Range</label>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="number"
            placeholder="Min"
            value={minAmount}
            onChange={(e) => onMinChange(e.target.value)}
            className="w-28 pl-7 pr-3 py-1.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Minimum amount"
          />
        </div>
        <span className="text-muted-foreground">–</span>
        <div className="relative">
          <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="number"
            placeholder="Max"
            value={maxAmount}
            onChange={(e) => onMaxChange(e.target.value)}
            className="w-28 pl-7 pr-3 py-1.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Maximum amount"
          />
        </div>
        {hasValues && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-primary hover:underline font-medium"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}

function SearchInput({
  value,
  onChange,
  onClear,
  hasValue,
}: {
  value: string
  onChange: (val: string) => void
  onClear: () => void
  hasValue: boolean
}) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type="text"
        placeholder="Search by ID, hash, or description..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-9 pr-10 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label="Search transactions"
      />
      {hasValue && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

function ActiveFiltersBar({
  filters,
  onClearAll,
  onRemoveFilter,
}: {
  filters: Array<{ key: string; label: string; value: string }>
  onClearAll: () => void
  onRemoveFilter: (key: string) => void
}) {
  if (filters.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border">
      <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <span className="text-xs font-medium text-muted-foreground">Active filters:</span>
      <div className="flex flex-wrap gap-1.5">
        {filters.map((f) => (
          <Badge
            key={f.key}
            variant="primary"
            size="sm"
            className="gap-1"
            onClick={() => onRemoveFilter(f.key)}
            style={{ cursor: "pointer" }}
          >
            {f.label}
            <X className="h-2.5 w-2.5" aria-hidden="true" />
          </Badge>
        ))}
        {filters.length > 1 && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-muted-foreground hover:text-foreground font-medium"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  )
}

export default function TransactionsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Initialize state from URL params
  const [search, setSearch] = useState(searchParams.get("search") ?? "")
  const [typeFilter, setTypeFilter] = useState((searchParams.get("type") as "all" | "sent" | "received") ?? "all")
  const [statusFilter, setStatusFilter] = useState((searchParams.get("status") as "all" | "completed" | "pending" | "failed") ?? "all")
  const [dateFilter, setDateFilter] = useState((searchParams.get("date") as "all" | "7d" | "30d" | "90d") ?? "all")
  const [minAmount, setMinAmount] = useState(searchParams.get("minAmount") ?? "")
  const [maxAmount, setMaxAmount] = useState(searchParams.get("maxAmount") ?? "")
  const [currentPage, setCurrentPage] = useState(() => Number(searchParams.get("page")) || 1)

  // Sync URL params when filters change
  const updateUrl = useCallback(() => {
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (typeFilter !== "all") params.set("type", typeFilter)
    if (statusFilter !== "all") params.set("status", statusFilter)
    if (dateFilter !== "all") params.set("date", dateFilter)
    if (minAmount) params.set("minAmount", minAmount)
    if (maxAmount) params.set("maxAmount", maxAmount)
    if (currentPage > 1) params.set("page", String(currentPage))
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [search, typeFilter, statusFilter, dateFilter, minAmount, maxAmount, currentPage, pathname, router])

  useEffect(() => {
    updateUrl()
  }, [updateUrl])

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

  // Build active filters for display
  const activeFilters = useMemo(() => {
    const filters: Array<{ key: string; label: string; value: string }> = []
    if (search) filters.push({ key: "search", label: `Search: "${search}"`, value: search })
    if (typeFilter !== "all") {
      const opt = TYPE_OPTIONS.find(o => o.value === typeFilter)
      filters.push({ key: "type", label: `Type: ${opt?.label ?? typeFilter}`, value: typeFilter })
    }
    if (statusFilter !== "all") {
      const opt = STATUS_OPTIONS.find(o => o.value === statusFilter)
      filters.push({ key: "status", label: `Status: ${opt?.label ?? statusFilter}`, value: statusFilter })
    }
    if (dateFilter !== "all") {
      const opt = DATE_OPTIONS.find(o => o.value === dateFilter)
      filters.push({ key: "date", label: `Date: ${opt?.label ?? dateFilter}`, value: dateFilter })
    }
    if (minAmount) filters.push({ key: "minAmount", label: `Min: $${minAmount}`, value: minAmount })
    if (maxAmount) filters.push({ key: "maxAmount", label: `Max: $${maxAmount}`, value: maxAmount })
    return filters
  }, [search, typeFilter, statusFilter, dateFilter, minAmount, maxAmount])

  const hasActiveFilters = activeFilters.length > 0

  const handleSearchChange = (val: string) => {
    setSearch(val)
    setCurrentPage(1)
  }

  const handleSearchClear = () => {
    setSearch("")
    setCurrentPage(1)
  }

  const handleTypeChange = (val: "all" | "sent" | "received") => {
    setTypeFilter(val)
    setCurrentPage(1)
  }

  const handleStatusChange = (val: "all" | "completed" | "pending" | "failed") => {
    setStatusFilter(val)
    setCurrentPage(1)
  }

  const handleDateChange = (val: "all" | "7d" | "30d" | "90d") => {
    setDateFilter(val)
    setCurrentPage(1)
  }

  const handleMinAmountChange = (val: string) => {
    setMinAmount(val)
    setCurrentPage(1)
  }

  const handleMaxAmountChange = (val: string) => {
    setMaxAmount(val)
    setCurrentPage(1)
  }

  const handleClearAmount = () => {
    setMinAmount("")
    setMaxAmount("")
    setCurrentPage(1)
  }

  const handleRemoveFilter = (key: string) => {
    switch (key) {
      case "search": setSearch(""); break
      case "type": setTypeFilter("all"); break
      case "status": setStatusFilter("all"); break
      case "date": setDateFilter("all"); break
      case "minAmount": setMinAmount(""); break
      case "maxAmount": setMaxAmount(""); break
    }
    setCurrentPage(1)
  }

  const handleClearAll = () => {
    setSearch("")
    setTypeFilter("all")
    setStatusFilter("all")
    setDateFilter("all")
    setMinAmount("")
    setMaxAmount("")
    setCurrentPage(1)
  }

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
        <span className={cn("font-semibold", tx.type === "sent" ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400")}>
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
          <Badge variant={st === "completed" ? "success" : st === "pending" ? "warning" : "destructive"} size="sm">
            {st}
          </Badge>
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

      {/* Filters Toolbar */}
      <div className="glass rounded-2xl p-4 holo-border space-y-4">
        {/* Search */}
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          onClear={handleSearchClear}
          hasValue={!!search}
        />

        {/* Filter Chips */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <FilterChipGroup
            label="Type"
            options={TYPE_OPTIONS}
            value={typeFilter}
            onChange={handleTypeChange}
          />
          <FilterChipGroup
            label="Status"
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={handleStatusChange}
          />
          <FilterChipGroup
            label="Date Range"
            options={DATE_OPTIONS}
            value={dateFilter}
            onChange={handleDateChange}
          />
          <AmountRangeFilter
            minAmount={minAmount}
            maxAmount={maxAmount}
            onMinChange={handleMinAmountChange}
            onMaxChange={handleMaxAmountChange}
            onClear={handleClearAmount}
            hasValues={!!minAmount || !!maxAmount}
          />
        </div>

        {/* Active Filters Bar */}
        <ActiveFiltersBar
          filters={activeFilters}
          onClearAll={handleClearAll}
          onRemoveFilter={handleRemoveFilter}
        />
      </div>

      {/* Results */}
      {filteredTxns.length === 0 ? (
        <div className="glass rounded-2xl p-8 holo-border text-center">
          <div className="space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50">
              {hasActiveFilters ? (
                <Search className="h-8 w-8 text-muted-foreground" />
              ) : (
                <ArrowDownCircle className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <h3 className="font-heading text-lg font-semibold text-foreground">
              {hasActiveFilters ? "No matching transactions" : "No transactions yet"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {hasActiveFilters
                ? "Try adjusting your search or filter parameters to find what you're looking for."
                : "Your transaction history will appear here once you start sending or receiving funds."}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={handleClearAll} className="mt-2">
                Clear all filters
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <DataTable columns={columns} data={paginatedTxns} />

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2">
              <p className="text-sm text-muted-foreground">
                Showing page {currentPage} of {totalPages} ({filteredTxns.length} total)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}