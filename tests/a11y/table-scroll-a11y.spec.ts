import { test, expect, type Page } from "@playwright/test"

import { buildMockFixtures } from "../helpers/mock-app"
import { measureHorizontalOverflow } from "../helpers/mobile-audit"
import { signIn } from "./authenticated-session"

/**
 * Regression cover for wide tables on narrow viewports.
 *
 * ## The failure this locks down
 *
 * Wide data tables scrolled horizontally inside a bare `overflow-x-auto` div.
 * That div was focusable (browsers make scroll containers keyboard-focusable)
 * but unnamed, so a keyboard user tabbed into an anonymous box with no way to
 * tell what it contained, and a touch user had no affordance suggesting the
 * table went sideways at all. Below 640px the same tables also pushed content
 * off-screen, so cells were only reachable by scrolling.
 *
 * The fix is two-sided: reflow tables into stacked cards below `sm`, and give
 * any region that genuinely still scrolls an accessible name and a focus stop.
 * These tests assert both halves at the exact width the acceptance criteria
 * name (375px), which is narrower than any viewport the rest of the suite uses.
 */

const NARROW_VIEWPORT = { width: 375, height: 812 }

/** Routes that render a data table, with a way to get the table on screen. */
const TABLE_ROUTES = [
  {
    name: "wallet transactions",
    path: "/wallet/transactions",
    /** Sign-in only; the list renders from the standard fixtures. */
    prepare: async (_page: Page) => {},
  },
  {
    name: "circle comparison",
    path: "/circles/compare",
    prepare: async (page: Page) => {
      await page.getByPlaceholder("Paste a circle ID to compare...").fill("circle-alpha")
      await page.getByRole("button", { name: "Add", exact: true }).click()
    },
  },
  {
    name: "circle rounds",
    path: "/circles/circle-alpha/rounds",
    prepare: async (_page: Page) => {},
  },
] as const

/**
 * Every element that actually scrolls sideways must carry an accessible name.
 *
 * Returns the offenders rather than asserting inside `page.evaluate` so the
 * failure message names the elements instead of just saying "expected true".
 */
async function findUnnamedScrollRegions(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const nameOf = (el: Element): string => {
      const aria = el.getAttribute("aria-label")
      if (aria && aria.trim()) return aria.trim()

      const labelledBy = el.getAttribute("aria-labelledby")
      if (labelledBy) {
        const text = labelledBy
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
          .filter(Boolean)
          .join(" ")
        if (text) return text
      }

      const title = el.getAttribute("title")
      if (title && title.trim()) return title.trim()

      // A <fieldset>/<figure> derive their name from their own legend/caption.
      const legend = el.querySelector("legend, caption")
      const legendText = legend?.textContent?.trim() ?? ""
      if (legendText) return legendText

      return ""
    }

    const offenders: string[] = []

    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>("*"))) {
      const style = window.getComputedStyle(el)
      if (style.display === "none" || style.visibility === "hidden") continue

      const overflowX = style.overflowX
      if (overflowX !== "auto" && overflowX !== "scroll") continue
      if (el.scrollWidth <= el.clientWidth + 1) continue

      if (nameOf(el)) continue

      const describe =
        el.getAttribute("data-testid") ??
        el.tagName.toLowerCase() +
          (el.className && typeof el.className === "string"
            ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".")
            : "")

      offenders.push(describe)
    }

    return offenders
  })
}

/**
 * Focusable elements must not be invisible.
 *
 * The stacked-card layout clips the header strip on narrow viewports. If any
 * link or button survived inside that clipped strip it would still take a Tab
 * stop while being unreadable — invisible focus, which is the same failure class
 * as the original bug.
 */
async function findInvisibleFocusables(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const offenders: string[] = []

    const candidates = Array.from(
      document.body.querySelectorAll<HTMLElement>(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    )

    for (const el of candidates) {
      const style = window.getComputedStyle(el)
      if (style.display === "none" || style.visibility === "hidden") continue
      // `disabled` only exists on form controls, so narrow before reading it.
      if ((el as Partial<HTMLInputElement>).disabled) continue

      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) {
        offenders.push(el.outerHTML.slice(0, 80))
      }
    }

    return offenders
  })
}

