import { test, expect } from '@playwright/test'
import { createApiMocker } from '../helpers/api-mocks'

test.describe('Passkey Login Flow', () => {
  test('should login with passkey using mocked API', async ({ page, context }: { page: any; context: any }) => {
    const mocker = createApiMocker(page)

    // Mock passkey authentication endpoints
    await mocker.mockPasskeyLogin()
    await mocker.mockSession()

    // Navigate to login page
    await page.goto('/login')

    // Switch to passkey tab
    const passkeyTab = page.getByRole('button', { name: /passkey/i })
    await passkeyTab.click()

    // Verify passkey UI is shown
    await expect(page.getByText(/use your device's biometric/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in with passkey/i })).toBeVisible()

    // Mock WebAuthn navigator.credentials for passkey
    await context.addInitScript(() => {
      // Mock passkey credential
      const mockCredential = {
        id: 'mock-credential-id-12345',
        type: 'public-key' as const,
        rawId: new Uint8Array([1, 2, 3, 4, 5]),
        response: {
          clientDataJSON: new Uint8Array([10, 20, 30]),
          authenticatorData: new Uint8Array([40, 50, 60]),
          signature: new Uint8Array([70, 80, 90]),
          userHandle: new Uint8Array([100, 110, 120]),
        },
        getClientExtensionResults: () => ({}),
      }

      // Mock navigator.credentials.get
      Object.defineProperty(window.navigator, 'credentials', {
        value: {
          get: async () => mockCredential,
          create: async () => mockCredential,
        },
        writable: true,
      })

      // Store mock credential for adapter to find
      localStorage.setItem(
        'moistello_passkey_credential',
        JSON.stringify({ credentialId: 'mock-credential-id-12345' })
      )
    })

    // Click sign in with passkey
    const signInButton = page.getByRole('button', { name: /sign in with passkey/i })
    await signInButton.click()

    // Should redirect to home/dashboard after successful login
    await page.waitForURL('/', { timeout: 5000 })
    await expect(page).toHaveURL('/')
  })

  test('should show error when passkey is not available', async ({ page }: { page: any }) => {
    const mocker = createApiMocker(page)

    // Mock to simulate passkey not available
    await page.route('**/api/auth/passkey/nonce', async (route: any) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Passkey not available' }),
      })
    })

    await page.goto('/login')

    const passkeyTab = page.getByRole('button', { name: /passkey/i })
    await passkeyTab.click()

    const signInButton = page.getByRole('button', { name: /sign in with passkey/i })
    await signInButton.click()

    // Should show error message
    await expect(page.getByText(/passkey not available/i)).toBeVisible()
  })

  test('should switch between login methods', async ({ page }: { page: any }) => {
    await page.goto('/login')

    // Default should be wallet tab
    await expect(page.getByText(/wallet/i)).toBeVisible()

    // Switch to password
    const passwordTab = page.getByRole('button', { name: /password/i })
    await passwordTab.click()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()

    // Switch to passkey
    const passkeyTab = page.getByRole('button', { name: /passkey/i })
    await passkeyTab.click()
    await expect(page.getByText(/use your device's biometric/i)).toBeVisible()

    // Switch back to wallet
    const walletTab = page.getByRole('button', { name: /wallet/i })
    await walletTab.click()
    await expect(page.getByText(/wallet/i)).toBeVisible()
  })

  test('should redirect authenticated users away from login', async ({ page }: { page: any }) => {
    const mocker = createApiMocker(page)
    await mocker.mockSession()

    await page.goto('/login')

    // Should redirect to home
    await page.waitForURL('/', { timeout: 5000 })
    await expect(page).toHaveURL('/')
  })
})
