"use client"

import React from "react"
import { motion } from "framer-motion"
import {
  Award, Check, Lock, ChevronUp, Sparkles,
  Crown, Gem, Star, Medal, TrendingUp,
  Users, DollarSign, Shield, Vote, Building2,
} from "lucide-react"
import { cn } from "@/lib/cn"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { formatNumber } from "@/lib/formatters"

type TierLevel = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond"

interface TierVisual {
  level: TierLevel
  icon: React.ElementType
  textGradient: string
  glow: string
  bgGradient: string
  borderColor: string
  badgeVariant: "default" | "warning" | "info" | "success" | "premium"
  accentColor: string
  dotColor: string
}

const tierVisuals: Record<TierLevel, TierVisual> = {
  Bronze: {
    level: "Bronze", icon: Medal,
    textGradient: "from-amber-500 to-orange-600",
    glow: "shadow-[0_0_30px_rgba(245,158,11,0.3)]",
    bgGradient: "from-amber-950/40 to-orange-950/30",
    borderColor: "border-amber-500/30",
    badgeVariant: "default",
    accentColor: "bg-amber-500",
    dotColor: "bg-amber-500",
  },
  Silver: {
    level: "Silver", icon: Star,
    textGradient: "from-slate-300 to-white",
    glow: "shadow-[0_0_30px_rgba(203,213,225,0.3)]",
    bgGradient: "from-slate-900/40 to-slate-800/30",
    borderColor: "border-slate-400/30",
    badgeVariant: "info",
    accentColor: "bg-slate-400",
    dotColor: "bg-slate-400",
  },
  Gold: {
    level: "Gold", icon: Crown,
    textGradient: "from-yellow-300 to-amber-400",
    glow: "shadow-[0_0_30px_rgba(234,179,8,0.4)]",
    bgGradient: "from-yellow-950/40 to-amber-900/30",
    borderColor: "border-yellow-500/40",
    badgeVariant: "warning",
    accentColor: "bg-yellow-500",
    dotColor: "bg-yellow-500",
  },
  Platinum: {
    level: "Platinum", icon: Gem,
    textGradient: "from-cyan-300 to-blue-400",
    glow: "shadow-[0_0_30px_rgba(6,182,212,0.3)]",
    bgGradient: "from-cyan-950/40 to-blue-950/30",
    borderColor: "border-cyan-400/30",
    badgeVariant: "success",
    accentColor: "bg-cyan-400",
    dotColor: "bg-cyan-400",
  },
  Diamond: {
    level: "Diamond", icon: Sparkles,
    textGradient: "from-violet-300 to-purple-400",
    glow: "shadow-[0_0_30px_rgba(139,92,246,0.4)]",
    bgGradient: "from-violet-950/40 to-purple-950/30",
    borderColor: "border-violet-400/40",
    badgeVariant: "premium",
    accentColor: "bg-violet-400",
    dotColor: "bg-violet-400",
  },
}

const TIER_ORDER: TierLevel[] = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"]

const TIER_THRESHOLDS: { min: number; max: number }[] = [
  { min: 0, max: 300 },
  { min: 301, max: 600 },
  { min: 601, max: 850 },
  { min: 851, max: 950 },
  { min: 951, max: 1000 },
]

const BENEFITS: Record<TierLevel, string[]> = {
  Bronze: [
    "Create circles (up to 5 members)",
    "Contribute up to 100 USDC",
    "Basic collateral (10%)",
  ],
  Silver: [
    "Create circles (up to 10 members)",
    "Contribute up to 500 USDC",
    "Reduced collateral (5%)",
  ],
  Gold: [
    "Create circles (up to 20 members)",
    "Contribute up to 2,000 USDC",
    "Low collateral (3%)",
    "Access to auction payouts",
  ],
  Platinum: [
    "Create circles (up to 50 members)",
    "Contribute up to 10,000 USDC",
    "Minimal collateral (1%)",
    "Vote payout priority",
  ],
  Diamond: [
    "Create circles (up to 100 members)",
    "Contribute up to 50,000 USDC",
    "Zero collateral (0%)",
    "Governance proposal rights",
    "Early feature access",
  ],
}

