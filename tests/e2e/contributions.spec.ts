import { test, expect } from '@playwright/test'
import { createApiMocker } from '../helpers/api-mocks'

test.describe('Contributions Flow', () => {
  test.beforeEach(async ({ page }: { page: any }) => {
    const mocker = createApiMocker(page)
    await mocker.mockSession()
    await mocker.mockCirclesList()
  })

  test('should display contributions list with mocked API', async ({ page }: { page: any }) => {
    const mocker = createApiMocker(page)
    await mocker.mockContributions()

    // Navigate to contributions page
    await page.goto('/contributions')

    // Verify page title
    await expect(page.getByRole('heading', { name: /my contributions/i })).toBeVisible()

    // Verify summary cards
    await expect(page.getByText(/total contributed/i)).toBeVisible()
    await expect(page.getByText(/\$100\.00/)).toBeVisible()
    await expect(page.getByText(/average amount/i)).toBeVisible()
    await expect(page.getByText(/total count/i)).toBeVisible()
    await expect(page.getByText('1')).toBeVisible()

    // Verify contributions table
    await expect(page.getByText(/test savings circle/i)).toBeVisible()
    await expect(page.getByText('#1')).toBeVisible()
    await expect(page.getByText(/\$100\.00/)).toBeVisible()
    await expect(page.getByText(/on time/i)).toBeVisible()

    // Verify transaction link
    await expect(page.getByRole('link', { name: /abcd/i })).toBeVisible()
  })

  test('should filter contributions by circle', async ({ page }: { page: any }) => {
    const mocker = createApiMocker(page)
    await mocker.mockContributions()

    await page.goto('/contributions')

    // Select circle filter
    const circleSelect = page.getByLabel(/circle/i)
    await circleSelect.click()
    await page.getByRole('option', { name: /test savings circle/i }).click()

    // Should still show filtered results
    await expect(page.getByText(/test savings circle/i)).toBeVisible()
  })

  test('should search contributions', async ({ page }: { page: any }) => {
    const mocker = createApiMocker(page)
    await mocker.mockContributions()

    await page.goto('/contributions')

    // Use search input
    const searchInput = page.getByPlaceholder(/search contributions/i)
    await searchInput.fill('Test')

    // Should show search results
    await expect(page.getByText(/test savings circle/i)).toBeVisible()
  })

  test('should show empty state when no contributions', async ({ page }: { page: any }) => {
    const mocker = createApiMocker(page)
    
    // Mock empty contributions
    await page.route('**/api/contributions*', async (route: any) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          contributions: [],
          summary: {
            totalContributed: 0,
            average: 0,
            count: 0,
          },
          meta: {
            page: 1,
            totalPages: 1,
            total: 0,
          },
        }),
      })
    })

    await page.goto('/contributions')

    // Should show empty state
    await expect(page.getByText(/no contributions yet/i)).toBeVisible()
    await expect(page.getByText(/join a circle to get started/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /browse circles/i })).toBeVisible()
  })

  test('should show error state on API failure', async ({ page }: { page: any }) => {
    const mocker = createApiMocker(page)
    
    // Mock error response
    await page.route('**/api/contributions*', async (route: any) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      })
    })

    await page.goto('/contributions')

    // Should show error state
    await expect(page.getByText(/failed to load contributions/i)).toBeVisible()
  })

  test('should sort contributions', async ({ page }: { page: any }) => {
    const mocker = createApiMocker(page)
    await mocker.mockContributions()

    await page.goto('/contributions')

    // Select sort option
    const sortSelect = page.getByLabel(/sort by/i)
    await sortSelect.click()
    await page.getByRole('option', { name: /amount: high to low/i }).click()

    // Should still show results
    await expect(page.getByText(/test savings circle/i)).toBeVisible()
  })

  test('should paginate contributions', async ({ page }: { page: any }) => {
    const mocker = createApiMocker(page)
    
    // Mock paginated contributions
    await page.route('**/api/contributions*', async (route: any) => {
      const url = route.request().url()
      const pageParam = new URL(url).searchParams.get('page') || '1'
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          contributions: [
            {
              id: `contrib-${pageParam}`,
              circleId: 'circle-123',
              roundNumber: parseInt(pageParam),
              amount: 100,
              currency: 'USDC',
              status: 'confirmed',
              onTime: true,
              createdAt: new Date().toISOString(),
              txnHash: `hash-${pageParam}`,
            },
          ],
          summary: {
            totalContributed: 100,
            average: 100,
            count: 1,
          },
          meta: {
            page: parseInt(pageParam),
            totalPages: 2,
            total: 2,
          },
        }),
      })
    })

    await page.goto('/contributions')

    // Should show pagination controls
    await expect(page.getByRole('button', { name: /next/i })).toBeVisible()

    // Click next
    const nextButton = page.getByRole('button', { name: /next/i })
    await nextButton.click()

    // Should show page 2
    await expect(page.getByText(/page 2 of 2/i)).toBeVisible()
  })
})
