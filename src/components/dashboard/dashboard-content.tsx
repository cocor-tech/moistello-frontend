"use client"

import React, { useMemo, useEffect, useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import {
  CircleDot,
  ArrowUpCircle,
  ArrowDownCircle,
  Award,
  Users,
  Plus,
  Clock,
  Shield,
  Inbox,
  PiggyBank,
  AlertCircle,
  TrendingUp,
  Wallet,
  CalendarDays,
  BarChart3,
} from "lucide-react"
import { get, post } from "@/lib/api-client"
import { useAuth } from "@/hooks/use-auth"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/formatters"
import { cn } from "@/lib/cn"
import { useTranslate } from "@/lib/locale/context"
import { Routes, MOI_SCORE_HIGH_THRESHOLD } from "@/lib/constants"
import type { ApiResponse, Circle, Contribution, Payout } from "@/types"

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function StatCard({ label, value, icon, gradient, pulseGlow }: { label: string; value: string; icon: React.ReactNode; gradient: string; pulseGlow?: boolean }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-2xs tracking-wider uppercase text-muted-foreground font-body">{label}</p>
          <p className="font-heading text-2xl font-bold gradient-text">{value}</p>
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br", gradient, pulseGlow && "animate-pulse-glow")}>
          <span className="text-white">{icon}</span>
        </div>
      </div>
    </div>
  )
}

function CircleCard({ circle }: { circle: Circle }) {
  const { t } = useTranslate()
  const freqLabel = circle.frequency.charAt(0).toUpperCase() + circle.frequency.slice(1)
  const memberCount = circle.memberCount ?? 0
  const progressPct = Math.min(100, Math.round((circle.currentRound / (circle.maxMembers || 1)) * 100))
  return (
    <Link href={Routes.CIRCLE_DETAIL(circle.id)}>
      <div className="glass rounded-2xl p-5 holo-border">
        <div className="flex items-start justify-between mb-3">
          <h4 className="font-heading text-lg font-semibold text-foreground truncate">{circle.name}</h4>
          <Badge variant={circle.status === "active" ? "success" : circle.status === "pending" ? "warning" : "default"} size="sm">
            {t("circles." + circle.status)}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3 text-sm text-muted-foreground">
          <span className="gradient-text font-bold font-heading">{formatCurrency(circle.contributionAmount, circle.currency)}</span>
          <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{memberCount}/{circle.maxMembers}</span>
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{freqLabel}</span>
          {circle.minMoiScore != null && circle.minMoiScore > 0 && (
            <span className="inline-flex items-center gap-1 text-amber-400 text-xs"><Shield className="h-3 w-3" />{circle.minMoiScore}+</span>
          )}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-2xs text-muted-foreground">
            <span>{t("dash.roundProgress")}</span>
            <span>{circle.currentRound}/{circle.maxMembers}</span>
          </div>
          <Progress value={progressPct} size="sm" variant={progressPct >= 80 ? "success" : "primary"} />
        </div>
      </div>
    </Link>
  )
}

function CreateCircleCard() {
  const { t } = useTranslate()
  return (
    <Link href={Routes.CREATE_CIRCLE}>
      <div className="glass-whisper rounded-2xl p-5 flex flex-col items-center justify-center text-center min-h-[160px] holo-border border-dashed">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-aurora-violet/20 to-aurora-cyan/20 text-aurora-violet mb-3">
          <Plus className="h-6 w-6" />
        </div>
        <p className="font-heading text-sm font-semibold text-foreground">{t("dash.startCircle")}</p>
        <p className="text-xs text-muted-foreground mt-1">{t("dash.createCircleDesc")}</p>
      </div>
    </Link>
  )
}

