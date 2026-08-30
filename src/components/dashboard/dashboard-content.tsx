'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/api-client'
import { PageHeader } from '@/components/shared/page-header'
import { SavingsGrowthChart } from '@/components/dashboard/charts/savings-growth-chart'
import { ContributionHistoryChart } from '@/components/dashboard/charts/contribution-history-chart'
import { PayoutTimelineChart } from '@/components/dashboard/charts/payout-timeline-chart'
import { UpcomingPayoutsWidget } from '@/components/dashboard/upcoming-payouts-widget'
import type { Circle, Contribution, Payout } from '@/types'

export function DashboardContent() {
  const [contributionPeriod, setContributionPeriod] = useState<'week' | 'month' | 'all'>('month')

  const circlesQuery = useQuery({
    queryKey: ['dashboard', 'circles'],
    queryFn: async () => {
      const res = await get<{ circles: Circle[] }>('/api/circles')
      return res.data?.circles || []
    },
  })

  const contributionsQuery = useQuery({
    queryKey: ['dashboard', 'contributions'],
    queryFn: async () => {
      const res = await get<{ contributions: Contribution[] }>('/api/contributions')
      return res.data?.contributions || []
    },
  })

  const payoutsQuery = useQuery({
    queryKey: ['dashboard', 'payouts'],
    queryFn: async () => {
      const res = await get<{ payouts: Payout[] }>('/api/payouts')
      return res.data?.payouts || []
    },
  })

  const circles = circlesQuery.data || []
  const contributions = contributionsQuery.data || []
  const payouts = payoutsQuery.data || []

  const mockSavingsGoals = circles.map((c) => ({
    id: c.id,
    name: c.name,
    targetAmount: c.contributionAmount * c.maxMembers,
    currentAmount: (c.contributionAmount || 0) * (c.currentRound || 1),
    targetDate: null,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your savings circles, contributions, and upcoming payouts"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SavingsGrowthChart goals={mockSavingsGoals} />
            <UpcomingPayoutsWidget
              payouts={payouts}
              circles={circles}
              isLoading={payoutsQuery.isLoading || circlesQuery.isLoading}
              isError={payoutsQuery.isError || circlesQuery.isError}
            />
          </div>

          <ContributionHistoryChart
            contributions={contributions}
            period={contributionPeriod}
          />
        </div>

        <div className="space-y-6">
          <PayoutTimelineChart payouts={payouts} />
        </div>
      </div>
    </div>
  )
}
