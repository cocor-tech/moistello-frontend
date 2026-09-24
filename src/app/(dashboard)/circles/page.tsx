"use client"

import React, { useState, useDeferredValue } from "react"
import Link from "next/link"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { motion } from "framer-motion"
import {
  Search,
  Plus,
  Users,
  Clock,
  Shield,
  ChevronLeft,
  ChevronRight,
  Inbox,
  ArrowUpDown,
  Check,
} from "lucide-react"
import { useCircles } from "@/hooks/use-circles"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button, ButtonLink } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Dropdown, DropdownItem } from "@/components/ui/dropdown"
import { cn } from "@/lib/cn"
import { formatCurrency } from "@/lib/formatters"
import type { Circle, CircleType, Currency } from "@/types"
import { useTranslate } from "@/lib/locale/context"

const TYPE_TABS = [
  { value: "all", label: "All" },
  { value: "my-circles", label: "My Circles" },
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
  { value: "community", label: "Community" },
  { value: "premium", label: "Premium" },
]

const SORT_OPTIONS = [
  { value: "date-desc", label: "Creation Date (Newest)", sortBy: "date", sortOrder: "desc" as const },
  { value: "date-asc", label: "Creation Date (Oldest)", sortBy: "date", sortOrder: "asc" as const },
  { value: "name-asc", label: "Name (A-Z)", sortBy: "name", sortOrder: "asc" as const },
  { value: "name-desc", label: "Name (Z-A)", sortBy: "name", sortOrder: "desc" as const },
  { value: "amount-asc", label: "Amount (Low to High)", sortBy: "amount", sortOrder: "asc" as const },
  { value: "amount-desc", label: "Amount (High to Low)", sortBy: "amount", sortOrder: "desc" as const },
  { value: "members-asc", label: "Members (Fewest)", sortBy: "members", sortOrder: "asc" as const },
  { value: "members-desc", label: "Members (Most)", sortBy: "members", sortOrder: "desc" as const },
]

const CURRENCIES: Currency[] = ["USDC", "XLM"]

