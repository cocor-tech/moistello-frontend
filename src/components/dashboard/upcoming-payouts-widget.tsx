'use client'

import { motion } from 'framer-motion'
import { Calendar, Clock, ArrowRight, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import type { Payout, Circle } from '@/types'

interface UpcomingPayoutsWidgetProps {
  payouts: Payout[]
  circles: Circle[]
  isLoading?: boolean
  isError?: boolean
}

export function UpcomingPayoutsWidget({
  payouts,
  circles,
  isLoading = false,
  isError = false,
}: UpcomingPayoutsWidgetProps) {
  const circleMap = new Map(circles.map((c) => [c.id, c]))

  return (
    <div className="glass rounded-2xl p-5 holo-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-emerald-400" />
          <h3 className="font-heading text-sm font-semibold text-foreground">Upcoming Payouts</h3>
        </div>
        <Link
          href="/payouts"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 font-body"
        >
          View All <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 glass rounded-xl">
              <div className="space-y-1.5">
                <Skeleton variant="text" width="140px" />
                <Skeleton variant="text" width="90px" />
              </div>
              <Skeleton variant="text" width="70px" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={<AlertCircle className="h-5 w-5 text-destructive" />}
          title="Failed to load payouts"
          description="Could not retrieve scheduled upcoming payouts right now."
        />
      ) : payouts.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <Calendar className="h-7 w-7 text-muted-foreground mx-auto" />
          <p className="text-xs text-muted-foreground font-body">No scheduled upcoming payouts</p>
          <p className="text-2xs text-muted-foreground">Your next circle payout dates will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payouts.slice(0, 5).map((payout, idx) => {
            const circle = circleMap.get(payout.circleId)
            return (
              <motion.div
                key={payout.id || idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center justify-between p-3 glass rounded-xl hover:glass-whisper transition-colors"
              >
                <div>
                  <p className="text-xs font-medium text-foreground font-heading">
                    {circle ? circle.name : `Circle #${payout.circleId}`}
                  </p>
                  <p className="text-2xs text-muted-foreground">
                    Round {payout.roundNumber} • {formatDate(payout.createdAt)}
                  </p>
                </div>
                <span className="text-xs font-bold gradient-text">
                  {formatCurrency(payout.amount, circle?.currency || 'USDC')}
                </span>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
