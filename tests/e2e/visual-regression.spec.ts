import { test, expect } from '@playwright/test'
import { createApiMocker } from '../helpers/api-mocks'

test.describe('Visual Regression - Critical Flows', () => {
  test.beforeEach(async ({ page }: { page: any }) => {
    const mocker = createApiMocker(page)
    await mocker.mockSession()
    await mocker.mockCirclesList()
    await mocker.mockContributions()
    await mocker.mockPayouts()
  })

  test('visual regression: registration flow layout', async ({ page }: { page: any }, testInfo: any) => {
    await page.goto('/register')
    await page.waitForLoadState('domcontentloaded')
    
    // Ensure form is rendered
    const heading = page.locator('h1, h2').first()
    await expect(heading).toBeVisible()

    // Capture visual snapshot
    const screenshot = await page.screenshot({ fullPage: false, animations: 'disabled' })
    expect(screenshot).toBeDefined()
    expect(screenshot.byteLength).toBeGreaterThan(5000)

    await testInfo.attach('registration-visual-layout', {
      body: screenshot,
      contentType: 'image/png',
    })
  })

  test('visual regression: login flow across wallet, password, and passkey', async ({ page }: { page: any }, testInfo: any) => {
    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')

    // Default wallet view
    await expect(page.getByText(/wallet/i).first()).toBeVisible()
    const walletScreenshot = await page.screenshot({ animations: 'disabled' })
    expect(walletScreenshot.byteLength).toBeGreaterThan(5000)
    await testInfo.attach('login-wallet-tab', {
      body: walletScreenshot,
      contentType: 'image/png',
    })

    // Password tab view
    const passwordTab = page.getByRole('button', { name: /password/i })
    if (await passwordTab.isVisible()) {
      await passwordTab.click()
      await expect(page.locator('input[type="email"]')).toBeVisible()
      const passwordScreenshot = await page.screenshot({ animations: 'disabled' })
      expect(passwordScreenshot.byteLength).toBeGreaterThan(5000)
      await testInfo.attach('login-password-tab', {
        body: passwordScreenshot,
        contentType: 'image/png',
      })
    }

    // Passkey tab view
    const passkeyTab = page.getByRole('button', { name: /passkey/i })
    if (await passkeyTab.isVisible()) {
      await passkeyTab.click()
      await expect(page.getByRole('button', { name: /sign in with passkey/i })).toBeVisible()
      const passkeyScreenshot = await page.screenshot({ animations: 'disabled' })
      expect(passkeyScreenshot.byteLength).toBeGreaterThan(5000)
      await testInfo.attach('login-passkey-tab', {
        body: passkeyScreenshot,
        contentType: 'image/png',
      })
    }
  })

  test('visual regression: circle creation wizard step 1', async ({ page }: { page: any }, testInfo: any) => {
    const mocker = createApiMocker(page)
    await mocker.mockCircleCreation()

    await page.goto('/circles/create')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('heading', { name: /create circle/i })).toBeVisible()

    const stepScreenshot = await page.screenshot({ animations: 'disabled' })
    expect(stepScreenshot.byteLength).toBeGreaterThan(5000)
    await testInfo.attach('circle-creation-wizard-step1', {
      body: stepScreenshot,
      contentType: 'image/png',
    })
  })

  test('visual regression: contributions list and summary cards', async ({ page }: { page: any }, testInfo: any) => {
    await page.goto('/contributions')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('heading', { name: /my contributions/i })).toBeVisible()

    const contribScreenshot = await page.screenshot({ animations: 'disabled' })
    expect(contribScreenshot.byteLength).toBeGreaterThan(5000)
    await testInfo.attach('contributions-page-layout', {
      body: contribScreenshot,
      contentType: 'image/png',
    })
  })

  test('visual regression: payouts received list and metrics', async ({ page }: { page: any }, testInfo: any) => {
    await page.goto('/payouts')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('heading', { name: /payouts received/i })).toBeVisible()

    const payoutsScreenshot = await page.screenshot({ animations: 'disabled' })
    expect(payoutsScreenshot.byteLength).toBeGreaterThan(5000)
    await testInfo.attach('payouts-page-layout', {
      body: payoutsScreenshot,
      contentType: 'image/png',
    })
  })

  test('visual regression: disputed circle detail and status badge', async ({ page }: { page: any }, testInfo: any) => {
    const mocker = createApiMocker(page)
    await mocker.mockDisputedCircle()

    await page.goto('/circles/circle-123')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('heading', { name: /disputed savings circle/i })).toBeVisible()

    const disputeScreenshot = await page.screenshot({ animations: 'disabled' })
    expect(disputeScreenshot.byteLength).toBeGreaterThan(5000)
    await testInfo.attach('disputed-circle-layout', {
      body: disputeScreenshot,
      contentType: 'image/png',
    })
  })
})
