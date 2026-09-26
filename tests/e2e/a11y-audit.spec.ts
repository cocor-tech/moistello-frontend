import { test, expect } from '@playwright/test'

import { expectNoBlockingViolations } from '../a11y/axe-baseline'

/**
 * Accessibility gate for the public, unauthenticated routes.
 *
 * ## The protected routes moved out of this file
 *
 * This spec previously also "covered" /circles, /wallet and /settings — but
 * without seeding a session cookie. All three are in PROTECTED_PATHS in
 * src/middleware.ts, so the server redirected every one to /login and axe
 * scanned the login page three times over. The suite was green while proving
 * nothing about the routes it named.
 *
 * Those three now live in tests/a11y/dashboard-a11y.spec.ts, which seeds the
 * cookie, asserts it actually landed on the route before scanning, and gates on
 * serious/critical rather than on any violation at all. Keeping a copy of the
 * broken version here would mean two specs claiming the same coverage, one of
 * them lying.
 *
 * ## Severity gate
 *
 * Uses the shared baseline: fails on serious/critical, records the rest. The
 * previous `expect(violations).toEqual([])` also failed on minor and moderate
 * findings, which is stricter than the documented policy and would make the two
 * specs disagree about what "passing" means.
 */
test.describe('Public route accessibility (WCAG 2.2 AA)', () => {
  const PUBLIC_ROUTES = [
    { name: 'login', path: '/login', ready: /sign in|log in|welcome/i },
    { name: 'register', path: '/register', ready: /create|sign up|account/i },
    { name: 'developers', path: '/developers', ready: /developer|api/i },
    { name: 'upload', path: '/upload', ready: /admin login/i },
  ] as const

  for (const route of PUBLIC_ROUTES) {
    test(`${route.name} has no serious or critical violations`, async ({ page }, testInfo) => {
      await page.goto(route.path)

      // Guard against a silent redirect turning this into a scan of some other
      // page — the same class of bug that made the old protected-route tests
      // meaningless.
      await expect(page).toHaveURL(new RegExp(`${route.path.replace('/', '\\/')}$`))

      await expectNoBlockingViolations(page, route.path, testInfo)
    })
  }
})
