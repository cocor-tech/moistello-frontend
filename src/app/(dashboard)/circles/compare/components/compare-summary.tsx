"use client"

import React from "react"
import Link from "next/link"
import { Circle } from "@/types"
import { formatCurrency } from "@/lib/formatters"
import { ArrowUpRight, DollarSign, Gift, Users, ShieldCheck } from "lucide-react"

interface CompareSummaryProps {
  circleA: Circle | null
  circleB: Circle | null
  isLoadingA: boolean
  isLoadingB: boolean
}

export function CompareSummary({
  circleA,
  circleB,
  isLoadingA,
  isLoadingB,
}: CompareSummaryProps) {
  const poolA = circleA ? circleA.contributionAmount * circleA.maxMembers : 0
  const poolB = circleB ? circleB.contributionAmount * circleB.maxMembers : 0

  return (
    <div className="space-y-8">
      {/* Visual hero stats: Large typography */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Circle A Hero */}
        <div className="border-l-4 border-l-aurora-violet bg-white/[0.02] border border-border p-5 rounded-xl space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-aurora-violet/20 text-aurora-violet">
                Circle 1
              </span>
              <h2 className="text-xl font-heading font-bold text-foreground mt-1">
                {circleA?.name ?? (isLoadingA ? "Loading..." : "Not selected")}
              </h2>
              {circleA && (
                <p className="text-xs text-muted-foreground capitalize">
                  {circleA.circleType} · {circleA.status}
                </p>
              )}
            </div>
            {circleA && (
              <Link
                href={`/circles/${circleA.id}`}
                className="text-muted-foreground hover:text-foreground text-xs flex items-center gap-1"
                aria-label={`View details for ${circleA.name}`}
              >
                View <ArrowUpRight className="h-3 w-3" />
              </Link>
            )}
          </div>

          {circleA && (
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-mono">Pool Size</p>
                <p className="text-2xl font-heading font-bold gradient-text">
                  {formatCurrency(poolA, circleA.currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-mono">Per Round</p>
                <p className="text-2xl font-mono font-bold text-foreground">
                  {formatCurrency(circleA.contributionAmount, circleA.currency)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Circle B Hero */}
        <div className="border-l-4 border-l-emerald-400 bg-white/[0.02] border border-border p-5 rounded-xl space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-400/20 text-emerald-400">
                Circle 2
              </span>
              <h2 className="text-xl font-heading font-bold text-foreground mt-1">
                {circleB?.name ?? (isLoadingB ? "Loading..." : "Not selected")}
              </h2>
              {circleB && (
                <p className="text-xs text-muted-foreground capitalize">
                  {circleB.circleType} · {circleB.status}
                </p>
              )}
            </div>
            {circleB && (
              <Link
                href={`/circles/${circleB.id}`}
                className="text-muted-foreground hover:text-foreground text-xs flex items-center gap-1"
                aria-label={`View details for ${circleB.name}`}
              >
                View <ArrowUpRight className="h-3 w-3" />
              </Link>
            )}
          </div>

          {circleB && (
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-mono">Pool Size</p>
                <p className="text-2xl font-heading font-bold gradient-text">
                  {formatCurrency(poolB, circleB.currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-mono">Per Round</p>
                <p className="text-2xl font-mono font-bold text-foreground">
                  {formatCurrency(circleB.contributionAmount, circleB.currency)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Side by side metric comparison */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="bg-white/[0.03] px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="font-heading font-semibold text-sm text-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-aurora-violet" /> Contribution & Payout Metrics
          </h3>
          <div className="flex gap-2">
            <span className="px-2 py-0.5 text-xs font-mono bg-aurora-violet/15 text-aurora-violet rounded">Circle 1</span>
            <span className="px-2 py-0.5 text-xs font-mono bg-emerald-400/15 text-emerald-400 rounded">Circle 2</span>
          </div>
        </div>

        <div className="divide-y divide-border text-sm">
          <MetricRow
            label="Contribution Amount"
            valA={circleA ? formatCurrency(circleA.contributionAmount, circleA.currency) : "—"}
            valB={circleB ? formatCurrency(circleB.contributionAmount, circleB.currency) : "—"}
          />
          <MetricRow
            label="Payment Frequency"
            valA={circleA?.frequency ? circleA.frequency.toUpperCase() : "—"}
            valB={circleB?.frequency ? circleB.frequency.toUpperCase() : "—"}
          />
          <MetricRow
            label="Payout Method"
            valA={circleA?.payoutType ? circleA.payoutType.toUpperCase() : "—"}
            valB={circleB?.payoutType ? circleB.payoutType.toUpperCase() : "—"}
          />
          <MetricRow
            label="Total Pool Value"
            valA={circleA ? formatCurrency(poolA, circleA.currency) : "—"}
            valB={circleB ? formatCurrency(poolB, circleB.currency) : "—"}
          />
          <MetricRow
            label="Collateral Required"
            valA={circleA ? `${circleA.collateralPercent}%` : "—"}
            valB={circleB ? `${circleB.collateralPercent}%` : "—"}
          />
          <MetricRow
            label="Late Fee"
            valA={circleA ? `${circleA.lateFeePercent}%` : "—"}
            valB={circleB ? `${circleB.lateFeePercent}%` : "—"}
          />
          <MetricRow
            label="Grace Period"
            valA={circleA ? `${circleA.gracePeriodHours} hours` : "—"}
            valB={circleB ? `${circleB.gracePeriodHours} hours` : "—"}
          />
        </div>
      </div>

      {/* Participation Comparison */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="bg-white/[0.03] px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="font-heading font-semibold text-sm text-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-400" /> Participation & Rules
          </h3>
        </div>

        <div className="divide-y divide-border text-sm">
          <MetricRow
            label="Max Members (Round Count)"
            valA={circleA ? `${circleA.maxMembers} members` : "—"}
            valB={circleB ? `${circleB.maxMembers} members` : "—"}
          />
          <MetricRow
            label="Current Members"
            valA={circleA ? `${circleA.memberCount ?? 0} / ${circleA.maxMembers}` : "—"}
            valB={circleB ? `${circleB.memberCount ?? 0} / ${circleB.maxMembers}` : "—"}
          />
          <MetricRow
            label="Current Round Progress"
            valA={circleA ? `Round ${circleA.currentRound} of ${circleA.maxMembers}` : "—"}
            valB={circleB ? `Round ${circleB.currentRound} of ${circleB.maxMembers}` : "—"}
          />
          <MetricRow
            label="Min MoiScore Required"
            valA={circleA?.minMoiScore ? `${circleA.minMoiScore}` : "None"}
            valB={circleB?.minMoiScore ? `${circleB.minMoiScore}` : "None"}
          />
          <MetricRow
            label="Max Strikes Allowed"
            valA={circleA ? `${circleA.maxStrikes}` : "—"}
            valB={circleB ? `${circleB.maxStrikes}` : "—"}
          />
          <MetricRow
            label="Circle Organizer"
            valA={circleA?.organizerName ?? circleA?.organizerId ?? "—"}
            valB={circleB?.organizerName ?? circleB?.organizerId ?? "—"}
          />
        </div>
      </div>
    </div>
  )
}

function MetricRow({ label, valA, valB }: { label: string; valA: string; valB: string }) {
  return (
    <div className="grid grid-cols-3 px-4 py-3 hover:bg-white/[0.02] transition-colors items-center">
      <span className="text-muted-foreground font-body text-xs md:text-sm">{label}</span>
      <span className="text-center font-mono font-medium text-foreground text-xs md:text-sm">{valA}</span>
      <span className="text-center font-mono font-medium text-foreground text-xs md:text-sm">{valB}</span>
    </div>
  )
}
