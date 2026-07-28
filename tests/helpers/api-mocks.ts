import type { Page, Route } from '@playwright/test'

export interface MockResponse {
  status: number
  body: any
  headers?: Record<string, string>
}

export class ApiMocker {
  constructor(private page: Page) {}

  /**
   * Mock a specific API endpoint
   */
  async mockEndpoint(urlPattern: string | RegExp, response: MockResponse): Promise<void> {
    await this.page.route(urlPattern, (route: Route) => {
      route.fulfill({
        status: response.status,
        contentType: 'application/json',
        headers: response.headers,
        body: JSON.stringify(response.body),
      })
    })
  }

  /**
   * Mock multiple endpoints at once
   */
  async mockEndpoints(mocks: Record<string, MockResponse>): Promise<void> {
    for (const [pattern, response] of Object.entries(mocks)) {
      await this.mockEndpoint(pattern, response)
    }
  }

  /**
   * Mock authentication endpoints for registration
   */
  async mockRegistration(): Promise<void> {
    await this.mockEndpoints({
      '**/api/auth/register': {
        status: 200,
        body: { success: true },
      },
      '**/api/auth/register/verify': {
        status: 200,
        body: {
          token: 'mock-jwt-token',
          refreshToken: 'mock-refresh-token',
          user: {
            id: 'user-123',
            email: 'test@example.com',
            displayName: 'Test User',
            moiScore: 50,
          },
        },
      },
      '**/api/claim-name': {
        status: 200,
        body: { name: 'Test User' },
      },
      '**/api/users/me': {
        status: 200,
        body: {
          id: 'user-123',
          displayName: 'Test User',
          preferredLanguage: 'en',
        },
      },
    })
  }

  /**
   * Mock authentication endpoints for passkey login
   */
  async mockPasskeyLogin(): Promise<void> {
    await this.mockEndpoints({
      '**/api/auth/passkey/nonce': {
        status: 200,
        body: { nonce: 'mock-nonce-12345' },
      },
      '**/api/auth/passkey/verify': {
        status: 200,
        body: {
          token: 'mock-jwt-token',
          refreshToken: 'mock-refresh-token',
          user: {
            id: 'user-123',
            email: 'test@example.com',
            displayName: 'Test User',
            moiScore: 50,
          },
        },
      },
    })
  }

  /**
   * Mock wallet creation endpoint
   */
  async mockWalletCreation(): Promise<void> {
    await this.mockEndpoint('**/api/wallet/create', {
      status: 200,
      body: {
        publicKey: 'GABCD1234567890EFGHIJKLMNOPQRSTUVWXYZ',
        fundingStatus: 'funded',
        trustlineStatus: 'ready',
        usdcTrustline: true,
      },
    })
  }

  /**
   * Mock passkey linking endpoint
   */
  async mockPasskeyLink(): Promise<void> {
    await this.mockEndpoint('**/api/auth/passkey/link', {
      status: 200,
      body: { success: true },
    })
  }

  /**
   * Mock circle creation endpoint
   */
  async mockCircleCreation(): Promise<void> {
    await this.mockEndpoint('**/api/circles', {
      status: 200,
      body: {
        circle: {
          id: 'circle-123',
          name: 'Test Savings Circle',
          description: 'A test circle for E2E testing',
          circleType: 'public',
          payoutType: 'random',
          contributionAmount: 100,
          currency: 'USDC',
          frequency: 'monthly',
          maxMembers: 10,
          createdAt: new Date().toISOString(),
        },
      },
    })
  }

  /**
   * Mock circles list endpoint
   */
  async mockCirclesList(): Promise<void> {
    await this.mockEndpoint('**/api/circles*', {
      status: 200,
      body: {
        circles: [
          {
            id: 'circle-123',
            name: 'Test Savings Circle',
            description: 'A test circle for E2E testing',
            circleType: 'public',
            contributionAmount: 100,
            currency: 'USDC',
            maxMembers: 10,
          },
        ],
      },
    })
  }

  /**
   * Mock contributions endpoint
   */
  async mockContributions(): Promise<void> {
    await this.mockEndpoint('**/api/contributions*', {
      status: 200,
      body: {
        contributions: [
          {
            id: 'contrib-1',
            circleId: 'circle-123',
            roundNumber: 1,
            amount: 100,
            currency: 'USDC',
            status: 'confirmed',
            onTime: true,
            createdAt: new Date().toISOString(),
            txnHash: 'abcd1234567890efghijklmnopqrstuvwxyz',
          },
        ],
        summary: {
          totalContributed: 100,
          average: 100,
          count: 1,
        },
        meta: {
          page: 1,
          totalPages: 1,
          total: 1,
        },
      },
    })
  }

  /**
   * Mock payouts endpoint
   */
  async mockPayouts(): Promise<void> {
    await this.mockEndpoint('**/api/payouts*', {
      status: 200,
      body: {
        payouts: [
          {
            id: 'payout-1',
            circleId: 'circle-123',
            roundNumber: 1,
            amount: 1000,
            currency: 'USDC',
            feeAmount: 10,
            status: 'confirmed',
            createdAt: new Date().toISOString(),
            txnHash: 'xyz9876543210abcdefghijklmnopqrstuv',
          },
        ],
        meta: {
          page: 1,
          totalPages: 1,
          total: 1,
        },
      },
    })
  }

  /**
   * Mock payout claim endpoint
   */
  async mockPayoutClaim(): Promise<void> {
    await this.mockEndpoint('**/api/payouts/*/claim', {
      status: 200,
      body: {
        success: true,
        txnHash: 'claimed-transaction-hash-12345',
      },
    })
  }

  /**
   * Mock session check endpoint.
   *
   * Matches the real /api/auth/session GET handler which returns
   * { authenticated: true, token, expiresAt } so that the auth store's
   * rehydrateAccessToken() can restore the in-memory token.
   */
  async mockSession(): Promise<void> {
    await this.mockEndpoint('**/api/auth/session', {
      status: 200,
      body: {
        authenticated: true,
        token: 'mock-jwt-token',
        expiresAt: Date.now() + 3600000,
      },
    })
  }

  /**
   * Clear all mocks
   */
  async clearMocks(): Promise<void> {
    await this.page.unrouteAll()
  }
}

/**
 * Helper to create an API mocker instance
 */
export function createApiMocker(page: Page): ApiMocker {
  return new ApiMocker(page)
}