test.describe("Wide tables on a 375px viewport", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(180_000)
    await page.setViewportSize(NARROW_VIEWPORT)
  })

  for (const route of TABLE_ROUTES) {
    test(`${route.name} fits the viewport without horizontal scrolling`, async ({ page, context }) => {
      const fixtures = buildMockFixtures()
      await signIn(page, context, fixtures)

      // `signIn` installs a catch-all mock that 500s unknown endpoints. Rounds
      // has no fixture, and later registrations win, so mock it here rather
      // than widening the shared helper for one spec.
      await page.route("**/v1/circles/*/rounds", (route) =>
        route.fulfill({
          status: 200,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            success: true,
            data: {
              rounds: [{ roundNumber: 1, contributions: fixtures.contributions }],
            },
          }),
        }),
      )

      await page.goto(route.path)
      await route.prepare(page)

      // Anti-vacuity: a test that finds no table proves nothing, so fail loudly
      // rather than reporting a clean sweep over an empty page.
      await page.locator("table").first().waitFor({ state: "visible", timeout: 60_000 })

      const overflow = await measureHorizontalOverflow(page)
      expect(
        overflow.offenders,
        `Page overflows by ${overflow.overflowPx}px at ${NARROW_VIEWPORT.width}px: ` +
          overflow.offenders.map((o) => o.selector).join(", "),
      ).toEqual([])
    })
  }

  test("every scrollable table region has an accessible name", async ({ page, context }) => {
    const fixtures = buildMockFixtures()
    await signIn(page, context, fixtures)

    await page.goto("/wallet/transactions")
    await page.locator("table").first().waitFor({ state: "visible", timeout: 60_000 })

    const unnamed = await findUnnamedScrollRegions(page)
    expect(unnamed, "Scrollable regions must be named landmarks").toEqual([])
  })

  test("no tab stop is left invisible by the stacked layout", async ({ page, context }) => {
    const fixtures = buildMockFixtures()
    await signIn(page, context, fixtures)

    await page.goto("/wallet/transactions")
    await page.locator("table").first().waitFor({ state: "visible", timeout: 60_000 })

    const invisible = await findInvisibleFocusables(page)
    expect(invisible, "Focusable elements must not be visually hidden").toEqual([])
  })

  test("every cell value stays inside the viewport at 375px", async ({ page, context }) => {
    const fixtures = buildMockFixtures()
    await signIn(page, context, fixtures)

    await page.goto("/wallet/transactions")
    await page.locator("table").first().waitFor({ state: "visible", timeout: 60_000 })

    const clipped = await page.evaluate(() => {
      const viewport = window.innerWidth
      const results: string[] = []

      for (const cell of Array.from(document.querySelectorAll("table td"))) {
        const rect = cell.getBoundingClientRect()
        if (rect.width === 0 && rect.height === 0) continue
        if (rect.right > viewport + 1) {
          results.push(`${cell.getAttribute("data-label") ?? "?"}: ${Math.round(rect.right)}px`)
        }
      }

      return results.slice(0, 10)
    })

    expect(clipped, "Table cells must not extend past the viewport").toEqual([])
  })
})

test.describe("Markdown tables in long-form content", () => {
  test("docs tables fit at 375px and stay reachable", async ({ page }) => {
    test.setTimeout(180_000)
    await page.setViewportSize(NARROW_VIEWPORT)

    // Public route — no session needed, and the markdown tables are real.
    await page.goto("/docs/circles")
    await page.locator("table").first().waitFor({ state: "visible", timeout: 60_000 })

    const overflow = await measureHorizontalOverflow(page)
    expect(
      overflow.offenders,
      `Docs overflow by ${overflow.overflowPx}px at ${NARROW_VIEWPORT.width}px: ` +
        overflow.offenders.map((o) => o.selector).join(", "),
    ).toEqual([])

    const unnamed = await findUnnamedScrollRegions(page)
    expect(unnamed, "Scrollable regions must be named landmarks").toEqual([])

    // Each stacked cell keeps its column name, so the values are readable.
    const labels = await page.locator("table td").evaluateAll((cells) =>
      Array.from(new Set(cells.map((cell) => cell.getAttribute("data-label")).filter(Boolean))),
    )
    expect(labels.length).toBeGreaterThan(0)
  })
})