function ActivityTimelineItem({ description, amount, date, type }: { description: string; amount: string; date: string; type?: "contribution" | "payout" }) {
  const iconColor = type === "payout"
    ? "from-emerald-500/20 to-aurora-cyan/20 text-emerald-400"
    : "from-aurora-indigo/20 to-aurora-violet/20 text-aurora-violet"
  return (
    <div className="glass-whisper rounded-xl p-3 flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br", iconColor)}>
          {type === "payout" ? <ArrowDownCircle className="h-4 w-4" /> : <ArrowUpCircle className="h-4 w-4" />}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-foreground truncate font-body">{description}</p>
          <p className="text-2xs text-muted-foreground">{new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
        </div>
      </div>
      <span className="gradient-text text-sm font-bold font-heading shrink-0 ml-3">{amount}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  NEW: Chart Widgets                                                 */
/* ------------------------------------------------------------------ */

function TrendSparkline({ data, height = 160 }: { data: number[]; height?: number }) {
  const width = 600
  const padding = 12
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * (width - padding * 2)
    const y = height - padding - ((v - min) / range) * (height - padding * 2)
    return `${x},${y}`
  }).join(" ")

  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="none">
      <defs>
        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--aurora-violet) / 0.25)" />
          <stop offset="100%" stopColor="rgb(var(--aurora-violet) / 0)" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#trendGrad)" />
      <polyline
        points={points}
        fill="none"
        stroke="rgb(var(--aurora-violet) / 0.9)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const TREND_TITLE = "Contribution trend"
const TREND_EMPTY = "No contributions yet"
const TREND_EMPTY_DESC = "Your trend will appear after your first contribution."
const TREND_TOTAL = "Total"
const TREND_PEAK = "Peak"
const TREND_PERIOD = "Last 14 days"

const PAYOUTS_TITLE = "Upcoming payouts"
const PAYOUTS_EMPTY = "No upcoming payouts"
const PAYOUTS_EMPTY_DESC = "Payouts will appear here when scheduled."
const PAYOUTS_VIEW_ALL = "View all"

