/**
 * Print-stylesheet invariants for the circle summary (#436).
 *
 * These assert against the actual stylesheet text rather than a computed
 * stylesheet, because jsdom does not implement `@media print` and cannot tell
 * us what a printer would do. Reading the CSS is the honest way to check the
 * rules that matter: that chrome is hidden, that rows are told not to split,
 * and that the palette is forced to ink-on-paper.
 *
 * The behaviour the rules produce is covered separately in
 * `print-summary.test.ts` (the figures) and by the Playwright print suite.
 */

import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const globalsPath = path.join(process.cwd(), "src", "app", "globals.css")
const css = fs.readFileSync(globalsPath, "utf-8")

/** The body of the `@media print` block, brace-matched. */
function printBlock(): string {
  const start = css.indexOf("@media print")
  expect(start, "globals.css has no @media print block").toBeGreaterThan(-1)
  const open = css.indexOf("{", start)
  let depth = 0
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++
    else if (css[i] === "}") {
      depth--
      if (depth === 0) return css.slice(open + 1, i)
    }
  }
  throw new Error("unbalanced @media print block")
}

const block = printBlock()

describe("print stylesheet", () => {
  it("exists, and is a single top-level block", () => {
    expect(css.match(/@media print/g)).toHaveLength(1)
  })

  // ── Acceptance criterion 1: nav/chrome removed ──────────────────────────
  it("hides navigation chrome by role and tag, not just by opt-in attribute", () => {
    for (const selector of [
      "nav",
      "aside",
      "header",
      "footer",
      "[role='navigation']",
      "[role='dialog']",
      "[role='toolbar']",
      "[data-print-hide='true']",
    ]) {
      expect(block, `print rules must hide ${selector}`).toContain(selector)
    }
  })

  it("hides interactive controls, which have no meaning on paper", () => {
    expect(block).toMatch(/button[\s\S]*?display:\s*none\s*!important/)
    expect(block).toContain("input")
    expect(block).toContain("select")
  })

  it("releases fixed and sticky positioning so chrome does not repeat per page", () => {
    expect(block).toMatch(/\.fixed[\s\S]*?position:\s*static\s*!important/)
    expect(block).toMatch(/\.sticky[\s\S]*?position:\s*static\s*!important/)
  })

  it("reclaims the sidebar gutter and mobile-nav band reserved on screen", () => {
    expect(block).toMatch(/#main-content[\s\S]*?padding:\s*0\s*!important/)
  })

  // ── Ink-on-paper ───────────────────────────────────────────────────────
  it("pins the theme tokens to ink-on-paper for both colour schemes", () => {
    // The dark class is the trap: a printed dark page is unreadable, so the
    // override has to cover `.dark` as well as `:root` in one selector list.
    // `block` is already the @media print body.
    expect(block).toMatch(/:root,\s*\.dark\s*\{/)
    expect(block).toContain("--background: 255 255 255")
    expect(block).toContain("--foreground: 0 0 0")
    // Both tokens must be inside that one selector list, not scattered into
    // separate `:root` and `.dark` rules.
    const tokenBlock = block.slice(block.indexOf(":root,"), block.indexOf("}", block.indexOf(":root,")))
    expect(tokenBlock).toContain("--background: 255 255 255")
    expect(tokenBlock).toContain("--foreground: 0 0 0")
    expect(tokenBlock).toContain("--muted-foreground: 68 68 68")
  })

  it("forces a white page and black text on the document itself", () => {
    expect(block).toMatch(/body[\s\S]*?background:\s*#fff\s*!important/)
    expect(block).toMatch(/color:\s*#000\s*!important/)
  })

  it("disables the glass tiers and decorative pseudo-elements", () => {
    expect(block).toMatch(/\.glass\b[\s\S]*?backdrop-filter:\s*none\s*!important/)
    expect(block).toMatch(/backdrop-filter:\s*none\s*!important/)
    expect(block).toContain("content: none !important")
  })

  it("flattens gradient text, which prints as grey mush or nothing", () => {
    expect(block).toContain(".gradient-text")
    expect(block).toMatch(/-webkit-text-fill-color:\s*#000\s*!important/)
  })

  it("sets real page margins", () => {
    expect(block).toContain("@page")
    expect(block).toMatch(/margin:\s*\d+mm/)
  })

  // ── Acceptance criterion 2: rows are not split across pages ────────────
  it("forbids breaking inside a table row, with the legacy spelling too", () => {
    // Safari honours `page-break-inside`; modern engines honour
    // `break-inside`. Both are required for the row to stay whole everywhere.
    const rowRule = block.match(/tr,[\s\S]*?\{([\s\S]*?)\}/)
    expect(rowRule, "print rules must target tr").not.toBeNull()
    expect(rowRule![1]).toMatch(/break-inside:\s*avoid\s*!important/)
    expect(rowRule![1]).toMatch(/page-break-inside:\s*avoid\s*!important/)
  })

  it("repeats the table header on every page the table spans", () => {
    // Without `table-header-group` a continued table has no column labels,
    // which is the single most common way a printed table becomes unusable.
    expect(block).toMatch(/thead[\s\S]*?display:\s*table-header-group\s*!important/)
  })

  it("keeps a header glued to the first row beneath it", () => {
    expect(block).toMatch(/thead th[\s\S]*?break-after:\s*avoid\s*!important/)
  })

  it("keeps section headings from being stranded at the foot of a page", () => {
    expect(block).toMatch(/h1,[\s\S]*?h4[\s\S]*?break-after:\s*avoid\s*!important/)
  })

  it("gives table cells visible borders and padding", () => {
    expect(block).toMatch(/th,\s*td[\s\S]*?border:\s*1px solid #b8b8b8\s*!important/)
    expect(block).toMatch(/th,\s*td[\s\S]*?padding:\s*4pt 6pt\s*!important/)
  })

  it("stops a horizontal scroll container clipping a wide table", () => {
    expect(block).toMatch(/table[\s\S]*?overflow:\s*visible\s*!important/)
  })
})

describe("print utility classes", () => {
  it("exposes the utilities the print summary relies on", () => {
    expect(css).toContain(".print-repeat-header")
    expect(css).toContain(".print-avoid-break")
    expect(css).toContain(".print-page-break")
  })

  it("keeps a row whole via the utility too, not only the media query", () => {
    // The print view is also read on screen before printing, so the utility
    // has to carry the rule rather than relying on @media print alone.
    const utility = css.slice(css.indexOf(".print-avoid-break"))
    expect(utility).toMatch(/break-inside:\s*avoid/)
    expect(utility).toMatch(/page-break-inside:\s*avoid/)
  })

  it("starts a block on a fresh sheet via the page-break utility", () => {
    const utility = css.slice(css.indexOf(".print-page-break"))
    expect(utility).toMatch(/break-before:\s*page/)
    expect(utility).toMatch(/page-break-before:\s*always/)
  })
})