const BENEFIT_ICONS: Record<string, React.ElementType> = {
  "Create circles": Users,
  "Contribute up": DollarSign,
  "Basic collateral": Shield,
  "Reduced collateral": Shield,
  "Low collateral": Shield,
  "Minimal collateral": Shield,
  "Zero collateral": Shield,
  "Access to auction": Vote,
  "Vote payout": Vote,
  "Governance proposal": Building2,
  "Early feature": Sparkles,
}

export interface TierCardProps {
  score: number
  streak: number
  completions: number
  totalContributed: number
  defaults: number
}

function getTierIndex(score: number): number {
  if (score <= 300) return 0
  if (score <= 600) return 1
  if (score <= 850) return 2
  if (score <= 950) return 3
  return 4
}

function getBenefitIcon(benefit: string): React.ElementType {
  const key = Object.keys(BENEFIT_ICONS).find((k) => benefit.startsWith(k))
  return key ? BENEFIT_ICONS[key] : Award
}

export function TierCard({ score }: TierCardProps) {
  const tierIndex = getTierIndex(score)
  const currentTier = TIER_ORDER[tierIndex]
  const nextTier = tierIndex < 4 ? TIER_ORDER[tierIndex + 1] : null
  const visuals = tierVisuals[currentTier]
  const Icon = visuals.icon

  const threshold = TIER_THRESHOLDS[tierIndex]
  const range = threshold.max - threshold.min
  const progress = Math.max(0, Math.min(100, ((score - threshold.min) / range) * 100))
  const pointsToNext = nextTier !== null ? TIER_THRESHOLDS[tierIndex + 1].min - score : 0

  const currentBenefits = BENEFITS[currentTier]
  const lockedBenefits = nextTier ? BENEFITS[nextTier] : []

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="border border-white/10 rounded-xl overflow-hidden"
    >
      {/* ═══ HERO: Current Tier ═══ */}
      <div className={cn("relative overflow-hidden p-6 md:p-8", visuals.bgGradient)}>
        <div className={cn("absolute inset-0", visuals.glow, "opacity-30")} />
        <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-white/[0.03] blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-5 md:gap-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className={cn(
              "flex items-center justify-center rounded-2xl border-2 w-20 h-20 md:w-24 md:h-24",
              visuals.bgGradient, visuals.borderColor,
            )}>
              <Icon className="h-10 w-10 md:h-12 md:w-12 drop-shadow-[0_0_8px_currentColor]"
                style={{ color: currentTier === "Bronze" ? "#f59e0b" : currentTier === "Silver" ? "#cbd5e1" : currentTier === "Gold" ? "#eab308" : currentTier === "Platinum" ? "#22d3ee" : "#a78bfa" }}
              />
            </div>
          </motion.div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start">
              <h2 className={cn(
                "font-heading text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r",
                visuals.textGradient,
              )}>
                {currentTier}
              </h2>
              <Badge variant={visuals.badgeVariant} size="md">{formatNumber(score)}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              MoiScore: {formatNumber(score)} / 1,000
            </p>
          </div>

          {nextTier && (
            <div className="flex items-center gap-2 opacity-60">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Next</p>
                <p className={cn(
                  "text-sm font-heading font-semibold bg-clip-text text-transparent bg-gradient-to-r",
                  tierVisuals[nextTier].textGradient,
                )}>
                  {nextTier}
                </p>
              </div>
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      {/* ═══ PROGRESS BAR ═══ */}
      <div className="px-6 md:px-8 py-5 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
            Progress to {nextTier ?? "Max"}
          </span>
          <span className="text-xs font-mono text-muted-foreground">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} variant="premium" size="lg" />
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-2xs text-muted-foreground/60">{formatNumber(threshold.min)}</span>
          <span className="text-2xs text-muted-foreground/60">{formatNumber(threshold.max)}</span>
        </div>
        {pointsToNext > 0 ? (
          <p className="text-sm text-muted-foreground mt-3 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-aurora-violet" />
            <span className="font-heading font-bold text-foreground">{formatNumber(pointsToNext)}</span>
            points needed for {nextTier}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground mt-3 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-amber-400" />
            Maximum tier achieved
          </p>
        )}
      </div>

      {/* ═══ BENEFITS: Current & Locked ═══ */}
      <div className="p-6 md:p-8 space-y-6">
        <div>
          <h3 className="font-heading text-base font-semibold text-foreground flex items-center gap-2 mb-4">
            <Award className="h-5 w-5 text-emerald-400" />
            Your {currentTier} Benefits
          </h3>
          <div className="grid gap-2.5">
            {currentBenefits.map((benefit) => {
              const BIcon = getBenefitIcon(benefit)
              return (
                <motion.div
                  key={benefit}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-3 text-sm text-foreground/90"
                >
                  <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15">
                    <BIcon className="h-3.5 w-3.5 text-emerald-400" />
                  </span>
                  {benefit}
                </motion.div>
              )
            })}
          </div>
        </div>

        {lockedBenefits.length > 0 && (
          <div className="border-t border-dotted border-white/[0.06] pt-6">
            <h4 className="font-heading text-sm font-semibold text-muted-foreground flex items-center gap-2 mb-4">
              <Lock className="h-4 w-4" />
              Locked — {nextTier} Benefits
            </h4>
            <div className="grid gap-2.5">
              {lockedBenefits.map((benefit) => {
                const BIcon = getBenefitIcon(benefit)
                return (
                  <div key={benefit} className="flex items-center gap-3 text-sm text-muted-foreground/60">
                    <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-muted/30">
                      <Lock className="h-3 w-3 text-muted-foreground/40" />
                    </span>
                    {benefit}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ═══ ALL TIERS OVERVIEW (timeline) ═══ */}
      <div className="border-t border-white/[0.06] px-6 md:px-8 py-6">
        <h4 className="font-heading text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-5">
          Tier Progression Ladder
        </h4>
        <div className="relative">
          <div className="absolute left-[17px] top-1 bottom-1 w-px bg-white/10" />

          <div className="space-y-0">
            {TIER_ORDER.map((tier, i) => {
              const t = tierVisuals[tier]
              const TIcon = t.icon
              const isCurrent = i === tierIndex
              const isUnlocked = i <= tierIndex
              const isLocked = i > tierIndex

              return (
                <div key={tier} className="relative flex items-start gap-4 pb-5 last:pb-0 pl-1">
                  <div className={cn(
                    "relative z-10 mt-1 h-[14px] w-[14px] rounded-full border-2 shrink-0",
                    isCurrent && "ring-2 ring-offset-2 ring-offset-background scale-125",
                    isCurrent && t.borderColor,
                    isUnlocked && !isCurrent && `${t.accentColor} border-transparent`,
                    isLocked && "border-white/20 bg-transparent",
                  )}>
                    {isUnlocked && !isCurrent && (
                      <Check className="h-2.5 w-2.5 text-white absolute inset-0 m-auto" />
                    )}
                  </div>

                  <div className={cn(
                    "flex-1 flex items-center justify-between gap-3",
                    isLocked && "opacity-40",
                  )}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg shrink-0",
                        isUnlocked ? t.bgGradient : "bg-white/5",
                      )}>
                        <TIcon className={cn("h-4 w-4", isUnlocked ? "" : "text-muted-foreground")}
                          style={isUnlocked ? { color: tier === "Bronze" ? "#f59e0b" : tier === "Silver" ? "#cbd5e1" : tier === "Gold" ? "#eab308" : tier === "Platinum" ? "#22d3ee" : "#a78bfa" } : {}}
                        />
                      </div>
                      <div>
                        <p className={cn(
                          "text-sm font-heading font-semibold",
                          isCurrent
                            ? cn("bg-clip-text text-transparent bg-gradient-to-r", t.textGradient)
                            : isUnlocked ? "text-foreground" : "text-muted-foreground",
                        )}>
                          {tier}
                        </p>
                        <p className="text-2xs text-muted-foreground">
                          {formatNumber(TIER_THRESHOLDS[i].min)}–{formatNumber(TIER_THRESHOLDS[i].max)} pts
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isCurrent && (
                        <span className="text-[10px] font-heading font-semibold uppercase tracking-wider text-aurora-violet">
                          Current
                        </span>
                      )}
                      {isUnlocked && !isCurrent && (
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                          <Check className="h-3 w-3" /> Unlocked
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </motion.div>
  )
}