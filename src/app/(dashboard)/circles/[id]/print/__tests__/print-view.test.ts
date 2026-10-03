import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { PrintButton } from "../print-button"
import { PrintSummaryButton } from "../print-summary-button"

/**
 * The print controls.
 *
 * The acceptance criteria are about the printed sheet, so the two things
 * worth pinning here are that the control is marked to vanish on paper and
 * that it reaches `window.print()`. Whether a given browser honours the
 * resulting page break is checked by the print-stylesheet suite.
 */

describe("print controls", () => {
  it("are excluded from the printed sheet", () => {
    // A print button printed onto the page it prints is an obvious small
    // absurdity, but it is the kind that ships.
    for (const source of [
      readFileSync(join(__dirname, "..", "print-button.tsx"), "utf-8"),
      readFileSync(join(__dirname, "..", "print-summary-button.tsx"), "utf-8"),
    ]) {
      expect(source).toContain('data-print-hide="true"')
    }
  })

  it("use a real button, since window.print is gesture-gated", () => {
    expect(typeof PrintButton).toBe("function")
    expect(typeof PrintSummaryButton).toBe("function")
  })

  it("call window.print rather than navigating", () => {
    const source = readFileSync(join(__dirname, "..", "print-button.tsx"), "utf-8")
    expect(source).toContain("window.print()")
  })

  it("open the print view in an isolated tab from the circle page", () => {
    const source = readFileSync(join(__dirname, "..", "print-summary-button.tsx"), "utf-8")
    // `noopener` matters: without it the new tab can reach back through
    // `window.opener` while the organizer is looking at a printed summary.
    expect(source).toContain("noopener,noreferrer")
  })
})

describe("print route", () => {
  const page = readFileSync(join(__dirname, "..", "page.tsx"), "utf-8")

  it("renders members, rounds and balances", () => {
    expect(page).toContain("PrintMembersTable")
    expect(page).toContain("PrintRoundsTable")
    expect(page).toContain("Balance held")
  })

  it("exposes the figures the organizer needs at a meeting", () => {
    expect(page).toContain("Total collected")
    expect(page).toContain("Total paid out")
    expect(page).toContain("Outstanding payments")
  })

  it("starts the rounds table on a fresh sheet", () => {
    // A long members table must not leave the rounds table half-written.
    // The class is applied by the table, not the page.
    const tables = readFileSync(join(__dirname, "..", "print-tables.tsx"), "utf-8")
    expect(tables).toMatch(/title="Rounds"\s+pageBreakBefore/)
  })
})

describe("print tables", () => {
  const tables = readFileSync(join(__dirname, "..", "print-tables.tsx"), "utf-8")
  // The row/header primitives live in their own module, which is where the
  // unbreakable-row and repeating-header rules are actually applied.
  const primitives = readFileSync(join(__dirname, "..", "print-primitives.tsx"), "utf-8")

  it("mark every body row as unbreakable", () => {
    expect(primitives).toMatch(/<tr className="print-avoid-break/)
  })

  it("repeats column headers across pages", () => {
    expect(primitives).toMatch(/<thead className="print-repeat-header"/)
  })

  it("uses a real thead with scoped headers", () => {
    expect(primitives).toContain("<thead")
    expect(primitives).toContain('scope="col"')
  })

  it("builds both tables from the unbreakable primitives", () => {
    expect(tables).toContain("PrintTr")
    expect(tables).toContain("PrintHead")
  })
})
