import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RecentActivityWidget, resolveActivityLink } from '../recent-activity-widget'
import * as apiClient from '@/lib/api-client'

describe('resolveActivityLink (#500)', () => {
  it('deep-links deposits and contributions to transaction detail view', () => {
    // Contribution item
    expect(
      resolveActivityLink({
        id: 'contrib-c123',
        type: 'contribution',
        circleId: 'circle-1',
      })
    ).toBe('/wallet/transactions/c123')

    // Explicit contribution with data
    expect(
      resolveActivityLink({
        id: 'c123',
        type: 'contribution',
        data: { contributionId: 'tx-contrib-99' },
      })
    ).toBe('/wallet/transactions/tx-contrib-99')

    // Deposit notification
    expect(
      resolveActivityLink({
        id: 'notif-1',
        type: 'notification',
        subType: 'deposit',
        data: { transactionId: 'tx-dep-456' },
      })
    ).toBe('/wallet/transactions/tx-dep-456')
  })

  it('deep-links transfers to transaction detail view', () => {
    expect(
      resolveActivityLink({
        id: 'notif-2',
        type: 'notification',
        subType: 'transfer',
        data: { transactionId: 'tx-trans-789' },
      })
    ).toBe('/wallet/transactions/tx-trans-789')

    expect(
      resolveActivityLink({
        id: 'transfer-t1',
        type: 'transfer',
      })
    ).toBe('/wallet/transactions/t1')
  })

  it('deep-links payouts to transaction detail view', () => {
    expect(
      resolveActivityLink({
        id: 'payout-p888',
        type: 'payout',
        circleId: 'circle-2',
      })
    ).toBe('/wallet/transactions/p888')

    expect(
      resolveActivityLink({
        id: 'notif-3',
        type: 'notification',
        subType: 'payout',
        data: { payoutId: 'payout-999' },
      })
    ).toBe('/wallet/transactions/payout-999')
  })

  it('links non-transaction items to their own relevant pages', () => {
    // Circle items link to circle page
    expect(
      resolveActivityLink({
        id: 'notif-4',
        type: 'notification',
        subType: 'circle_joined',
        data: { circleId: 'circle-alpha' },
      })
    ).toBe('/circles/circle-alpha')

    // Governance items link to governance / proposal page
    expect(
      resolveActivityLink({
        id: 'notif-5',
        type: 'notification',
        subType: 'governance',
        data: { proposalId: 'prop-12' },
      })
    ).toBe('/governance/prop-12')

    // Referral items link to referrals page
    expect(
      resolveActivityLink({
        id: 'notif-6',
        type: 'notification',
        subType: 'referral',
      })
    ).toBe('/referrals')

    // Reputation items link to reputation page
    expect(
      resolveActivityLink({
        id: 'notif-7',
        type: 'notification',
        subType: 'reputation',
      })
    ).toBe('/reputation')

    // System notifications link to explicit link or /notifications
    expect(
      resolveActivityLink({
        id: 'notif-8',
        type: 'notification',
        subType: 'system',
        data: { link: '/settings' },
      })
    ).toBe('/settings')

    expect(
      resolveActivityLink({
        id: 'notif-9',
        type: 'notification',
        subType: 'system',
      })
    ).toBe('/notifications')
  })
})

describe('RecentActivityWidget Component (#500)', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
    vi.restoreAllMocks()
  })

  it('renders activity items with deep-links to transactions and relevant pages', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url === '/api/notifications') {
        return {
          data: {
            notifications: [
              {
                id: 'n-circle',
                userId: 'u1',
                type: 'circle_joined',
                title: 'Joined Circle Alpha',
                isRead: true,
                channel: 'in_app' as const,
                createdAt: new Date().toISOString(),
                data: { circleId: 'circle-alpha' },
              },
              {
                id: 'n-dep',
                userId: 'u1',
                type: 'deposit',
                title: 'Deposit confirmed',
                isRead: false,
                channel: 'in_app' as const,
                createdAt: new Date().toISOString(),
                data: { transactionId: 'tx-dep-101' },
              },
            ],
          },
        }
      }
      if (url === '/api/contributions') {
        return {
          data: {
            contributions: [
              {
                id: 'contrib-42',
                circleId: 'circle-1',
                userId: 'u1',
                roundNumber: 1,
                amount: 100,
                status: 'completed' as const,
                onTime: true,
                createdAt: new Date().toISOString(),
              },
            ],
          },
        }
      }
      if (url === '/api/payouts') {
        return {
          data: {
            payouts: [
              {
                id: 'payout-77',
                circleId: 'circle-1',
                recipientId: 'u1',
                roundNumber: 2,
                amount: 500,
                payoutType: 'fixed' as const,
                createdAt: new Date().toISOString(),
              },
            ],
          },
        }
      }
      return { data: {} }
    })

    render(
      <QueryClientProvider client={queryClient}>
        <RecentActivityWidget />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument()
    })

    // Verify deposit transaction deep-link
    await waitFor(() => {
      const depositLink = screen.getAllByRole('link').find((link) =>
        link.getAttribute('href') === '/wallet/transactions/tx-dep-101'
      )
      expect(depositLink).toBeDefined()
    })

    // Verify contribution transaction deep-link
    const contribLink = screen.getAllByRole('link').find((link) =>
      link.getAttribute('href') === '/wallet/transactions/42'
    )
    expect(contribLink).toBeDefined()

    // Verify payout transaction deep-link
    const payoutLink = screen.getAllByRole('link').find((link) =>
      link.getAttribute('href') === '/wallet/transactions/77'
    )
    expect(payoutLink).toBeDefined()

    // Verify non-transaction circle link
    const circleLink = screen.getAllByRole('link').find((link) =>
      link.getAttribute('href') === '/circles/circle-alpha'
    )
    expect(circleLink).toBeDefined()
  })
})
