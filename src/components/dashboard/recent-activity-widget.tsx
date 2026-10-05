'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/api-client'
import Link from 'next/link'
import { ArrowUp, ArrowDown, DollarSign, CircleDot, UserPlus, Info } from 'lucide-react'
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

type ActivityItem = {
  id: string
  type: 'notification' | 'contribution' | 'payout'
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
      link: n.data && typeof n.data === 'object' && 'link' in n.data ? String(n.data.link) : undefined,
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
      link: `/circles/${c.circleId}`,
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
      link: `/circles/${p.circleId}`,
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
