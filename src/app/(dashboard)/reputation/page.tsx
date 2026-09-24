"use client"

import React from "react"
import { AlertCircle, Award, Sparkles } from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { MoiScoreGauge } from "@/components/reputation/moi-score-gauge"
import { ReputationBreakdown } from "@/components/reputation/reputation-breakdown"
import { ReputationHistory } from "@/components/reputation/reputation-history"
import { TierCard } from "@/components/reputation/tier-card"
import { useAuth } from "@/hooks/use-auth"
import { useReputation } from "@/hooks/use-reputation"
import { useTranslate } from "@/lib/locale/context"

function ReputationLoading({ ariaLabel }: { ariaLabel?: string }) {
  return (
    <div className="space-y-7" aria-label={ariaLabel || "Loading reputation"}>
      <Skeleton variant="heading" width="45%" height={48} />
      <div className="grid gap-7 lg:grid-cols-[1.1fr_.9fr]">
        <Skeleton variant="rectangular" height={330} />
        <Skeleton variant="rectangular" height={330} />
      </div>
      <Skeleton variant="rectangular" height={260} />
    </div>
  )
}

export default function ReputationPage() {
  const { t } = useTranslate()
  const { user, isLoading: authLoading } = useAuth()
  const { data: reputation, isLoading, isError } = useReputation(user?.id ?? "")

  if (authLoading || (user && isLoading)) {
    return <ReputationLoading ariaLabel={t("reputation.loadingAria", "Loading reputation")} />
  }

  if (isError) {
    return (
      <EmptyState
        icon={<AlertCircle />}
        title={t("reputation.errorTitle", "Failed to load reputation")}
        description={t("reputation.errorDesc", "Something went wrong. Please try again later.")}
        className="border border-red-400/20"
      />
    )
  }

  if (!user || !reputation) {
    return (
      <EmptyState
        icon={<Award />}
        title={t("reputation.emptyTitle", "No reputation yet")}
        description={t("reputation.emptyDesc", "Complete your first contribution to start building your MoiScore.")}
        className="border border-dashed border-aurora-violet/30"
      />
    )
  }

  return (
    <div className="relative space-y-10 overflow-hidden pb-10">
      <div
        className="pointer-events-none absolute right-0 top-12 -z-10 h-72 w-72 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(52,211,153,.55) 1px, transparent 0)",
          backgroundSize: "22px 22px",
          maskImage: "linear-gradient(to left, black, transparent)",
        }}
        aria-hidden="true"
      />

      <header className="max-w-3xl">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-aurora-violet/10 px-3 py-1 font-mono text-xs uppercase tracking-[0.2em] text-aurora-violet">
            {t("reputation.trustProfile", "Trust profile")}
          </span>
          <span className="rounded-full border border-emerald-400/25 px-3 py-1 text-xs text-emerald-400">
            {t("reputation.onChainActivity", "On-chain activity")}
          </span>
        </div>
        <h1 className="font-heading text-5xl font-bold tracking-tight md:text-7xl">
          {t("reputation.title", "Your MoiScore")}
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
          {t("reputation.desc", "A living record of reliability, consistency, and participation across your savings circles.")}
        </p>
      </header>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-aurora-violet/70 to-transparent" />

      <div className="grid items-start gap-8 lg:grid-cols-[1.05fr_.95fr]">
        <MoiScoreGauge score={reputation.score} />
        <div className="lg:pt-12">
          <TierCard
            score={reputation.score}
            streak={reputation.breakdown.streaks}
            completions={reputation.breakdown.completions}
            totalContributed={reputation.breakdown.volume}
            defaults={0}
          />
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
        <ReputationBreakdown breakdown={reputation.breakdown} />
        <div className="lg:mt-14">
          <ReputationHistory history={reputation.history} />
        </div>
      </div>

      <aside className="flex flex-col justify-between gap-4 bg-gradient-to-r from-aurora-violet/15 via-transparent to-emerald-400/10 px-5 py-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-amber-400" />
          <p className="font-heading font-semibold">{t("reputation.consistencyTip", "Consistency compounds into better circle access.")}</p>
        </div>
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {t("reputation.keepStreak", "Keep the streak alive")}
        </span>
      </aside>
    </div>
  )
}

