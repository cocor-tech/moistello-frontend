import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  PendingActionDigest,
  type PendingActionItem,
} from '../pending-action-digest'

describe('PendingActionDigest', () => {
  const mockActions: PendingActionItem[] = [
    {
      id: 'act-1',
      type: 'missed_round',
      title: 'Contribution overdue for Round 3',
      description: 'Your monthly 100 USDC deposit was missed. Pay now to avoid penalty.',
      actionLabel: 'Pay Round',
      href: '/circles/c-123/contribute',
      circleName: 'Stellar Alpha Circle',
      amount: 100,
      currency: 'USDC',
    },
    {
      id: 'act-2',
      type: 'unclaimed_payout',
      title: '500 USDC ready for claim',
      description: 'Round 4 payout was disbursed. Claim funds to your wallet.',
      actionLabel: 'Claim Payout',
      href: '/payouts',
      circleName: 'Builders Pool',
      amount: 500,
      currency: 'USDC',
    },
    {
      id: 'act-3',
      type: 'expiring_invite',
      title: 'Invitation expires in 12 hours',
      description: 'You were invited to join Lagos Community Pool.',
      actionLabel: 'Review Invite',
      href: '/invites/inv-99',
      circleName: 'Lagos Community Pool',
    },
  ]

  it('renders loading skeleton when isLoading is true', () => {
    render(<PendingActionDigest isLoading={true} />)
    expect(screen.getByTestId('digest-skeleton')).toBeDefined()
    expect(screen.queryByTestId('digest-empty')).toBeNull()
  })

  it('renders empty state when no pending actions exist', () => {
    render(<PendingActionDigest initialActions={[]} />)
    expect(screen.getByTestId('digest-empty')).toBeDefined()
    expect(screen.getByText('All caught up!')).toBeDefined()
    expect(
      screen.getByText('No missed rounds, unclaimed payouts, or expiring invitations.')
    ).toBeDefined()
  })

  it('renders all pending action items with badges, titles, and deep links', () => {
    render(<PendingActionDigest initialActions={mockActions} />)

    expect(screen.getByText('3 pending')).toBeDefined()
    expect(screen.getByText('Missed Round')).toBeDefined()
    expect(screen.getByText('Unclaimed Payout')).toBeDefined()
    expect(screen.getByText('Expiring Invite')).toBeDefined()

    expect(screen.getByText('Contribution overdue for Round 3')).toBeDefined()
    expect(screen.getByText('500 USDC ready for claim')).toBeDefined()
    expect(screen.getByText('Invitation expires in 12 hours')).toBeDefined()

    const links = screen.getAllByRole('link')
    expect(links.some((l) => l.getAttribute('href') === '/circles/c-123/contribute')).toBe(true)
    expect(links.some((l) => l.getAttribute('href') === '/payouts')).toBe(true)
    expect(links.some((l) => l.getAttribute('href') === '/invites/inv-99')).toBe(true)
  })

  it('correctly resolves and removes an action when marked as resolved', async () => {
    const onResolveMock = vi.fn()
    render(<PendingActionDigest initialActions={mockActions} onResolve={onResolveMock} />)

    const resolveBtn = screen.getByLabelText('Mark Contribution overdue for Round 3 as resolved')
    fireEvent.click(resolveBtn)

    expect(onResolveMock).toHaveBeenCalledWith('act-1')
    expect(screen.getByText('2 pending')).toBeDefined()
  })

  it('displays empty state once all items are resolved', () => {
    const singleAction: PendingActionItem[] = [mockActions[0]]
    render(<PendingActionDigest initialActions={singleAction} />)

    expect(screen.queryByTestId('digest-empty')).toBeNull()
    const resolveBtn = screen.getByLabelText('Mark Contribution overdue for Round 3 as resolved')
    fireEvent.click(resolveBtn)

    expect(screen.getByTestId('digest-empty')).toBeDefined()
    expect(screen.getByText('All caught up!')).toBeDefined()
  })
})
