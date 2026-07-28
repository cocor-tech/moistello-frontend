import { test, expect } from '@playwright/test'
import { createApiMocker } from '../helpers/api-mocks'

test.describe('Circle Creation Flow', () => {
  test.beforeEach(async ({ page }: { page: any }) => {
    const mocker = createApiMocker(page)
    await mocker.mockSession()
  })

  test('should create a circle through the wizard with mocked API', async ({ page }: { page: any }) => {
    const mocker = createApiMocker(page)
    await mocker.mockCircleCreation()
    await mocker.mockCirclesList()

    // Navigate to circle creation page
    await page.goto('/circles/create')

    // Verify page title
    await expect(page.getByRole('heading', { name: /create circle/i })).toBeVisible()

    // Step 1: Details
    await page.fill('input[name="name"]', 'Test Savings Circle')
    await page.fill('textarea[name="description"]', 'A test circle for E2E testing')
    
    // Set max members
    const maxMembersInput = page.getByLabel(/max members/i)
    await maxMembersInput.fill('10')

    const nextButton = page.getByRole('button', { name: /next/i })
    await nextButton.click()

    // Step 2: Financials
    await expect(page.getByText(/contribution amount/i)).toBeVisible()
    
    const contributionInput = page.getByLabel(/contribution amount/i)
    await contributionInput.fill('100')

    const nextButton2 = page.getByRole('button', { name: /next/i })
    await nextButton2.click()

    // Step 3: Payout
    await expect(page.getByText(/payout type/i)).toBeVisible()
    
    const nextButton3 = page.getByRole('button', { name: /next/i })
    await nextButton3.click()

    // Step 4: Review
    await expect(page.getByText(/review/i)).toBeVisible()
    await expect(page.getByText('Test Savings Circle')).toBeVisible()
    await expect(page.getByText('100 USDC')).toBeVisible()

    const createButton = page.getByRole('button', { name: /create circle/i })
    await createButton.click()

    // Should redirect to circle page after creation
    await page.waitForURL('/circles/circle-123', { timeout: 5000 })
    await expect(page).toHaveURL('/circles/circle-123')
  })

  test('should show validation error for short circle name', async ({ page }: { page: any }) => {
    await page.goto('/circles/create')

    await page.fill('input[name="name"]', 'AB')
    
    const nextButton = page.getByRole('button', { name: /next/i })
    await nextButton.click()

    // Should show validation error
    await expect(page.getByText(/name must be at least 3 characters/i)).toBeVisible()
  })

  test('should show validation error for insufficient max members', async ({ page }: { page: any }) => {
    await page.goto('/circles/create')

    await page.fill('input[name="name"]', 'Test Circle')
    
    const maxMembersInput = page.getByLabel(/max members/i)
    await maxMembersInput.fill('1')

    const nextButton = page.getByRole('button', { name: /next/i })
    await nextButton.click()

    // Should show validation error
    await expect(page.getByText(/must have at least 2 members/i)).toBeVisible()
  })

  test('should show validation error for zero contribution amount', async ({ page }: { page: any }) => {
    await page.goto('/circles/create')

    // Complete step 1
    await page.fill('input[name="name"]', 'Test Circle')
    await page.getByLabel(/max members/i).fill('10')
    
    const nextButton = page.getByRole('button', { name: /next/i })
    await nextButton.click()

    // Step 2: Set invalid contribution
    const contributionInput = page.getByLabel(/contribution amount/i)
    await contributionInput.fill('0')

    const nextButton2 = page.getByRole('button', { name: /next/i })
    await nextButton2.click()

    // Should show validation error
    await expect(page.getByText(/contribution must be positive/i)).toBeVisible()
  })

  test('should navigate back through wizard steps', async ({ page }: { page: any }) => {
    await page.goto('/circles/create')

    // Step 1
    await page.fill('input[name="name"]', 'Test Circle')
    await page.getByLabel(/max members/i).fill('10')
    
    const nextButton = page.getByRole('button', { name: /next/i })
    await nextButton.click()

    // Step 2
    await page.getByLabel(/contribution amount/i).fill('100')
    
    const nextButton2 = page.getByRole('button', { name: /next/i })
    await nextButton2.click()

    // Step 3
    const backButton = page.getByRole('button', { name: /previous/i })
    await backButton.click()

    // Should be back on step 2
    await expect(page.getByLabel(/contribution amount/i)).toBeVisible()

    // Back to step 1
    const backButton2 = page.getByRole('button', { name: /previous/i })
    await backButton2.click()

    await expect(page.locator('input[name="name"]')).toBeVisible()
    await expect(page.locator('input[name="name"]')).toHaveValue('Test Circle')
  })

  test('should show error on API failure during creation', async ({ page }: { page: any }) => {
    const mocker = createApiMocker(page)
    
    // Mock failure response
    await page.route('**/api/circles', async (route: any) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to create circle' }),
      })
    })

    await page.goto('/circles/create')

    // Complete all steps
    await page.fill('input[name="name"]', 'Test Circle')
    await page.getByLabel(/max members/i).fill('10')
    await page.getByRole('button', { name: /next/i }).click()
    
    await page.getByLabel(/contribution amount/i).fill('100')
    await page.getByRole('button', { name: /next/i }).click()
    
    await page.getByRole('button', { name: /next/i }).click()

    const createButton = page.getByRole('button', { name: /create circle/i })
    await createButton.click()

    // Should show error message
    await expect(page.getByText(/failed to create circle/i)).toBeVisible()
  })
})
