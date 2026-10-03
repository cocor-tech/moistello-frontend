"use client"

import { useMemo, useState, type ReactNode } from "react"
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { cn } from "@/lib/cn"
import { Button } from "@/components/ui/button"

export interface DataTableColumn<T> {
  id: string
  header: ReactNode
  accessor?: (row: T) => unknown
  cell?: (row: T) => ReactNode
  sortable?: boolean
  className?: string
}

export interface DataTablePagination {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

interface DataTableProps<T> {
  data: T[]
  columns: DataTableColumn<T>[]
  getRowId: (row: T) => string
  caption?: string
  isLoading?: boolean
  emptyState?: ReactNode
  pagination?: DataTablePagination
  serverSorting?: boolean
  onSortChange?: (columnId: string, direction: "asc" | "desc") => void
  className?: string
}

type SortState = { id: string; direction: "asc" | "desc" } | null

export function DataTable<T>({ data, columns, getRowId, caption, isLoading, emptyState, pagination, serverSorting = false, onSortChange, className }: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState>(null)

  const sortedData = useMemo(() => {
    if (serverSorting || !sort) return data
    const column = columns.find((item) => item.id === sort.id)
    if (!column?.accessor) return data
    return [...data].sort((a, b) => {
      const left = column.accessor!(a)
      const right = column.accessor!(b)
      const result = String(left ?? "").localeCompare(String(right ?? ""), undefined, { numeric: true })
      return sort.direction === "asc" ? result : -result
    })
  }, [columns, data, serverSorting, sort])

  const changeSort = (column: DataTableColumn<T>) => {
    if (!column.sortable) return
    const direction = sort?.id === column.id && sort.direction === "asc" ? "desc" : "asc"
    setSort({ id: column.id, direction })
    onSortChange?.(column.id, direction)
  }

  const pageCount = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize)) : 1

  return (
    <div className={cn("overflow-hidden border border-border", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" aria-busy={isLoading || undefined}>
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="border-b border-border bg-card">
            <tr>
              {columns.map((column) => (
                <th key={column.id} scope="col" className={cn("px-4 py-3 text-xs font-heading uppercase tracking-wider text-muted-foreground", column.className)}>
                  {column.sortable ? (
                    <button type="button" className="inline-flex items-center gap-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-foreground" onClick={() => changeSort(column)} aria-label={`Sort by ${String(column.header)}`}>
                      {column.header}
                      {sort?.id === column.id ? (sort.direction === "asc" ? <ArrowUp className="h-3 w-3" aria-hidden="true" /> : <ArrowDown className="h-3 w-3" aria-hidden="true" />) : <ArrowUpDown className="h-3 w-3" aria-hidden="true" />}
                    </button>
                  ) : column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border" aria-live="polite">
            {isLoading ? <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr> : sortedData.length === 0 ? <tr><td colSpan={columns.length}>{emptyState}</td></tr> : sortedData.map((row) => <tr key={getRowId(row)} className="transition-colors hover:bg-white/[0.03]">{columns.map((column) => <td key={column.id} className={cn("px-4 py-3", column.className)}>{column.cell ? column.cell(row) : String(column.accessor?.(row) ?? "")}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
      {pagination && pageCount > 1 && <nav className="flex items-center justify-between border-t border-border px-4 py-3" aria-label="Table pagination"><span className="text-xs text-muted-foreground">Page {pagination.page} of {pageCount}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={pagination.page <= 1} onClick={() => pagination.onPageChange(pagination.page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></Button><Button size="sm" variant="outline" disabled={pagination.page >= pageCount} onClick={() => pagination.onPageChange(pagination.page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></Button></div></nav>}
    </div>
  )
}
