'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/api-client'
import Link from 'next/link'
import { ArrowUp, ArrowDown, DollarSign, CircleDot, UserPlus, Info, ArrowLeftRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRelativeTime } from '@/lib/formatters'
import { useDateLocale } from '@/hooks/use-date-locale'
import { useTranslate } from '@/lib/locale/context'
import { cn } from '@/lib/cn'
import type { ApiResponse, Notification, Contribution, Payout } from '@/types'

const iconMap: Record<string, React.ReactNode> = {
  contribution: <ArrowUp className="h-4 w-4" />,
  contribution_received: <ArrowDown className="h-4 w-4" />,
  deposit: <ArrowDown className="h-4 w-4" />,
  deposit_completed: <ArrowDown className="h-4 w-4" />,
  transfer: <ArrowLeftRight className="h-4 w-4" />,
  transfer_sent: <ArrowUp className="h-4 w-4" />,
  transfer_received: <ArrowDown className="h-4 w-4" />,
  payout: <DollarSign className="h-4 w-4" />,
  payout_received: <DollarSign className="h-4 w-4" />,
  circle: <CircleDot className="h-4 w-4" />,
  circle_joined: <UserPlus className="h-4 w-4" />,
  circle_completed: <CircleDot className="h-4 w-4" />,
  system: <Info className="h-4 w-4" />,
  warning: <Info className="h-4 w-4" />,
  penalty: <Info className="h-4 w-4" />,
}

const gradientMap: Record<string, string> = {
  contribution: 'from-emerald-500/30 to-green-600/30',
  contribution_received: 'from-emerald-500/30 to-green-600/30',
  deposit: 'from-emerald-500/30 to-green-600/30',
  deposit_completed: 'from-emerald-500/30 to-green-600/30',
  transfer: 'from-blue-500/30 to-cyan-600/30',
  transfer_sent: 'from-blue-500/30 to-cyan-600/30',
  transfer_received: 'from-emerald-500/30 to-green-600/30',
  payout: 'from-aurora-indigo/30 to-aurora-violet/30',
  payout_received: 'from-aurora-indigo/30 to-aurora-violet/30',
  circle: 'from-aurora-violet/30 to-fuchsia-500/30',
  circle_joined: 'from-aurora-violet/30 to-fuchsia-500/30',
  circle_completed: 'from-aurora-violet/30 to-fuchsia-500/30',
  system: 'from-white/5 to-white/10',
  warning: 'from-red-500/30 to-amber-500/30',
  penalty: 'from-red-500/30 to-amber-500/30',
}

const iconColorMap: Record<string, string> = {
  contribution: 'text-emerald-400',
  contribution_received: 'text-emerald-400',
  deposit: 'text-emerald-400',
  deposit_completed: 'text-emerald-400',
  transfer: 'text-blue-400',
  transfer_sent: 'text-blue-400',
  transfer_received: 'text-emerald-400',
  payout: 'text-aurora-violet',
  payout_received: 'text-aurora-violet',
  circle: 'text-fuchsia-400',
  circle_joined: 'text-fuchsia-400',
  circle_completed: 'text-fuchsia-400',
  system: 'text-muted-foreground',
  warning: 'text-red-400',
  penalty: 'text-red-400',
}

const PAGE_SIZE = 5

export interface ActivityLinkSource {
  id: string
  type: string
  subType?: string
  data?: Record<string, unknown> | null
  circleId?: string
  transactionId?: string
  link?: string
}

/**
 * Resolves activity item deep-links:
 * - Transaction-related feed items (deposits, transfers, payouts) deep-link to /wallet/transactions/[id]
 * - Non-transaction feed items link to their respective pages (circle, governance, referrals, etc.)
 */
export function resolveActivityLink(item: ActivityLinkSource): string | undefined {
  const type = (item.subType || item.type || '').toLowerCase()
  const data = item.data ?? {}

  // 1. Transaction-related: Deposits, Contributions, Transfers, Payouts
  const txId = (
    data.transactionId ??
    data.txId ??
    data.txnId ??
    item.transactionId ??
    (type.includes('contribution') ? data.contributionId : undefined) ??
    (type.includes('payout') ? data.payoutId : undefined) ??
    (type.includes('transfer') ? data.transferId : undefined) ??
    (type.includes('deposit') ? data.depositId : undefined)
  )

  // Deposits / Contributions deep-link to transaction detail view
  if (
    type === 'contribution' ||
    type === 'contribution_received' ||
    type === 'deposit' ||
    type === 'deposit_completed'
  ) {
    const resolvedId = txId || item.id.replace(/^(contrib|deposit)-/, '')
    return `/wallet/transactions/${resolvedId}`
  }

  // Transfers deep-link to transaction detail view
  if (
    type === 'transfer' ||
    type === 'transfer_sent' ||
    type === 'transfer_received'
  ) {
    const resolvedId = txId || item.id.replace(/^transfer-/, '')
    return `/wallet/transactions/${resolvedId}`
  }

  // Payouts deep-link to transaction detail view
  if (
    type === 'payout' ||
    type === 'payout_received'
  ) {
    const resolvedId = txId || item.id.replace(/^payout-/, '')
    return `/wallet/transactions/${resolvedId}`
  }

  // If item has an explicit transaction identifier, deep-link to transaction detail view
  if (txId) {
    return `/wallet/transactions/${txId}`
  }

  // 2. Non-transaction items link to their own relevant pages
  // Circle-related
  if (type.startsWith('circle') || data.circleId || item.circleId) {
    const cId = data.circleId || item.circleId
    return cId ? `/circles/${cId}` : '/circles'
  }

  // Governance-related
  if (type.startsWith('governance') || type.startsWith('proposal') || data.proposalId) {
    const pId = data.proposalId
    return pId ? `/governance/${pId}` : '/governance'
  }

  // Referral-related
  if (type.startsWith('referral') || data.referralId) {
    return '/referrals'
  }

  // Reputation / Warning / Penalty
  if (type === 'reputation' || type === 'penalty' || type === 'warning') {
    return data.circleId ? `/circles/${data.circleId}` : '/reputation'
  }

  // Explicit link if present
  if (data.link && typeof data.link === 'string') {
    return data.link
  }
  if (item.link) {
    return item.link
  }

  // Fallback for notifications
  if (item.type === 'notification') {
    return '/notifications'
  }

  return undefined
}

