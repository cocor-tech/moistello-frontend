"use client"

import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react"
import { cn } from "@/lib/cn"

/**
 * Presentational primitives for tables that must stay readable at 375px.
 *
 * Below the `sm` breakpoint each row becomes a stacked card: the `<th>` strip is
 * clipped rather than removed (so screen readers keep the header association) and
 * every cell renders its column name inline via `data-label`. At `sm` and above
 * the table reverts to a normal grid. The behaviour lives in `globals.css` under
 * `.responsive-table`, so nothing here depends on JavaScript or on a viewport
 * measurement — the same markup is served to both.
 *
 * Every cell MUST pass `label`; that string is the only thing telling a sighted
 * mobile user which column a value came from once the header row is gone.
 */

export interface TableCaptionProps {
  children: ReactNode
  /** Set false to keep the caption for screen readers only (the default). */
  visible?: boolean
  className?: string
}

/** Screen-reader caption. Tables without one are announced as just "table". */
export function TableCaption({ children, visible = false, className }: TableCaptionProps) {
  return <caption className={cn(visible ? "px-4 pb-2 text-left font-heading text-xs text-muted-foreground" : "sr-only", className)}>{children}</caption>
}

export interface TableHeadCellProps extends ThHTMLAttributes<HTMLTableCellElement> {
  label: string
}

export function TableHeadCell({ label, className, children, ...props }: TableHeadCellProps) {
  return (
    <th scope="col" className={cn("responsive-table__head-cell px-4 py-3 text-xs font-heading uppercase tracking-wider text-muted-foreground", className)} {...props}>
      {children ?? label}
    </th>
  )
}

export type TableRowProps = HTMLAttributes<HTMLTableRowElement>

export function TableRow({ className, ...props }: TableRowProps) {
  return <tr className={cn("responsive-table__row", className)} {...props} />
}

export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  /** Column name, shown before the value on narrow viewports. */
  label: string
  /** First column of a row reads as the card's heading. */
  primary?: boolean
}

export function TableCell({ label, primary = false, className, children, ...props }: TableCellProps) {
  return (
    <td
      data-label={label}
      className={cn("responsive-table__cell", primary && "responsive-table__cell--primary", className)}
      {...props}
    >
      {/* The wrapper exists so `justify-content: space-between` has a single
          item to push to the end of the stacked row. It deliberately carries no
          alignment of its own — at `sm` the cell is a plain `table-cell` and must
          keep inheriting whatever `text-*` the caller put on the column. */}
      <span className="min-w-0">{children}</span>
    </td>
  )
}
