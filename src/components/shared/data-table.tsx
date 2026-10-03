"use client"

import { useMemo, useState, type ReactNode } from "react"
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { cn } from "@/lib/cn"
import { Button } from "@/components/ui/button"
import { TableScrollRegion } from "./table-scroll-region"
import { TableCaption, TableCell, TableHeadCell, TableRow } from "./responsive-table"

export interface DataTableColumn<T> {
  id: string
  header: ReactNode
  /**
   * Plain-text column name. Used as the stacked-card label once the header row
   * is clipped below `sm`, where it is the only thing telling a reader which
   * column a value belongs to.
   */
  label?: string
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
  /**
   * Accessible name. Used as the table caption and as the name of the scroll
   * region, so it is deliberately required — an unnamed table is announced as
   * just "table" and gives a screen-reader user no way to tell several of them
   * apart.
   */
  caption: string
  /** Optional stable row key. Falls back to the row index. */
  getRowId?: (row: T) => string
  isLoading?: boolean
  emptyState?: ReactNode
  pagination?: DataTablePagination
  serverSorting?: boolean
  onSortChange?: (columnId: string, direction: "asc" | "desc") => void
  className?: string
}

type SortState = { id: string; direction: "asc" | "desc" } | null

/** Plain text for a column, falling back so a card is never left unlabelled. */
function columnLabel<T>(column: DataTableColumn<T>): string {
  if (column.label) return column.label
  if (typeof column.header === "string") return column.header
  if (typeof column.header === "number") return String(column.header)
  return "Value"
}

function SortIndicator({ direction }: { direction: "asc" | "desc" | null }) {
  if (direction === "asc") return <ArrowUp className="h-3 w-3" aria-hidden="true" />
  if (direction === "desc") return <ArrowDown className="h-3 w-3" aria-hidden="true" />
  return <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
}

export function DataTable<T>({
  data,
  columns,
  caption,
  getRowId,
  isLoading,
  emptyState,
  pagination,
  serverSorting = false,
  onSortChange,
  className,
}: DataTableProps<T>) {
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
  const sortableColumns = columns.filter((column) => column.sortable)

  return (
    <TableScrollRegion
      label={`${caption} table`}
      className={cn("overflow-hidden border border-border", className)}
      footer={
        pagination && pageCount > 1 ? (
          <nav className="flex items-center justify-between border-t border-border px-4 py-3" aria-label={`${caption} pagination`}>
            <span className="text-xs text-muted-foreground">
              Page {pagination.page} of {pageCount}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={pagination.page <= 1}
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pagination.page >= pageCount}
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </nav>
        ) : null
      }
    >
      <table className="w-full text-left text-sm" aria-busy={isLoading || undefined}>
        <TableCaption>{caption}</TableCaption>

        {/* `bg-background/80` rather than `bg-card`: `--card` already carries an
            alpha channel, so `rgb(var(--card) / <alpha-value>)` is an invalid
            colour and the utility silently renders nothing. */}
        <thead className="border-b border-border bg-background/80">
          <tr>
            {columns.map((column) => (
              <TableHeadCell
                key={column.id}
                label={columnLabel(column)}
                aria-sort={column.sortable ? (sort?.id === column.id ? (sort.direction === "asc" ? "ascending" : "descending") : "none") : undefined}
                className={column.className}
              >
                {column.sortable ? (
                  // Hidden below `sm`: the header strip is clipped there, and a
                  // focusable control inside a clipped cell is invisible focus.
                  // The visible sort pills below take over at that width.
                  <button
                    type="button"
                    className="hidden items-center gap-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-aurora-violet sm:inline-flex"
                    onClick={() => changeSort(column)}
                    aria-label={`Sort by ${columnLabel(column)}`}
                  >
                    {column.header}
                    <SortIndicator direction={sort?.id === column.id ? sort.direction : null} />
                  </button>
                ) : (
                  column.header
                )}
              </TableHeadCell>
            ))}
          </tr>
        </thead>

        {/* Row separators come from `.responsive-table__row` at both widths, so
            `divide-y` is deliberately absent — it would double up the mobile
            borders once rows become blocks. */}
        <tbody aria-live="polite">
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                Loading…
              </td>
            </tr>
          ) : sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>{emptyState}</td>
            </tr>
          ) : (
            sortedData.map((row, index) => (
              <TableRow key={getRowId ? getRowId(row) : index} className="transition-colors hover:bg-white/[0.03]">
                {columns.map((column, cellIndex) => (
                  <TableCell
                    key={column.id}
                    label={columnLabel(column)}
                    primary={cellIndex === 0}
                    className={column.className}
                  >
                    {column.cell ? column.cell(row) : String(column.accessor?.(row) ?? "")}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </tbody>
      </table>

      {sortableColumns.length > 1 && (
        <div
          role="group"
          aria-label={`Sort ${caption.toLowerCase()}`}
          className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3 sm:hidden"
        >
          <span className="text-2xs font-heading uppercase tracking-wider text-muted-foreground">Sort</span>
          {sortableColumns.map((column) => (
            <button
              key={column.id}
              type="button"
              onClick={() => changeSort(column)}
              aria-label={`Sort by ${columnLabel(column)}`}
              aria-pressed={sort?.id === column.id}
              className={cn(
                "focus-ring inline-flex items-center gap-1 rounded-full border px-3 py-1 text-2xs transition-colors",
                sort?.id === column.id
                  ? "border-aurora-violet/60 text-aurora-violet"
                  : "border-border text-muted-foreground"
              )}
            >
              {columnLabel(column)}
              <SortIndicator direction={sort?.id === column.id ? sort.direction : null} />
            </button>
          ))}
        </div>
      )}
    </TableScrollRegion>
  )
}
