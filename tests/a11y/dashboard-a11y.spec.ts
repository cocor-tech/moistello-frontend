import { test, expect } from "@playwright/test"

import { buildMockFixtures } from "../helpers/mock-app"
import { expectDashboardShell, signIn } from "./authenticated-session"
import { expectNoBlockingViolations } from "./axe-baseline"

/**
 * Automated accessibility gate for the main dashboard routes.
 *
 * ## The bug this replaces
 *
 * The previous a11y spec (tests/e2e/a11y-audit.spec.ts) navigated to /circles,
 * /wallet and /settings with no session at all. All three are in PROTECTED_PATHS
 * in src/middleware.ts, so the server redirected every one to /login and axe
 * scanned the *login page* three times. The suite was green while proving
 * nothing about the routes it named — an accessibility check that cannot fail is
 * worse than none, because it is reported as coverage.
 *
 * The fix is not just "seed the cookie": the dashboard routes are gated by
 * useRequireAuth, which reads the client auth store, so these tests now sign in
 * through the real UI. See tests/a11y/authenticated-session.ts.
 *
 * ## Severity gate
 *
 * Fails on serious and critical, records the rest. Rationale and the documented
 * exclusion list live in tests/a11y/axe-baseline.ts and tests/a11y/README.md.
 */

/**
 * The four routes the acceptance criteria call for.
 *
 * The dashboard is "/" — Routes.DASHBOARD is "/", and "/dashboard" does not
 * exist. Unauthenticated, "/" renders the marketing landing page instead, which
 * is why signing in first is not optional here: scanning "/" without a session
 * would measure the marketing page and call it the dashboard.
 */
const SCANNED_ROUTES = [
  { name: "dashboard", path: "/" },
  { name: "circles", path: "/circles" },
  { name: "wallet", path: "/wallet" },
  { name: "settings", path: "/settings" },
] as const

test.describe("Dashboard route accessibility (WCAG 2.2 AA)", () => {
  for (const route of SCANNED_ROUTES) {
    test(`${route.name} has no serious or critical violations`, async ({ page, context }, testInfo) => {
      // Generous: the first navigation into each route in dev triggers an
      // on-demand compile, and CI runs with a cold .next.
      test.setTimeout(180_000)

      const fixtures = buildMockFixtures()
      await signIn(page, context, fixtures)

      await page.goto(route.path)

      // Prove the scan is aimed at the intended page before measuring it.
      await expect(page).toHaveURL(new RegExp(`${route.path.replace("/", "\\/")}$`))
      await expectDashboardShell(page)

      await expectNoBlockingViolations(page, route.path, testInfo)
    })
  }

  /**
   * Guards the guard.
   *
   * The failure this exists to prevent is silent: if auth regresses, every scan
   * above starts measuring /login and reporting clean. This test asserts the
   * two facts such a regression would break — the URL is not /login, and the
   * dashboard's own landmark is on the page — so it fails loudly instead.
   */
  test("a signed-in dashboard scan is pointed at the dashboard, not the login page", async ({
    page,
    context,
  }) => {
    test.setTimeout(180_000)
    const fixtures = buildMockFixtures()
    await signIn(page, context, fixtures)

    expect(page.url()).not.toContain("/login")
    await expect(page.locator("main#main-content")).toBeVisible()
    // The marketing landing page is what "/" renders without a session, and it
    // has no dashboard shell at all.
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()
  })

  test("the mobile bottom navigation is exposed as a named landmark", async ({ page, context }) => {
    test.setTimeout(180_000)
    const fixtures = buildMockFixtures()
    await signIn(page, context, fixtures)

    // Below the lg breakpoint the bottom nav is the primary way to move around
    // the dashboard, so it has to be a distinguishable landmark rather than one
    // of several anonymous <nav> elements.
    const nav = page.getByRole("navigation", { name: "Mobile dashboard navigation" })
    await expect(nav).toBeAttached()
  })
})
