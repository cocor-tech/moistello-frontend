import type { BrowserContext, Page } from "@playwright/test"
import type { MockAppFixtures } from "../helpers/mock-app"

import { createMockCalls, installMockApi } from "../helpers/mock-app"

/**
 * Drive the real sign-in flow so the dashboard actually renders.
 *
 * ## Why this logs in instead of just seeding a cookie
 *
 * Seeding `moistello_token` is not sufficient, and the previous version of this
 * spec discovered that the hard way: the dashboard routes are gated by
 * `useRequireAuth` in `src/app/(dashboard)/client-layout.tsx`, which reads the
 * **client** auth store, not the cookie. The store is hydrated from localStorage
 * under an HMAC, so a bare cookie gets a 200 from middleware and then a blank
 * `<main>` — or, for /wallet and /settings, a redirect to /login from the
 * client. Either way axe scans nothing useful while the suite reports green.
 *
 * Going through the UI exercises the same path a real member takes and leaves
 * the store, the cookie and the rendered tree mutually consistent.
 *
 * The selectors are read off the live login page rather than copied from
 * tests/e2e.spec.ts, which still expects a "Password" tab button that the
 * current login page does not render.
 */
export async function signIn(page: Page, context: BrowserContext, fixtures: MockAppFixtures) {
  const calls = createMockCalls()
  await installMockApi(page, fixtures, calls)

  await page.goto("/login")
  await page.getByLabel("Email Address").fill("amina@example.com")
  await page.getByLabel("Password").fill("supersecret1")
  await page.getByRole("button", { name: "Sign In with Email" }).click()

  // The store has to settle before any protected route will render, and
  // /api/auth/session + the HMAC-key round trip are both in flight here.
  await page.waitForURL("/", { timeout: 60_000 })
  await expectDashboardShell(page)

  return calls
}

/**
 * Wait for the dashboard's own landmarks.
 *
 * Doubles as the anti-vacuity guard for every scan in the suite: if auth
 * regresses, this fails before axe runs rather than letting the scan quietly
 * measure a login page.
 */
export async function expectDashboardShell(page: Page) {
  await page.locator("main#main-content").waitFor({ state: "visible", timeout: 60_000 })
  // The floating bottom nav is rendered by the dashboard layout on every one of
  // these routes, so it is a reliable "we are past the auth gate" signal.
  await page
    .getByRole("navigation", { name: "Mobile dashboard navigation" })
    .waitFor({ state: "attached", timeout: 60_000 })
}
