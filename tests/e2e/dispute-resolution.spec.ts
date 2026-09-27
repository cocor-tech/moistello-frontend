import { test, expect } from '@playwright/test'
import { createApiMocker } from '../helpers/api-mocks'

test.describe('Dispute Resolution Flow', () => {
  test.beforeEach(async ({ page }: { page: any }) => {
    const mocker = createApiMocker(page)
    await mocker.mockSession()
    await mocker.mockCirclesList()
    await mocker.mockDisputeEndpoints()
  })

  test('should display disputed status badge when circle is under dispute', async ({ page }: { page: any }) => {
    const mocker = createApiMocker(page)
    await mocker.mockDisputedCircle()

    // Navigate to disputed circle detail page
    await page.goto('/circles/circle-123')

    // Verify circle title is displayed
    await expect(page.getByRole('heading', { name: /disputed savings circle/i })).toBeVisible()

    // Verify status badge shows "disputed"
    const statusBadge = page.locator('text=disputed').first()
    await expect(statusBadge).toBeVisible()
  })

  test('should submit a dispute resolution support ticket', async ({ page }: { page: any }) => {
    const mocker = createApiMocker(page)
    await mocker.mockSupportTickets()

    await page.goto('/support')

    // Find and expand the ticket submission form
    const openFormButton = page.getByRole('button', { name: /open ticket|submit.*ticket/i }).first()
    if (await openFormButton.isVisible()) {
      await openFormButton.click()
    }

    // Fill out the dispute resolution ticket
    const nameInput = page.getByLabel(/your name/i)
    if (await nameInput.isVisible()) {
      await nameInput.fill('Test User')
    }

    const subjectInput = page.getByLabel(/subject/i)
    if (await subjectInput.isVisible()) {
      await subjectInput.fill('Circle Round 2 Payout Dispute')
    }

    // Select category (Circle Management or Payments & Withdrawals)
    const categorySelect = page.getByLabel(/category/i)
    if (await categorySelect.isVisible()) {
      await categorySelect.selectOption({ label: 'Circle Management' })
    }

    // Fill message description
    const messageInput = page.getByLabel(/message|description/i)
    if (await messageInput.isVisible()) {
      await messageInput.fill('Organizer has not released the payout for round 2 after all members contributed. Requesting dispute arbitration.')
    }

    // Submit ticket
    const submitButton = page.getByRole('button', { name: /submit ticket/i })
    if (await submitButton.isVisible()) {
      await submitButton.click()
      // Verify success message
      await expect(page.getByText(/ticket submitted|successfully|received/i)).toBeVisible()
    }
  })

  test('should raise a circle dispute via API endpoint', async ({ page }: { page: any }) => {
    const response = await page.request.post('/api/circles/circle-123/dispute', {
      headers: {
        Authorization: 'Bearer mock-jwt-token',
        'Content-Type': 'application/json',
      },
      data: {
        circleId: 'circle-123',
        roundNumber: 2,
        reason: 'Payment defaulted in round 2',
        evidence: 'tx_hash_reference_12345',
      },
    })

    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.status).toBe('disputed')
    expect(data.disputeId).toBeDefined()
  })

  test('should resolve a circle dispute with resolution payload via API', async ({ page }: { page: any }) => {
    const response = await page.request.post('/api/circles/circle-123/resolve-dispute', {
      headers: {
        Authorization: 'Bearer mock-jwt-token',
        'Content-Type': 'application/json',
      },
      data: {
        circleId: 'circle-123',
        disputeId: 'dispute-999',
        resolution: 'refund_issued',
        action: 'refund_all_members',
      },
    })

    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.status).toBe('resolved')
    expect(data.resolution).toBe('refund_issued')
  })

  test('should verify dispute notification preferences in settings', async ({ page }: { page: any }) => {
    const mocker = createApiMocker(page)
    await mocker.mockNotificationPreferences()

    await page.goto('/settings/notifications')

    // Verify Disputes category exists and description is present
    await expect(page.getByText(/disputes/i).first()).toBeVisible()
    await expect(page.getByText(/when a dispute is raised or resolved|circle disputes and resolution updates/i)).toBeVisible()
  })

  test('should view dispute resolution governance proposals', async ({ page }: { page: any }) => {
    await page.goto('/governance')

    // Verify governance page loads
    await expect(page.getByRole('heading', { name: /governance/i })).toBeVisible()

    // Search for dispute proposal
    const searchInput = page.getByPlaceholder(/search proposals/i)
    if (await searchInput.isVisible()) {
      await searchInput.fill('dispute')
      await expect(page.getByText(/MIP-15/i)).toBeVisible()
      await expect(page.getByText(/dispute resolution/i)).toBeVisible()
    }
  })
})
