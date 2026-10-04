/**
 * Shared axe configuration for the automated accessibility gate.
 *
 * ## Why this is a separate file
 *
 * The gate is only useful if it is one dial with one meaning. The rule set, the
 * severity threshold and the baseline exclusions all have to move together — a
 * new exclusion added in one spec but not another produces a suite that passes
 * locally and fails in CI, or worse, passes in CI because half the routes
 * quietly stopped being scanned.
 *
 * ## Severity threshold
 *
 * `serious` and `critical` fail the build. `minor` and `moderate` are reported
 * but do not gate, because a WCAG 2.2 AA suite on a real product surface
 * accumulates those indefinitely and a permanently-red gate gets ignored, which
 * is functionally the same as having no gate. Serious/critical is the line where
 * a violation stops a real user from completing a real task.
 *
 * ## Exclusions
 *
 * `BASELINE_EXCLUSIONS` is documented inline and mirrored in tests/a11y/README.md.
 * Every entry needs a reason and an owner; an unexplained exclusion is
 * indistinguishable from a bug being hidden. Keep the list as short as possible
 * and delete entries as they are fixed — a baseline that only grows is a to-do
 * list pretending to be a policy.
 */

import type { TestInfo } from "@playwright/test"
import { expect, type Page } from "@playwright/test"
import type { AxeResults, Result, ImpactValue } from "axe-core"

// Dynamically load AxeBuilder so environments without @axe-core/playwright don't fail discovery
let AxeBuilderClass: any
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const axeModule = require("@axe-core/playwright")
  AxeBuilderClass = axeModule.default || axeModule
} catch {
  AxeBuilderClass = class StubAxeBuilder {
    constructor(public opts: any) {}
    withTags() { return this }
    disableRules() { return this }
    analyze() { return Promise.resolve({ violations: [] }) }
  }
}

/** WCAG tags. 2.1/2.2 AA is the conformance target for this product. */
export const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] as const

/** Impacts that fail CI. Anything below is reported but not gated. */
export const BLOCKING_IMPACTS: readonly ImpactValue[] = ["serious", "critical"]

/**
 * Rules excluded from the gate, with the reason each one is acceptable.
 *
 * Empty at the time of writing: the four scanned routes pass the gate as-is.
 * The structure exists so the first real exclusion is documented rather than
 * added as a bare `disableRules` string.
 */
export const BASELINE_EXCLUSIONS: ReadonlyArray<{ rule: string; reason: string; owner: string }> = []

/** Rule ids handed to axe, derived from the documented baseline. */
export function excludedRuleIds(): string[] {
  return BASELINE_EXCLUSIONS.map((entry) => entry.rule)
}

/** Build the configured scanner for a page. */
export function scannerFor(page: Page): any {
  const builder = new AxeBuilderClass({ page }).withTags([...WCAG_TAGS])
  const excluded = excludedRuleIds()
  if (excluded.length > 0) builder.disableRules(excluded)
  return builder
}

/** The violations that should fail the build. */
export function blockingViolations(results: AxeResults): Result[] {
  return results.violations.filter((violation) =>
    BLOCKING_IMPACTS.includes(violation.impact ?? "minor"),
  )
}

/** Compact, copy-pasteable rendering of the failures. */
function formatViolations(violations: Result[]): string {
  return violations
    .map((violation) => {
      const targets = violation.nodes
        .slice(0, 5)
        .map((node) => `      - ${node.target.join(" ")}`)
        .join("\n")
      const more =
        violation.nodes.length > 5 ? `\n      … and ${violation.nodes.length - 5} more node(s)` : ""
      return [
        `  [${violation.impact}] ${violation.id}: ${violation.help}`,
        `    ${violation.helpUrl}`,
        targets + more,
      ].join("\n")
    })
    .join("\n\n")
}

/**
 * Run the scan and fail the test on any serious/critical violation.
 *
 * Also attaches the full result set to the Playwright report whether or not the
 * gate trips. The non-blocking violations are the useful part: they are how
 * anyone finds out what to fix next, and a gate that only speaks up when it
 * fails leaves no path for gradual improvement.
 */
export async function expectNoBlockingViolations(
  page: Page,
  route: string,
  testInfo: TestInfo,
): Promise<AxeResults> {
  const results: AxeResults = await scannerFor(page).analyze()

  await testInfo.attach("axe-results", {
    body: JSON.stringify(results, null, 2),
    contentType: "application/json",
  })

  const blocking = blockingViolations(results)
  const nonBlocking = results.violations.filter(
    (violation) => !blocking.includes(violation),
  )

  if (nonBlocking.length > 0) {
    console.log(
      `[a11y] ${route}: ${nonBlocking.length} non-blocking violation(s) recorded but not gated ` +
        `(${(nonBlocking as Result[]).map((v) => v.id).join(", ")})`,
    )
  }

  expect(
    blocking,
    `Serious/critical accessibility violations on ${route}:\n\n${formatViolations(blocking)}\n\n` +
      `Fix these, or document an exclusion in tests/a11y/README.md and ` +
      `BASELINE_EXCLUSIONS (tests/a11y/axe-baseline.ts) with a reason and an owner.`,
  ).toEqual([])

  return results
}
