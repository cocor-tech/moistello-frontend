"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { PiggyBank } from "lucide-react"
import { useTranslate } from "@/lib/locale/context"

interface ProfileSavingsProps {
  savingsSummary: Record<string, unknown> | null
  variants?: any
}

export function ProfileSavings({ savingsSummary, variants }: ProfileSavingsProps) {
  const { t } = useTranslate()

  if (!savingsSummary || (savingsSummary.completedGoals as number) <= 0) {
    return null
  }

  return (
    <motion.div variants={variants} className="glass-premium rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-sm font-semibold text-foreground flex items-center gap-2">
          <PiggyBank className="h-4 w-4 text-aurora-violet" />
          {t("profile.savingsTitle", "Savings Record")}
        </h3>
        <Link href="/savings" className="text-xs text-aurora-violet hover:underline">
          {t("profile.manageLink", "Manage")} &rarr;
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-whisper rounded-xl p-3 text-center">
          <p className="font-heading text-xl font-bold gradient-text">{savingsSummary.completedGoals as number}</p>
          <p className="text-2xs text-muted-foreground uppercase tracking-wider mt-0.5">
            {t("profile.goalsCompleted", "Goals Completed")}
          </p>
        </div>
        <div className="glass-whisper rounded-xl p-3 text-center">
          <p className="font-heading text-xl font-bold text-foreground">{savingsSummary.savingsStreak as number}m</p>
          <p className="text-2xs text-muted-foreground uppercase tracking-wider mt-0.5">
            {t("profile.monthStreak", "Month Streak")}
          </p>
        </div>
      </div>
      {(savingsSummary.totalSaved as number) > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("profile.totalSaved", "Total saved")}</span>
          <span className="font-heading font-semibold text-foreground">
            ${(savingsSummary.totalSaved as number).toFixed(2)}
          </span>
        </div>
      )}
    </motion.div>
  )
}
