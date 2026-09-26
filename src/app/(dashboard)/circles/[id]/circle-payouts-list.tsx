"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ChevronRight, CircleCheck, CircleAlert } from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency, formatDate } from "@/lib/formatters"
import type { Circle, Payout } from "@/types"

interface CirclePayoutsListProps {
  circle: Circle
  circleId: string
  payouts: Payout[]
  isLoading: boolean
  isError: boolean
}

export function CirclePayoutsList({
  circle,
  circleId,
  payouts,
  isLoading,
  isError,
}: CirclePayoutsListProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-lg font-semibold text-foreground dark:text-white">
          Recent Payouts
        </h3>
        <Link
          href={`/circles/${circleId}/rounds`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 font-body"
        >
          View Rounds <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      {isLoading ? (
        <div className="glass rounded-2xl overflow-hidden divide-y divide-border">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-4">
              <div className="space-y-2">
                <Skeleton variant="text" width="180px" />
                <Skeleton variant="text" width="120px" />
              </div>
              <Skeleton variant="text" width="110px" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={<CircleAlert className="h-6 w-6" />}
          title="Failed to load payouts"
          description="The recent payout history could not be loaded right now."
        />
      ) : payouts.length === 0 ? (
        <div className="glass rounded-2xl px-5 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            No payouts yet. The first round is still active.
          </p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="divide-y divide-border">
            {payouts.map((payout, i) => (
              <motion.div
                key={payout.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between px-5 py-4 hover:glass-whisper transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <CircleCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground dark:text-white font-heading">
                      Round {payout.roundNumber} Payout
                    </p>
                    <p className="text-2xs text-muted-foreground">
                      {formatDate(payout.createdAt)}
                    </p>
                  </div>
                </div>
                <span className="gradient-text text-sm font-bold font-heading">
                  {formatCurrency(payout.amount, circle.currency)}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
