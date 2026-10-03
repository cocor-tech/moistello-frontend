"use client"

import type { ReactNode } from "react"

/**
 * Layout primitives for the printed circle summary.
 *
 * These use plain borders and black-on-white rather than the app's glass
 * tiers, because the printed sheet has to be legible in mono on a cheap
 * office printer. The global `@media print` block in `globals.css` handles
 * the parts that must apply app-wide (hiding chrome, repeat headers, keeping
 * rows whole); the classes here are the structural half.
 */

/** A section of the summary. Starts each block without orphaning a heading. */
export function PrintSection({
  title,
  children,
  pageBreakBefore = false,
}: {
  title: string
  children: ReactNode
  pageBreakBefore?: boolean
}) {
  return (
    <section
      className={pageBreakBefore ? "mb-8 print-page-break" : "mb-8"}
      aria-label={title}
    >
      <h2 className="mb-3 border-b border-black/20 pb-1 font-heading text-lg font-bold uppercase tracking-wide text-black">
        {title}
      </h2>
      {children}
    </section>
  )
}

/**
 * A summary table.
 *
 * `thead` is a real `<thead>` so the browser repeats the column labels on
 * every page the table spans — that repetition is most of what makes a
 * multi-page table usable on paper.
 */
export function PrintTable({
  caption,
  children,
}: {
  caption: string
  children: ReactNode
}) {
  return (
    <table className="w-full border-collapse text-left text-xs">
      <caption className="sr-only">{caption}</caption>
      {children}
    </table>
  )
}

export function PrintHead({ children }: { children: ReactNode }) {
  return (
    <thead className="print-repeat-header">
      <tr>{children}</tr>
    </thead>
  )
}

export function PrintTh({
  children,
  align = "left",
}: {
  children: ReactNode
  align?: "left" | "right"
}) {
  return (
    <th
      scope="col"
      className={`border border-black/25 bg-black/[0.04] px-2 py-1.5 font-heading font-semibold uppercase tracking-wide text-black ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  )
}

/** A single table row. `print-avoid-break` keeps it on one sheet. */
export function PrintTr({ children }: { children: ReactNode }) {
  return <tr className="print-avoid-break break-inside-avoid">{children}</tr>
}

export function PrintTd({
  children,
  align = "left",
  mono = false,
}: {
  children: ReactNode
  align?: "left" | "right"
  mono?: boolean
}) {
  return (
    <td
      className={`border border-black/15 px-2 py-1.5 align-top text-black ${
        align === "right" ? "text-right" : "text-left"
      } ${mono ? "font-mono text-[0.7rem]" : ""}`}
    >
      {children}
    </td>
  )
}

/**
 * A label/value figure. The printed equivalent of the app's stat cards, with
 * the glass and gradient treatments dropped for the same reason.
 */
export function PrintStat({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="print-avoid-break break-inside-avoid border border-black/20 px-3 py-2">
      <dt className="text-[0.65rem] font-heading uppercase tracking-wider text-black/60">
        {label}
      </dt>
      <dd className="font-mono text-sm font-semibold text-black">{value}</dd>
    </div>
  )
}

/** Placeholder for a table with no rows, so the columns still print. */
export function PrintEmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="border border-black/15 px-2 py-4 text-center text-xs italic text-black/60"
      >
        {children}
      </td>
    </tr>
  )
}