export type ActivityItem = {
  id: string
  type: 'notification' | 'contribution' | 'payout' | 'deposit' | 'transfer'
  title: string
  description?: string
  timestamp: string
  link?: string
  icon: React.ReactNode
  gradient: string
  iconColor: string
}

export function RecentActivityWidget() {
  const { t } = useTranslate()
  const { dateFnsLocale } = useDateLocale()
  const [showCount, setShowCount] = useState(PAGE_SIZE)

  const { data: notifications = [], isLoading: notificationsLoading } = useQuery({
    queryKey: ['dashboard', 'notifications'],
    queryFn: async () => {
      const res = await get<ApiResponse<{ notifications: Notification[] }>>('/api/notifications')
      return res.data?.notifications || []
    },
  })

  const { data: contributions = [], isLoading: contributionsLoading } = useQuery({
    queryKey: ['dashboard', 'contributions'],
    queryFn: async () => {
      const res = await get<ApiResponse<{ contributions: Contribution[] }>>('/api/contributions')
      return res.data?.contributions || []
    },
  })

  const { data: payouts = [], isLoading: payoutsLoading } = useQuery({
    queryKey: ['dashboard', 'payouts'],
    queryFn: async () => {
      const res = await get<ApiResponse<{ payouts: Payout[] }>>('/api/payouts')
      return res.data?.payouts || []
    },
  })

  const isLoading = notificationsLoading || contributionsLoading || payoutsLoading

  const activities: ActivityItem[] = [
    ...notifications.map((n) => ({
      id: `notif-${n.id}`,
      type: 'notification' as const,
      title: n.title,
      description: n.body ?? undefined,
      timestamp: n.sentAt || n.createdAt,
      link: resolveActivityLink({
        id: n.id,
        type: 'notification',
        subType: n.type,
        data: n.data,
      }),
      icon: iconMap[n.type] || <Info className="h-4 w-4" />,
      gradient: gradientMap[n.type] || gradientMap.system,
      iconColor: iconColorMap[n.type] || iconColorMap.system,
    })),
    ...contributions.map((c) => ({
      id: `contrib-${c.id}`,
      type: 'contribution' as const,
      title: `Contribution: ${c.amount} USDC`,
      description: `Round ${c.roundNumber}`,
      timestamp: c.createdAt,
      link: resolveActivityLink({
        id: c.id,
        type: 'contribution',
        circleId: c.circleId,
        data: { txnHash: c.txnHash },
      }),
      icon: <ArrowUp className="h-4 w-4" />,
      gradient: gradientMap.contribution,
      iconColor: iconColorMap.contribution,
    })),
    ...payouts.map((p) => ({
      id: `payout-${p.id}`,
      type: 'payout' as const,
      title: `Payout: ${p.amount} USDC`,
      description: `Round ${p.roundNumber}`,
      timestamp: p.createdAt,
      link: resolveActivityLink({
        id: p.id,
        type: 'payout',
        circleId: p.circleId,
        data: { txnHash: p.txnHash },
      }),
      icon: <DollarSign className="h-4 w-4" />,
      gradient: gradientMap.payout,
      iconColor: iconColorMap.payout,
    })),
  ]

  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const visible = activities.slice(0, showCount)
  const hasMore = activities.length > showCount

  return (
    <div className="glass-premium rounded-2xl p-5">
      <h3 className="font-heading text-lg font-bold text-foreground mb-4">
        Recent Activity
      </h3>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">No recent activity.</p>
      ) : (
        <div className="space-y-3">
          {visible.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]"
            >
              <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm', item.gradient)}>
                <span className={item.iconColor}>{item.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {item.title}
                </p>
                {item.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {item.description}
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground/60 font-mono mt-0.5">
                  {formatRelativeTime(item.timestamp, dateFnsLocale)}
                </p>
              </div>
              {item.link && (
                <Link href={item.link}>
                  <Button variant="ghost" size="xs" className="shrink-0">
                    {t('common.viewDetails')} →
                  </Button>
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCount((c) => c + PAGE_SIZE)}
            disabled={isLoading}
          >
            Show more
          </Button>
        </div>
      )}
    </div>
  )
}
