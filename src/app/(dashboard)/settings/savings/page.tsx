"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, PiggyBank, Target, Calendar, TrendingUp, Check, ExternalLink } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { get } from "@/lib/api-client"
import { useTranslate } from "@/lib/locale/context"
import { ButtonLink } from "@/components/ui/button"

interface SavingsSettings {
  autoReserve: boolean
  defaultTargetAmount: number
  defaultFrequency: "daily" | "weekly" | "biweekly" | "monthly"
  notifyOnMilestone: boolean
  milestoneThreshold: number
}

interface SavingsSummary {
  totalGoals: number
  activeGoals: number
  completedGoals: number
  totalTarget: number
  totalSaved: number
  overallPercent: number
  savingsStreak: number
}

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
] as const

const MILESTONE_OPTIONS = [25, 50, 75, 100]

export default function SavingsSettingsPage() {
  const { t } = useTranslate()
  const [saved, setSaved] = useState(false)

  const { data: settings } = useQuery<SavingsSettings>({
    queryKey: ["savings-settings"],
    queryFn: async () => {
      const res = await get<SavingsSettings>("/savings/settings")
      return res
    },
    placeholderData: {
      autoReserve: false,
      defaultTargetAmount: 100,
      defaultFrequency: "monthly",
      notifyOnMilestone: true,
      milestoneThreshold: 50,
    },
  })

  const { data: summary } = useQuery<SavingsSummary>({
    queryKey: ["savings-summary"],
    queryFn: async () => {
      const res = await get<{ summary?: SavingsSummary }>("/savings/goals/summary")
      return (res as Record<string, unknown>)?.summary as SavingsSummary ?? {
        totalGoals: 0,
        activeGoals: 0,
        completedGoals: 0,
        totalTarget: 0,
        totalSaved: 0,
        overallPercent: 0,
        savingsStreak: 0,
      }
    },
  })

  const [localSettings, setLocalSettings] = useState<SavingsSettings>(settings ?? {
    autoReserve: false,
    defaultTargetAmount: 100,
    defaultFrequency: "monthly",
    notifyOnMilestone: true,
    milestoneThreshold: 50,
  })

  const handleSave = async () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header with border accent */}
      <div className="border-l-4 border-l-aurora-violet pl-5 mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/settings" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Back to settings">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-heading text-xl font-bold text-foreground">{t("settings.savings")}</h1>
        </div>
        <p className="text-sm text-muted-foreground">{t("settings.savingsDesc")}</p>
      </div>

      {/* Stats strip - full width callout */}
      {summary && summary.totalGoals > 0 && (
        <div className="mb-8 bg-gradient-to-r from-aurora-violet/10 via-transparent to-aurora-cyan/10 px-6 py-5 flex items-center gap-8">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-aurora-violet" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Active Goals</p>
              <p className="font-heading text-2xl font-bold text-foreground">{summary.activeGoals}</p>
            </div>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Saved</p>
              <p className="font-heading text-2xl font-bold text-emerald-400">${summary.totalSaved.toFixed(0)}</p>
            </div>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-amber-400" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Streak</p>
              <p className="font-heading text-2xl font-bold text-amber-400">{summary.savingsStreak}m</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick link to savings page */}
      <Link href="/savings" className="mb-8 flex items-center justify-between border border-white/10 px-5 py-4 hover:border-aurora-violet/40 transition-colors group">
        <div className="flex items-center gap-3">
          <PiggyBank className="h-5 w-5 text-aurora-violet" />
          <div>
            <p className="text-sm font-medium text-foreground">Manage Savings Goals</p>
            <p className="text-xs text-muted-foreground">Create, edit, and track your individual savings goals</p>
          </div>
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-aurora-violet transition-colors" />
      </Link>

      {/* Settings sections */}
      <div className="space-y-6">
        {/* Default Frequency */}
        <section>
          <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Default Contribution Frequency</h3>
          <div className="flex flex-wrap gap-2">
            {FREQUENCY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                aria-pressed={localSettings.defaultFrequency === opt.value}
                onClick={() => setLocalSettings((s) => ({ ...s, defaultFrequency: opt.value }))}
                className={`rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
                  localSettings.defaultFrequency === opt.value
                    ? "bg-aurora-violet/20 text-aurora-violet border border-aurora-violet/40"
                    : "border border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground"
                }`}
              >
                {opt.label}
                {localSettings.defaultFrequency === opt.value && (
                  <Check className="inline-block h-3.5 w-3.5 ml-2" />
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Gradient divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

        {/* Default Target Amount */}
        <section>
          <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Default Target Amount</h3>
          <div className="flex items-center gap-4">
            <input
              aria-label="Default savings target amount in US dollars"
              type="number"
              min={1}
              value={localSettings.defaultTargetAmount}
              onChange={(e) => setLocalSettings((s) => ({ ...s, defaultTargetAmount: Number(e.target.value) }))}
              className="w-32 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2.5 text-sm text-foreground focus:border-aurora-violet/50 focus:outline-none transition-colors"
            />
            <span className="text-sm text-muted-foreground">USD</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Applied as the default when creating new savings goals</p>
        </section>

        {/* Gradient divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

        {/* Toggle settings */}
        <section className="space-y-4">
          <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Preferences</h3>

          {/* Auto-reserve */}
          <div className="flex items-center justify-between py-3 border-b border-white/5">
            <div>
              <p className="text-sm font-medium text-foreground">Auto-Reserve</p>
              <p className="text-xs text-muted-foreground">Automatically set aside contributions from circle payouts</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={localSettings.autoReserve}
              aria-label="Automatically reserve circle payouts"
              onClick={() => setLocalSettings((s) => ({ ...s, autoReserve: !s.autoReserve }))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                localSettings.autoReserve ? "bg-aurora-violet" : "bg-white/10"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                  localSettings.autoReserve ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Milestone notifications */}
          <div className="flex items-center justify-between py-3 border-b border-white/5">
            <div>
              <p className="text-sm font-medium text-foreground">Milestone Notifications</p>
              <p className="text-xs text-muted-foreground">Get notified when a goal reaches a milestone</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={localSettings.notifyOnMilestone}
              aria-label="Notify on savings milestones"
              onClick={() => setLocalSettings((s) => ({ ...s, notifyOnMilestone: !s.notifyOnMilestone }))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                localSettings.notifyOnMilestone ? "bg-aurora-violet" : "bg-white/10"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                  localSettings.notifyOnMilestone ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </section>

        {/* Milestone threshold - only shown when notifications enabled */}
        {localSettings.notifyOnMilestone && (
          <section>
            <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Notify at Milestone</h3>
            <div className="flex gap-2">
              {MILESTONE_OPTIONS.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  aria-pressed={localSettings.milestoneThreshold === pct}
                  onClick={() => setLocalSettings((s) => ({ ...s, milestoneThreshold: pct }))}
                  className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${
                    localSettings.milestoneThreshold === pct
                      ? "bg-aurora-violet/15 text-aurora-violet border border-aurora-violet/30"
                      : "border border-white/10 text-muted-foreground hover:border-white/20"
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Save section */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
          <ButtonLink href="/settings" variant="ghost" size="md" className="px-5 py-2.5 text-sm text-muted-foreground hover:text-foreground">
            {t("common.cancel")}
          </ButtonLink>
          {saved && (
            <span className="inline-flex items-center gap-1 text-sm text-emerald-400">
              <Check className="h-4 w-4" /> {t("common.saved")}
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="rounded-full bg-gradient-to-r from-aurora-violet to-aurora-cyan px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  )
}
