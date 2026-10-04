import { test, expect } from '@playwright/test'
import { createApiMocker } from '../helpers/api-mocks'

/**
 * 404 handling for unknown nested dashboard paths (#471).
 *
 * The acceptance criterion is explicit: an unknown nested path must show the 404
 * UI *and* return HTTP 404, not 200. Both halves are asserted here, because a
 * boundary that renders the right copy while still answering 200 would pass a
 * screenshot test and fail the requirement.
 */
test.describe('Nested not-found routing', () => {
  test.beforeEach(async ({ page }) => {
    const mocker = createApiMocker(page)
    await mocker.mockSession()
  })

  test('unknown nested path returns HTTP 404, not 200', async ({ page }) => {
    const response = await page.goto('/circles/does-not-exist/also-not-a-page')

    expect(response).not.toBeNull()
    expect(response!.status()).toBe(404)
  })

  test('unknown nested path under an existing dynamic segment returns 404', async ({ page }) => {
    const response = await page.goto('/governance/not-a-real-proposal')

    expect(response).not.toBeNull()
    expect(response!.status()).toBe(404)
  })

  test('unknown path under settings returns 404', async ({ page }) => {
    const response = await page.goto('/settings/this-section-does-not-exist')

    expect(response).not.toBeNull()
    expect(response!.status()).toBe(404)
  })

  test('shows the 404 UI with the code visible on screen', async ({ page }) => {
    await page.goto('/circles/nope/nope')

    await expect(page.getByRole('heading', { name: /404/ })).toBeVisible()
  })

  test('preserves the dashboard shell instead of replacing it with a full-screen page', async ({ page }) => {
    await page.goto('/circles/nope/nope')

    // The dashboard layout survives because the not-found boundary lives inside
    // the (dashboard) route group. A full-bleed root 404 would drop all of this.
    await expect(page.getByRole('link', { name: /dashboard/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /browse circles/i })).toBeVisible()
  })

  test('recovery navigation links point at real destinations', async ({ page }) => {
    await page.goto('/circles/nope/nope')

    const dashboard = page.getByRole('link', { name: /dashboard/i }).first()
    await expect(dashboard).toHaveAttribute('href', '/')

    const circles = page.getByRole('link', { name: /browse circles/i })
    await expect(circles).toHaveAttribute('href', '/circles')
  })

  test('the recovery links actually resolve', async ({ page }) => {
    await page.goto('/circles/nope/nope')

    await page.getByRole('link', { name: /dashboard/i }).first().click()
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('a known nested path is not swallowed by the boundary', async ({ page }) => {
    const mocker = createApiMocker(page)
    await mocker.mockCirclesList()

    const response = await page.goto('/circles')

    expect(response).not.toBeNull()
    expect(response!.status()).toBe(200)
    await expect(page.getByRole('heading', { name: /404/ })).toHaveCount(0)
  })
})