function ContributionTrendChart({ contributions }: { contributions: Contribution[] }) {
  const [isClient, setIsClient] = useState(false)
  useEffect(() => { setIsClient(true) }, [])

  const dailyTotals = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of contributions) {
      const day = new Date(c.createdAt).toISOString().slice(0, 10)
      map.set(day, (map.get(day) || 0) + c.amount)
    }
    const days = Array.from(map.keys()).sort().slice(-14)
    return days.map((d) => map.get(d) || 0)
  }, [contributions])

  if (!isClient) return null

  return (
    <div className="glass rounded-2xl p-5 holo-border relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-aurora-violet" />
          <h3 className="font-heading text-sm font-semibold text-foreground">{TREND_TITLE}</h3>
        </div>
        <span className="text-2xs text-muted-foreground font-body">{TREND_PERIOD}</span>
      </div>

      {dailyTotals.length === 0 ? (
        <div className="py-10 text-center space-y-2">
          <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-xs text-muted-foreground font-body">{TREND_EMPTY}</p>
          <p className="text-2xs text-muted-foreground">{TREND_EMPTY_DESC}</p>
        </div>
      ) : (
        <div className="depth-4 rounded-xl bg-white/[0.02] p-3">
          <TrendSparkline data={dailyTotals} height={160} />
          <div className="flex items-end justify-between mt-3 px-1">
            <div>
              <p className="text-2xs text-muted-foreground uppercase tracking-wide">{TREND_TOTAL}</p>
              <p className="font-heading text-lg font-bold gradient-text">
                {formatCurrency(dailyTotals.reduce((a, b) => a + b, 0), "USDC")}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xs text-muted-foreground uppercase tracking-wide">{TREND_PEAK}</p>
              <p className="font-heading text-lg font-bold text-foreground">{formatCurrency(Math.max(...dailyTotals), "USDC")}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function UpcomingPayoutsWidget({ payouts }: { payouts: Payout[] }) {
  const upcoming = useMemo(() => {
    const now = Date.now()
    return payouts
      .filter((p) => new Date(p.createdAt).getTime() >= now)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(0, 5)
  }, [payouts])

  return (
    <div className="glass rounded-2xl p-5 holo-border relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-emerald-400" />
          <h3 className="font-heading text-sm font-semibold text-foreground">{PAYOUTS_TITLE}</h3>
        </div>
        <Link href={Routes.PAYOUTS} className="text-xs text-aurora-violet hover:underline">{PAYOUTS_VIEW_ALL}</Link>
      </div>

      {upcoming.length === 0 ? (
        <div className="py-10 text-center space-y-2">
          <Inbox className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-xs text-muted-foreground font-body">{PAYOUTS_EMPTY}</p>
          <p className="text-2xs text-muted-foreground">{PAYOUTS_EMPTY_DESC}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {upcoming.map((p) => {
            const circleLabel = `Round ${p.roundNumber}`
            const eta = new Date(p.createdAt)
            const isToday = eta.toDateString() === new Date().toDateString()
            return (
              <div key={p.id} className="glass-whisper rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-aurora-cyan/20 text-emerald-400">
                    <ArrowDownCircle className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate font-body">{circleLabel}</p>
                    <p className="text-2xs text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" /> {isToday ? "Today" : eta.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
                <span className="gradient-text text-sm font-bold font-heading shrink-0 ml-3">{formatCurrency(p.amount, "USDC")}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Dashboard                                                     */
/* ------------------------------------------------------------------ */

export default function DashboardContent() {
  const { user, isLoading: authLoading } = useAuth()
  const { t } = useTranslate()

  const { data: circlesData, isLoading: circlesLoading } = useQuery({
    queryKey: ["my-circles"],
    queryFn: async () => {
      const res = await get<ApiResponse<{ circles: Circle[] }>>("/users/me/circles")
      return res.data?.circles ?? []
    },
  })

  const { data: contribsData, isLoading: contribsLoading } = useQuery({
    queryKey: ["contributions", "dashboard"],
    queryFn: async () => {
      const res = await get<ApiResponse<{ contributions: Contribution[] }>>("/contributions?limit=20&page=1")
      return res.data?.contributions ?? []
    },
  })

  const { data: payoutsData, isLoading: payoutsLoading } = useQuery({
    queryKey: ["payouts", "dashboard"],
    queryFn: async () => {
      const res = await get<ApiResponse<{ payouts: Payout[] }>>("/payouts?limit=20&page=1")
      return res.data?.payouts ?? []
    },
  })

  const { data: savingsObligations = [], isLoading: savingsObligationsLoading } = useQuery({
    queryKey: ["savings-obligations"],
    queryFn: async () => {
      const res = await get<Record<string, unknown>>("/savings/goals/obligations")
      const goals = (res?.goals ?? []) as { id: string; name: string; targetAmount: number; currentAmount: number; autoReserve: boolean; targetDate: string | null }[]
      return goals
    },
    enabled: true,
  })

  const circles = circlesData ?? []
  const contributions = contribsData ?? []
  const payouts = payoutsData ?? []

  /* Initialize wallet on first dashboard load (fires once per session) */
  useEffect(() => {
    post("/auth/wallet/init").catch(() => { /* best-effort wallet init */ })
  }, [])

  const isLoading = authLoading || circlesLoading || contribsLoading || payoutsLoading

  const stats = useMemo(() => {
    const activeCircles = circles.filter((c) => c.status === "active").length
    const totalContributed = contributions.reduce((sum, c) => sum + c.amount, 0)
    const totalReceived = payouts.reduce((sum, p) => sum + p.amount, 0)
    return {
      activeCircles,
      totalContributed: formatCurrency(totalContributed, "USDC"),
      totalReceived: formatCurrency(totalReceived, "USDC"),
      moiScore: String(user?.moiScore ?? 0),
    }
  }, [circles, contributions, payouts, user])

  const moiHighScore = (user?.moiScore ?? 0) >= MOI_SCORE_HIGH_THRESHOLD

  const recentActivity = useMemo(() => {
    const items: { id: string; description: string; amount: string; date: string; type: "contribution" | "payout" }[] = []
    for (const c of contributions) {
      items.push({ id: `c-${c.id}`, description: `Contribution in round ${c.roundNumber}`, amount: formatCurrency(c.amount, "USDC"), date: c.createdAt, type: "contribution" })
    }
    for (const p of payouts) {
      items.push({ id: `p-${p.id}`, description: `Payout received — round ${p.roundNumber}`, amount: formatCurrency(p.amount, "USDC"), date: p.createdAt, type: "payout" })
    }
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return items.slice(0, 5)
  }, [contributions, payouts])

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title={t("dash.title")} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (<Skeleton key={i} variant="card" className="h-24 rounded-2xl" />))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton variant="heading" className="rounded-xl h-6 w-36" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (<Skeleton key={i} variant="card" className="h-40 rounded-2xl" />))}
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton variant="heading" className="rounded-xl h-6 w-40" />
            <Skeleton variant="card" className="h-72 rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader title={t("dash.title")} description={t("dash.welcome")} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label={t("dash.activeCircles")} value={String(stats.activeCircles)} icon={<CircleDot className="h-5 w-5" />} gradient="from-aurora-indigo to-aurora-violet" />
        <StatCard label={t("dash.totalContributed")} value={stats.totalContributed} icon={<ArrowUpCircle className="h-5 w-5" />} gradient="from-aurora-cyan to-aurora-indigo" />
        <StatCard label={t("dash.totalReceived")} value={stats.totalReceived} icon={<ArrowDownCircle className="h-5 w-5" />} gradient="from-emerald-500 to-aurora-cyan" />
        <StatCard label={t("dash.moiScore")} value={stats.moiScore} icon={<Award className="h-5 w-5" />} gradient="from-aurora-amber to-aurora-violet" pulseGlow={moiHighScore} />
      </div>

      {/* Savings Obligations */}
      <div className="glass-premium rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PiggyBank className="h-4 w-4 text-aurora-violet" />
            <h3 className="font-heading text-sm font-semibold text-foreground">{t("dash.upcomingSavings")}</h3>
          </div>
          <Link href={Routes.SAVINGS} className="text-xs text-aurora-violet hover:underline">{t("dash.createSavingsGoal")}</Link>
        </div>

        {savingsObligationsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : savingsObligations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {savingsObligations.slice(0, 4).map((goal: { id: string; name: string; targetAmount: number; currentAmount: number; autoReserve: boolean; targetDate: string | null }) => {
              const pct = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0
              return (
                <Link key={goal.id} href={Routes.SAVINGS} className="glass-whisper rounded-xl p-3 space-y-2 hover:glass-strong transition-all">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-foreground truncate">{goal.name}</p>
                    {goal.autoReserve && <AlertCircle className="h-3 w-3 text-aurora-violet shrink-0" />}
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-aurora-violet to-aurora-indigo rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-2xs text-muted-foreground">
                    <span>{goal.currentAmount.toFixed(2)} USDC</span>
                    <span>{goal.targetAmount.toFixed(2)} USDC</span>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="glass-whisper rounded-xl p-4 text-center space-y-1">
            <p className="text-xs font-medium text-foreground">No upcoming savings goals</p>
            <p className="text-2xs text-muted-foreground">Set up auto-reserves or custom savings targets to stay on track.</p>
          </div>
        )}
      </div>

      {/* Charts & widgets section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <ContributionTrendChart contributions={contributions} />
        </div>
        <div className="space-y-4">
          <UpcomingPayoutsWidget payouts={payouts} />
        </div>
      </div>

      {/* Circles + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-lg font-semibold text-foreground">{t("dash.yourCircles")}</h3>
            <Link href={Routes.CIRCLES} className="text-sm text-muted-foreground hover:text-foreground transition-colors font-body">{t("dash.browseAll")} &rarr;</Link>
          </div>
          {circles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {circles.slice(0, 4).map((circle) => (<CircleCard key={circle.id} circle={circle} />))}
              <CreateCircleCard />
            </div>
          ) : (
            <EmptyState icon={<Users className="h-6 w-6" />} title={t("dash.noCircles")} description={t("dash.noCirclesDesc")} action={{ label: t("dash.createCircle"), onClick: () => { window.location.href = Routes.CREATE_CIRCLE } }} />
          )}
        </div>
        <div className="space-y-4">
          <h3 className="font-heading text-lg font-semibold text-foreground">{t("dash.recentActivity")}</h3>
          {recentActivity.length > 0 ? (
            <div className="glass rounded-2xl p-5 holo-border">
              <div className="space-y-3">{recentActivity.map((item) => (<ActivityTimelineItem key={item.id} description={item.description} amount={item.amount} date={item.date} type={item.type} />))}</div>
            </div>
          ) : (
            <EmptyState icon={<Inbox className="h-6 w-6" />} title={t("dash.noActivity")} description={t("dash.noActivityDesc")} />
          )}
        </div>
      </div>
    </div>
  )
}