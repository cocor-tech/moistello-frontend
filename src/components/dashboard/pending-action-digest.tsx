'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Gift, MailWarning, ArrowRight, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/formatters'

export type PendingActionType = 'missed_round' | 'unclaimed_payout' | 'expiring_invite'

export interface PendingActionItem {
  id: string
  type: PendingActionType
  title: string
  description: string
  actionLabel: string
  href: string
  circleId?: string
  circleName?: string
  roundNumber?: number
  amount?: number
  currency?: string
  expiresAt?: string
}

interface PendingActionDigestProps {
  initialActions?: PendingActionItem[]
  isLoading?: boolean
  onActionClick?: (action: PendingActionItem) => void
  onResolve?: (actionId: string) => void
}

const ACTION_CONFIG = {
  missed_round: {
    icon: AlertTriangle,
    iconColor: 'text-rose-400',
    badgeBg: 'bg-rose-500/10 border-rose-500/20 text-rose-300',
    badgeLabel: 'Missed Round',
  },
  unclaimed_payout: {
    icon: Gift,
    iconColor: 'text-amber-400',
    badgeBg: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
    badgeLabel: 'Unclaimed Payout',
  },
  expiring_invite: {
    icon: MailWarning,
    iconColor: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300',
    badgeLabel: 'Expiring Invite',
  },
}

export function PendingActionDigest({
  initialActions = [],
  isLoading = false,
  onActionClick,
  onResolve,
}: PendingActionDigestProps) {
  const [actions, setActions] = useState<PendingActionItem[]>(initialActions)

  const handleResolve = (actionId: string) => {
    setActions((prev) => prev.filter((a) => a.id !== actionId))
    onResolve?.(actionId)
  }

  const activeCount = actions.length

  return (
    <section
      aria-label="Needs your attention"
      className="glass rounded-2xl p-5 holo-border transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            {activeCount > 0 && !isLoading && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
            )}
          </div>
          <h3 className="font-heading text-sm font-semibold text-foreground">
            Needs Your Attention
          </h3>
        </div>
        {!isLoading && activeCount > 0 && (
          <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-amber-500/20 border border-amber-500/30 text-amber-300 font-mono">
            {activeCount} pending
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3" data-testid="digest-skeleton">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 glass rounded-xl"
            >
              <div className="space-y-1.5 flex-1 mr-4">
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="80%" />
              </div>
              <Skeleton variant="text" width="20%" />
            </div>
          ))}
        </div>
      ) : activeCount === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          data-testid="digest-empty"
          className="py-6 text-center space-y-2"
        >
          <CheckCircle2 className="h-7 w-7 text-emerald-400 mx-auto" />
          <p className="text-xs font-medium text-foreground font-heading">
            All caught up!
          </p>
          <p className="text-2xs text-muted-foreground font-body">
            No missed rounds, unclaimed payouts, or expiring invitations.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3" role="list">
          <AnimatePresence>
            {actions.map((item, idx) => {
              const cfg = ACTION_CONFIG[item.type]
              const Icon = cfg.icon

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  role="listitem"
                  className="group flex flex-col sm:flex-row sm:items-center justify-between p-3.5 glass rounded-xl hover:glass-whisper border border-white/5 hover:border-white/10 transition-all gap-3"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className={`p-2 rounded-lg bg-card/60 border border-white/5 shrink-0 ${cfg.iconColor}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-3xs uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded border ${cfg.badgeBg}`}
                        >
                          {cfg.badgeLabel}
                        </span>
                        {item.circleName && (
                          <span className="text-2xs text-muted-foreground truncate">
                            {item.circleName}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-semibold text-foreground truncate font-heading">
                        {item.title}
                      </h4>

                      <p className="text-2xs text-muted-foreground font-body line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                    {item.amount !== undefined && (
                      <span className="text-xs font-bold text-foreground font-mono">
                        {formatCurrency(item.amount, item.currency || 'USDC')}
                      </span>
                    )}

                    <Link
                      href={item.href}
                      onClick={() => onActionClick?.(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/20 hover:bg-primary/30 text-primary-foreground border border-primary/30 transition-colors font-heading"
                    >
                      <span>{item.actionLabel}</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleResolve(item.id)}
                      title="Mark as resolved"
                      aria-label={`Mark ${item.title} as resolved`}
                      className="text-2xs text-muted-foreground hover:text-emerald-400 p-1 transition-colors"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </section>
  )
}
