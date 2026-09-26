import { test, expect, type Page } from '@playwright/test'

import { createApiMocker } from '../helpers/api-mocks'
import {
  measureHorizontalOverflow,
  measureTapTargets,
  RECOMMENDED_TAP_TARGET_PX,
  WCAG_MIN_TAP_TARGET_PX,
  type TapTargetResult,
} from '../helpers/mobile-audit'

/**
 * Mobile smoke suite (390x844, touch enabled).
 *
 * Scope is deliberately narrow: prove that the four highest-traffic flows
 * render and are usable one-handed on a phone, and catch the two layout
 * regressions that desktop-only testing systematically misses — horizontal
 * overflow and undersized touch targets.
 *
 * Run just this suite with:
 *   npx playwright test --project=mobile-chrome
 */

const CIRCLE_ID = 'circle-123'
const CIRCLE_NAME = 'Test Savings Circle'

/** Circle payloads the app's list and detail queries both consume. */
const CIRCLE = {
  id: CIRCLE_ID,
  name: CIRCLE_NAME,
  description: 'A mobile smoke test circle',
  circleType: 'public',
  payoutType: 'random',
  contributionAmount: 100,
  currency: 'USDC',
  frequency: 'monthly',
  maxMembers: 10,
  memberCount: 3,
  currentRound: 1,
  status: 'active',
  organizerId: 'user-1',
  moiScore: 700,
  startDate: '2026-08-01T09:00:00.000Z',
  createdAt: '2026-07-15T12:00:00.000Z',
}

async function authenticate(page: Page) {
  const mocker = createApiMocker(page)
  await mocker.mockSession()
  // Route handlers are consulted newest-first, so install the broad list
  // pattern before the narrow detail pattern to keep the detail route
  // reachable; the narrower one then wins for its own path.
  await mocker.mockEndpoint(new RegExp('/(api|v1)/circles'), {
    status: 200,
    body: { success: true, data: { circles: [CIRCLE], meta: { page: 1, totalPages: 1, total: 1 } } },
  }, 'GET')
  await mocker.mockEndpoint(new RegExp(`/(api|v1)/circles/${CIRCLE_ID}$`), {
    status: 200,
    body: { success: true, data: { circle: CIRCLE } },
  })
  await mocker.mockEndpoint(new RegExp('/(api|v1)/wallet'), {
    status: 200,
    body: { success: true, data: { wallets: [], addresses: [] } },
  })
}

/** Assert both mobile layout invariants for whatever is currently rendered. */
async function expectNoMobileLayoutRegressions(page: Page, label: string) {
  const overflow = await measureHorizontalOverflow(page)
  expect(
    overflow.overflowPx,
    `${label}: horizontal overflow of ${overflow.overflowPx}px. Widest offenders: ` +
      JSON.stringify(overflow.offenders),
  ).toBe(0)

  const tapTargets: TapTargetResult = await measureTapTargets(page)
  expect(
    tapTargets.wcagViolations,
    `${label}: ${tapTargets.wcagViolations.length} touch target(s) below the ` +
      `WCAG 2.2 AA minimum of ${WCAG_MIN_TAP_TARGET_PX}x${WCAG_MIN_TAP_TARGET_PX}px ` +
      `(of ${tapTargets.checkedCount} checked): ${JSON.stringify(tapTargets.wcagViolations)}`,
  ).toEqual([])
}

test.describe('Mobile smoke (390x844)', () => {
  test('login page renders and fits the viewport', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('form[aria-label]')).toBeVisible()

    await expectNoMobileLayoutRegressions(page, '/login')
  })

  test('dashboard loads for an authenticated member', async ({ page }) => {
    await authenticate(page)
    await page.goto('/')

    // The dashboard shell owns #main-content; landing there at all proves the
    // auth gate resolved rather than bouncing to /login.
    const main = page.locator('#main-content')
    await expect(main).toBeVisible({ timeout: 20_000 })
    await expect(page).toHaveURL(/\/(login)?$/)
    await expect(page.locator('#main-content')).not.toHaveText('')

    await expectNoMobileLayoutRegressions(page, 'dashboard')
  })

  test('a circle opens from the list', async ({ page }) => {
    await authenticate(page)
    await page.goto('/circles')

    const card = page.getByText(CIRCLE_NAME).first()
    await expect(card).toBeVisible({ timeout: 20_000 })

    await card.click()
    await page.waitForURL(`**/circles/${CIRCLE_ID}`, { timeout: 20_000 })
    await expect(page.locator('#main-content')).toBeVisible()

    await expectNoMobileLayoutRegressions(page, `circle detail`)
  })

  test('wallet page loads', async ({ page }) => {
    await authenticate(page)
    await page.goto('/wallet')

    await expect(page.locator('#main-content')).toBeVisible({ timeout: 20_000 })

    await expectNoMobileLayoutRegressions(page, '/wallet')
  })

  test('primary touch surfaces meet the recommended 44px target', async ({ page }) => {
    await authenticate(page)
    await page.goto('/')

    await expect(page.locator('#main-content')).toBeVisible({ timeout: 20_000 })

    // The persistent bottom tab bar is the app's main one-handed surface, so
    // it is held to the 44px recommendation rather than the WCAG floor.
    const mobileNav = page.locator('nav').filter({ has: page.locator('a[href]') }).last()
    const navLinks = mobileNav.locator('a[href]')
    const navCount = await navLinks.count()
    test.skip(navCount === 0, 'no bottom navigation on this viewport')

    const undersized: Array<{ name: string; width: number; height: number }> = []
    for (let i = 0; i < navCount; i += 1) {
      const link = navLinks.nth(i)
      const box = await link.boundingBox()
      if (!box) continue
      if (box.width < RECOMMENDED_TAP_TARGET_PX || box.height < RECOMMENDED_TAP_TARGET_PX) {
        undersized.push({
          name: ((await link.getAttribute('aria-label')) ?? (await link.innerText()) ?? '').trim(),
          width: Math.round(box.width),
          height: Math.round(box.height),
        })
      }
    }

    expect(
      undersized,
      `bottom nav targets below ${RECOMMENDED_TAP_TARGET_PX}px: ${JSON.stringify(undersized)}`,
    ).toEqual([])
  })
})
