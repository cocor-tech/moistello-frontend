"use client"

import React from "react"
import { Circle, CircleRound } from "@/types"
import { formatCurrency } from "@/lib/formatters"
import { Calendar, CheckCircle2, Clock, Minus } from "lucide-react"

interface CompareRoundsProps {
  circleA: Circle | null
  circleB: Circle | null
  roundsA: CircleRound[]
  roundsB: CircleRound[]
}

export function CompareRounds({
  circleA,
  circleB,
  roundsA,
  roundsB,
}: CompareRoundsProps) {
  if (!circleA && !circleB) return null

  const maxRoundsA = circleA?.maxMembers || roundsA.length || 0
  const maxRoundsB = circleB?.maxMembers || roundsB.length || 0
  const totalRounds = Math.max(maxRoundsA, maxRoundsB, 1)

  const roundIndices = Array.from({ length: totalRounds }, (_, i) => i + 1)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading font-semibold text-lg text-foreground flex items-center gap-2">
            <Calendar className="h-5 w-5 text-aurora-violet" /> Round Schedule & Progression
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Side-by-side progression across all rounds. Handles different cycle lengths seamlessly.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="flex items-center gap-1.5 text-aurora-violet">
            <span className="h-2 w-2 rounded-full bg-aurora-violet" />
            {circleA ? `${circleA.name} (${maxRoundsA} rds)` : "Circle 1"}
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            {circleB ? `${circleB.name} (${maxRoundsB} rds)` : "Circle 2"}
          </span>
        </div>
      </div>

      <div className="border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b border-border bg-white/[0.03]">
              <th className="py-3 px-4 font-mono text-xs uppercase tracking-wider text-muted-foreground w-28">
                Round
              </th>
              <th className="py-3 px-4 font-mono text-xs uppercase tracking-wider text-aurora-violet border-l border-border">
                {circleA?.name ?? "Circle 1"}
              </th>
              <th className="py-3 px-4 font-mono text-xs uppercase tracking-wider text-emerald-400 border-l border-border">
                {circleB?.name ?? "Circle 2"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {roundIndices.map((roundNum) => {
              const inA = roundNum <= maxRoundsA
              const inB = roundNum <= maxRoundsB

              const roundDataA = roundsA.find((r) => r.roundNumber === roundNum)
              const roundDataB = roundsB.find((r) => r.roundNumber === roundNum)

              const isCurrentA = circleA?.currentRound === roundNum
              const isPastA = circleA ? circleA.currentRound > roundNum : false

              const isCurrentB = circleB?.currentRound === roundNum
              const isPastB = circleB ? circleB.currentRound > roundNum : false

              return (
                <tr key={roundNum} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4 font-mono font-semibold text-xs text-muted-foreground whitespace-nowrap">
                    Round {roundNum}
                  </td>

                  {/* Circle A Column */}
                  <td className="py-3 px-4 border-l border-border align-middle">
                    {!circleA ? (
                      <span className="text-muted-foreground text-xs">—</span>
                    ) : inA ? (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {isPastA ? (
                            <span className="flex items-center gap-1 text-2xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono">
                              <CheckCircle2 className="h-3 w-3" /> Done
                            </span>
                          ) : isCurrentA ? (
                            <span className="flex items-center gap-1 text-2xs px-2 py-0.5 rounded-full bg-aurora-violet/20 text-aurora-violet font-mono animate-pulse">
                              <Clock className="h-3 w-3" /> Active
                            </span>
                          ) : (
                            <span className="text-2xs px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground font-mono">
                              Upcoming
                            </span>
                          )}
                          <span className="font-mono text-xs text-foreground">
                            {formatCurrency(circleA.contributionAmount * circleA.maxMembers, circleA.currency)}
                          </span>
                        </div>
                        {roundDataA?.contributions && (
                          <span className="text-2xs text-muted-foreground font-mono">
                            {roundDataA.contributions.length}/{circleA.maxMembers} paid
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-2xs text-muted-foreground/60 font-mono italic">
                        <Minus className="h-3 w-3" />
                        <span>Cycle completed (max {maxRoundsA} rounds)</span>
                      </div>
                    )}
                  </td>

                  {/* Circle B Column */}
                  <td className="py-3 px-4 border-l border-border align-middle">
                    {!circleB ? (
                      <span className="text-muted-foreground text-xs">—</span>
                    ) : inB ? (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {isPastB ? (
                            <span className="flex items-center gap-1 text-2xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono">
                              <CheckCircle2 className="h-3 w-3" /> Done
                            </span>
                          ) : isCurrentB ? (
                            <span className="flex items-center gap-1 text-2xs px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-400 font-mono animate-pulse">
                              <Clock className="h-3 w-3" /> Active
                            </span>
                          ) : (
                            <span className="text-2xs px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground font-mono">
                              Upcoming
                            </span>
                          )}
                          <span className="font-mono text-xs text-foreground">
                            {formatCurrency(circleB.contributionAmount * circleB.maxMembers, circleB.currency)}
                          </span>
                        </div>
                        {roundDataB?.contributions && (
                          <span className="text-2xs text-muted-foreground font-mono">
                            {roundDataB.contributions.length}/{circleB.maxMembers} paid
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-2xs text-muted-foreground/60 font-mono italic">
                        <Minus className="h-3 w-3" />
                        <span>Cycle completed (max {maxRoundsB} rounds)</span>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
