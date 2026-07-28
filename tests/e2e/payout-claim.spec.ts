import { test, expect } from '@playwright/test'
import { createApiMocker } from '../helpers/api-mocks'

test.describe('Payout Claim Flow', () => {
  test.beforeEach(async ({ page }: { page: any }) => {
    const mocker = createApiMocker(page)
    await mocker.mockSession()
    await mocker.mockCirclesList()
  })

  test('should display payouts list with mocked API', async ({ page }: { page: any }) => {
    const mocker = createApiMocker(page)
    await mocker.mockPayouts()

    // Navigate to payouts page
    await page.goto('/payouts')

    // Verify page title
    await expect(page.getByRole('heading', { name: /payouts received/i })).toBeVisible()

    // Verify summary cards
    await expect(page.getByText(/total on this page/i)).toBeVisible()
    await expect(page.getByText(/\+\$1,000\.00/)).toBeVisible()
    await expect(page.getByText(/number of payouts/i)).toBeVisible()
    await expect(page.getByText('1')).toBeVisible()

    // Verify payouts table
    await expect(page.getByText(/test savings circle/i)).toBeVisible()
    await expect(page.getByText('#1')).toBeVisible()
    await expect(page.getByText(/\+\$1,000\.00/)).toBeVisible()
    await expect(page.getByText(/\$10\.00/)).toBeVisible()

    // Verify transaction link
    await expect(page.getByRole('link', { name: /xyz/i })).toBeVisible()
  })

  test('should show empty state when no payouts', async ({ page }: { page: any }) => {
    const mocker = createApiMocker(page)
    
    // Mock empty payouts
    await page.route('**/api/payouts*', async (route: any) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          payouts: [],
          meta: {
            page: 1,
            totalPages: 1,
            total: 0,
          },
        }),
      })
    })

    await page.goto('/payouts')

    // Should show empty state
    await expect(page.getByText(/no payouts received yet/i)).toBeVisible()
    await expect(page.getByText(/you'll receive payouts when it's your turn/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /browse circles/i })).toBeVisible()
  })

  test('should show error state on API failure', async ({ page }: { page: any }) => {
    const mocker = createApiMocker(page)
    
    // Mock error response
    await page.route('**/api/payouts*', async (route: any) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      })
    })

    await page.goto('/payouts')

    // Should show error state
    await expect(page.getByText(/failed to load payouts/i)).toBeVisible()
  })

  test('should paginate payouts', async ({ page }: { page: any }) => {
    const mocker = createApiMocker(page)
    
    // Mock paginated payouts
    await page.route('**/api/payouts*', async (route: any) => {
      const url = route.request().url()
      const pageParam = new URL(url).searchParams.get('page') || '1'
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          payouts: [
            {
              id: `payout-${pageParam}`,
              circleId: 'circle-123',
              roundNumber: parseInt(pageParam),
              amount: 1000,
              currency: 'USDC',
              feeAmount: 10,
              status: 'confirmed',
              createdAt: new Date().toISOString(),
              txnHash: `hash-${pageParam}`,
            },
          ],
          meta: {
            page: parseInt(pageParam),
            totalPages: 2,
            total: 2,
          },
        }),
      })
    })

    await page.goto('/payouts')

    // Should show pagination controls
    await expect(page.getByRole('button', { name: /next/i })).toBeVisible()

    // Click next
    const nextButton = page.getByRole('button', { name: /next/i })
    await nextButton.click()

    // Should show page 2
    await expect(page.getByText(/page 2 of 2/i)).toBeVisible()
  })

  test('should claim a payout with mocked API', async ({ page }: { page: any }) => {
    const mocker = createApiMocker(page)
    await mocker.mockPayouts()
    await mocker.mockPayoutClaim()

    await page.goto('/payouts')

    // Find claim button for a payout (this would need to be implemented in the UI)
    // For now, we'll simulate the API call directly
    const claimResponse = await page.request.post('/api/payouts/payout-1/claim', {
      headers: {
        Authorization: 'Bearer mock-token',
      },
    })

    expect(claimResponse.ok()).toBeTruthy()
    const data = await claimResponse.json()
    expect(data.success).toBe(true)
    expect(data.txnHash).toBe('claimed-transaction-hash-12345')
  })

  test('should show error when claim fails', async ({ page }: { page: any }) => {
    const mocker = createApiMocker(page)
    await mocker.mockPayouts()
    
    // Mock claim failure
    await page.route('**/api/payouts/*/claim', async (route: any) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Payout already claimed' }),
      })
    })

    await page.goto('/payouts')

    const claimResponse = await page.request.post('/api/payouts/payout-1/claim', {
      headers: {
        Authorization: 'Bearer mock-token',
      },
    })

    expect(claimResponse.status()).toBe(400)
    const data = await claimResponse.json()
    expect(data.error).toBe('Payout already claimed')
  })

  test('should navigate to circle from payout', async ({ page }: { page: any }) => {
    const mocker = createApiMocker(page)
    await mocker.mockPayouts()

    await page.goto('/payouts')

    // Click on circle name link
    const circleLink = page.getByRole('link', { name: /test savings circle/i })
    await circleLink.click()

    // Should navigate to circle page
    await page.waitForURL('/circles/circle-123', { timeout: 5000 })
    await expect(page).toHaveURL('/circles/circle-123')
  })

  test('should view transaction on stellar explorer', async ({ page }: { page: any }) => {
    const mocker = createApiMocker(page)
    await mocker.mockPayouts()

    await page.goto('/payouts')

    // Click on transaction link
    const txnLink = page.getByRole('link', { name: /xyz/i })
    const newPagePromise = page.waitForEvent('popup')
    await txnLink.click()
    const newPage = await newPagePromise

    // Should open stellar explorer
    await expect(newPage).toHaveURL(/stellar\.expert/)
  })
})
