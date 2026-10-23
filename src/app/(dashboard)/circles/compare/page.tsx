"use client"

import React, { Suspense, useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { useCircle, useCircleRounds } from "@/hooks/use-circles"
import { ChartColumn } from "lucide-react"
import { CompareSelector } from "./components/compare-selector"
import { CompareSummary } from "./components/compare-summary"
import { CompareRounds } from "./components/compare-rounds"

function CompareContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Parse initial circle ids from query params (?c1=...&c2=... or ?circles=a,b or ?ids=a,b)
  const initialA = searchParams.get("c1") || searchParams.get("id1") || searchParams.get("circles")?.split(",")[0] || searchParams.get("ids")?.split(",")[0] || ""
  const initialB = searchParams.get("c2") || searchParams.get("id2") || searchParams.get("circles")?.split(",")[1] || searchParams.get("ids")?.split(",")[1] || ""

  const [idA, setIdA] = useState(initialA)
  const [idB, setIdB] = useState(initialB)

  // Sync state if URL search params change externally
  useEffect(() => {
    const urlA = searchParams.get("c1") || searchParams.get("id1") || searchParams.get("circles")?.split(",")[0] || searchParams.get("ids")?.split(",")[0] || ""
    const urlB = searchParams.get("c2") || searchParams.get("id2") || searchParams.get("circles")?.split(",")[1] || searchParams.get("ids")?.split(",")[1] || ""
    if (urlA !== idA) setIdA(urlA)
    if (urlB !== idB) setIdB(urlB)
  }, [searchParams])

  // Sync state to URL search parameters for deep-linking
  const syncToUrl = useCallback((nextA: string, nextB: string) => {
    const params = new URLSearchParams()
    if (nextA) params.set("c1", nextA)
    if (nextB) params.set("c2", nextB)
    const queryString = params.toString()
    const newPath = queryString ? `/circles/compare?${queryString}` : "/circles/compare"
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", newPath)
    }
  }, [])

  const handleSetA = (id: string) => {
    setIdA(id)
    syncToUrl(id, idB)
  }

  const handleSetB = (id: string) => {
    setIdB(id)
    syncToUrl(idA, id)
  }

  const handleSwap = () => {
    const nextA = idB
    const nextB = idA
    setIdA(nextA)
    setIdB(nextB)
    syncToUrl(nextA, nextB)
  }

  const handleClear = () => {
    setIdA("")
    setIdB("")
    syncToUrl("", "")
  }

  const { data: circleA, isLoading: isLoadingA } = useCircle(idA)
  const { data: circleB, isLoading: isLoadingB } = useCircle(idB)

  const { data: roundsA = [] } = useCircleRounds(idA)
  const { data: roundsB = [] } = useCircleRounds(idB)

  const hasSelection = Boolean(idA || idB)

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Decorative top accent line */}
      <div className="h-1 w-full bg-gradient-to-r from-aurora-violet via-emerald-400 to-amber-400 rounded-full" />

      <PageHeader
        title="Compare Savings Circles"
        description="Evaluate circle parameters, contributions, payouts, and round progression side-by-side."
        breadcrumbs={[
          { label: "Circles", href: "/circles" },
          { label: "Compare" },
        ]}
      />

      {/* Selector & Deep Link controls */}
      <CompareSelector
        idA={idA}
        idB={idB}
        onChangeA={handleSetA}
        onChangeB={handleSetB}
        onSwap={handleSwap}
        onClear={handleClear}
      />

      {!hasSelection ? (
        <EmptyState
          icon={<ChartColumn className="h-8 w-8 text-aurora-violet" />}
          title="Select Two Circles to Compare"
          description="Enter two circle IDs or open a circle and click Compare to evaluate contribution amounts, payout rules, and round progression side-by-side."
        />
      ) : (
        <div className="space-y-10">
          {/* Summary and Metrics */}
          <CompareSummary
            circleA={circleA ?? null}
            circleB={circleB ?? null}
            isLoadingA={isLoadingA}
            isLoadingB={isLoadingB}
          />

          {/* Side-by-side Rounds comparison with resilient different-duration handling */}
          <CompareRounds
            circleA={circleA ?? null}
            circleB={circleB ?? null}
            roundsA={roundsA}
            roundsB={roundsB}
          />
        </div>
      )}
    </div>
  )
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center font-mono text-sm text-muted-foreground">Loading circle comparison...</div>}>
      <CompareContent />
    </Suspense>
  )
}