const typeAccentColors: Record<CircleType, string> = {
  public: "from-emerald-500 to-aurora-cyan",
  private: "from-aurora-indigo to-aurora-violet",
  community: "from-aurora-amber to-aurora-violet",
  premium: "from-aurora-violet to-fuchsia-500",
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const cardItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

function CircleGridCard({ circle }: { circle: Circle }) {
  const freqLabel =
    circle.frequency.charAt(0).toUpperCase() + circle.frequency.slice(1)
  const memberCount = circle.memberCount ?? 0
  const progressPct = Math.min(
    100,
    Math.round((circle.currentRound / (circle.maxMembers || 1)) * 100),
  )
  const isPremium = circle.circleType === "premium"
  const accentGradient = typeAccentColors[circle.circleType] ?? typeAccentColors.public

  return (
    <Link href={`/circles/${circle.id}`}>
      <motion.div
        variants={cardItem}
        whileHover={{ y: -5, transition: { duration: 0.25 } }}
        className={cn(
          "glass-premium rounded-2xl overflow-hidden tilt-hover depth-3",
          isPremium && "holo-border",
        )}
      >
        <div className={cn("h-[3px] w-full bg-gradient-to-r", accentGradient)} />
        <div className="p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <h4 className="font-heading text-lg font-semibold text-foreground dark:text-white truncate">
                {circle.name}
              </h4>
              <p className="text-2xs text-muted-foreground mt-0.5 capitalize">
                {circle.circleType}
              </p>
            </div>
            <Badge
              variant={circle.status === "active" ? "success" : circle.status === "pending" ? "warning" : "default"}
              size="sm"
              className="shrink-0 ml-2"
            >
              {circle.status}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="gradient-text font-bold font-heading">
              {formatCurrency(circle.contributionAmount, circle.currency)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {freqLabel}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {memberCount}/{circle.maxMembers}
            </span>
            {circle.minMoiScore != null && circle.minMoiScore > 0 && (
              <span className="inline-flex items-center gap-1 text-amber-400 text-xs">
                <Shield className="h-3 w-3" />
                {circle.minMoiScore}+
              </span>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-2xs text-muted-foreground">
              <span>Round Progress</span>
              <span>{circle.currentRound}/{circle.maxMembers}</span>
            </div>
            <Progress aria-label="Circle contribution progress" value={progressPct} size="sm" variant={progressPct >= 80 ? "success" : "primary"} />
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground hover:text-foreground transition-colors font-body">
              View Details &rarr;
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}

export default function CirclesBrowsePage() {
  const { t } = useTranslate()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const initialType = searchParams.get("tab") || "all"

  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [typeFilter, setTypeFilter] = useState(initialType)
  const [currencyFilter, setCurrencyFilter] = useState<Currency | null>(null)
  const [sortValue, setSortValue] = useState("date-desc")
  const [page, setPage] = useState(1)
  const limit = 12

  // Sync tab with URL
  const updateTypeFilter = (newType: string) => {
    setTypeFilter(newType)
    setPage(1)
    const params = new URLSearchParams(searchParams)
    if (newType === "all") {
      params.delete("tab")
    } else {
      params.set("tab", newType)
    }
    router.replace(`${pathname}?${params.toString()}`)
  }

  const selectedSort = SORT_OPTIONS.find((s) => s.value === sortValue) ?? SORT_OPTIONS[0]

  const filters = {
    search: deferredSearch || undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
    currency: currencyFilter ?? undefined,
    sort: selectedSort.value,
    sortBy: selectedSort.sortBy,
    sortOrder: selectedSort.sortOrder,
    page,
    limit,
  }

  const { data, isLoading, isError } = useCircles(filters)
  const circles = data?.circles ?? []
  const meta = data?.meta

  const hasNext = meta ? meta.page < meta.totalPages : false
  const hasPrev = page > 1

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("circles.title")}
        description="Browse and join savings circles on the Stellar network."
        action={
          <ButtonLink href="/circles/create" variant="premium" size="md" leftIcon={<Plus className="h-4 w-4" />}>
            {t("circles.create")}
          </ButtonLink>
        }
      />

      <div className="relative">
        <Input
          placeholder={t("circles.search")}
          leftIcon={<Search className="h-4 w-4" />}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
      </div>

      <div className="p-4 rounded-xl border-l-4 border-l-aurora-violet bg-card/60 backdrop-blur-md space-y-3 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {TYPE_TABS.map((f) => (
              <motion.button
                key={f.value}
                type="button"
                aria-pressed={typeFilter === f.value}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => updateTypeFilter(f.value)}
                className={cn(
                  "inline-flex items-center rounded-full px-4 py-1.5 text-xs font-body font-medium transition-all duration-300",
                  typeFilter === f.value
                    ? "gradient-bg-extended text-white shadow-lg holo-glow"
                    : "glass-whisper text-muted-foreground hover:text-foreground dark:hover:text-white",
                )}
              >
                {t("circles." + f.value)}
              </motion.button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-2xs text-muted-foreground font-body">Currency:</span>
              {CURRENCIES.map((c) => (
                <motion.button
                  key={c}
                  type="button"
                  aria-pressed={currencyFilter === c}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setCurrencyFilter((prev) => (prev === c ? null : c))}
                  className={cn(
                    "inline-flex items-center rounded-full px-3.5 py-1 text-xs font-body font-medium transition-all duration-300",
                    currencyFilter === c
                      ? "gradient-bg-extended text-white"
                      : "glass-whisper text-muted-foreground hover:text-foreground dark:hover:text-white",
                  )}
                >
                  {c}
                </motion.button>
              ))}
            </div>

            <Dropdown
              align="right"
              trigger={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<ArrowUpDown className="h-3.5 w-3.5" />}
                  className="font-body text-xs border-aurora-violet/30 hover:border-aurora-violet"
                >
                  <span className="hidden sm:inline">Sort: </span>
                  <span className="font-semibold text-aurora-violet dark:text-emerald-400">
                    {selectedSort.label}
                  </span>
                </Button>
              }
            >
              <div className="py-1">
                <p className="px-3 py-1.5 text-[10px] tracking-wider uppercase text-muted-foreground font-heading border-b border-border/40">
                  Sort Circles By
                </p>
                {SORT_OPTIONS.map((option) => {
                  const isSelected = option.value === sortValue
                  return (
                    <DropdownItem
                      key={option.value}
                      role="menuitemradio"
                      aria-checked={isSelected}
                      onClick={() => {
                        setSortValue(option.value)
                        setPage(1)
                      }}
                      className={cn(
                        "justify-between text-xs transition-colors",
                        isSelected
                          ? "bg-aurora-violet/15 text-aurora-violet font-semibold dark:text-emerald-400"
                          : "text-foreground/80 hover:bg-white/5",
                      )}
                    >
                      <span>{option.label}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-aurora-violet dark:text-emerald-400" />}
                    </DropdownItem>
                  )
                })}
              </div>
            </Dropdown>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="card" className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={<Inbox className="h-6 w-6" />}
          title="Failed to load circles"
          description="Something went wrong. Please try again later."
        />
      ) : circles.length === 0 ? (
        <EmptyState
          icon={<Search className="h-6 w-6" />}
          title={t("circles.noCircles")}
          description={t("circles.tryDifferent")}
        />
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {circles.map((circle) => (
            <CircleGridCard key={circle.id} circle={circle} />
          ))}
        </motion.div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground font-body">
            Page {meta.page} of {meta.totalPages} ({meta.total} circles)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasPrev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              leftIcon={<ChevronLeft className="h-4 w-4" />}
            >
              Previous
            </Button>
            <div className="hidden sm:flex items-center gap-1">
              {Array.from({ length: Math.min(meta.totalPages, 5) }).map((_, i) => {
                const pageNum = i + 1
                return (
                  <motion.button
                    key={pageNum}
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setPage(pageNum)}
                    className={cn(
                      "w-8 h-8 rounded-full text-xs font-body font-medium transition-all",
                      meta.page === pageNum
                        ? "gradient-bg-extended text-white"
                        : "glass-whisper text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {pageNum}
                  </motion.button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNext}
              onClick={() => setPage((p) => p + 1)}
              rightIcon={<ChevronRight className="h-4 w-4" />}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
