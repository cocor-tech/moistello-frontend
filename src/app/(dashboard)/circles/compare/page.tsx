"use client"

import React, { useState } from "react"
import Link from "next/link"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCircle } from "@/hooks/use-circles"
import { formatCurrency } from "@/lib/formatters"
import { Search, X, BarChart3 } from "lucide-react"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ATTRIBUTES: { key: string; label: string; format: (v: any, c?: any) => string }[] = [
  { key: "contributionAmount", label: "Contribution", format: (v: number, c) => formatCurrency(v, c?.currency ?? "USDC") },
  { key: "frequency", label: "Frequency", format: (v: string) => v.charAt(0).toUpperCase() + v.slice(1) },
  { key: "payoutType", label: "Payout Type", format: (v: string) => v.charAt(0).toUpperCase() + v.slice(1) },
  { key: "maxMembers", label: "Max Members", format: (v: number) => String(v) },
  { key: "currentRound", label: "Current Round", format: (v: number) => String(v) },
  { key: "totalContributions", label: "Total Saved", format: (v: number, c) => formatCurrency(v, c?.currency ?? "USDC") },
  { key: "collateralPercent", label: "Collateral", format: (v: number) => `${v}%` },
  { key: "lateFeePercent", label: "Late Fee", format: (v: number) => `${v}%` },
  { key: "gracePeriodHours", label: "Grace Period", format: (v: number) => `${v}h` },
  { key: "circleType", label: "Type", format: (v: string) => v.charAt(0).toUpperCase() + v.slice(1) },
]

function CircleCompareChip({ id, onRemove }: { id: string; onRemove: (id: string) => void }) {
  const { data: circle } = useCircle(id)
  return (
    <div className="glass-premium rounded-xl p-4 holo-border relative">
      <button type="button" onClick={() => onRemove(id)} className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 flex items-center justify-center" aria-label={`Remove circle ${id} from comparison`}><X className="h-3 w-3" aria-hidden="true" /></button>
      <Link href={`/circles/${id}`} className="font-heading font-semibold text-foreground dark:text-white text-sm hover:underline block truncate">{circle?.name ?? "Loading..."}</Link>
      <p className="text-2xs text-muted-foreground capitalize">{circle ? `${circle.circleType} · ${circle.status}` : ""}</p>
    </div>
  )
}

export default function ComparePage() {
  const [circleIds, setCircleIds] = useState<string[]>([])
  const [inputValue, setInputValue] = useState("")

  const addCircle = () => {
    const id = inputValue.trim()
    if (id && !circleIds.includes(id) && circleIds.length < 4) {
      setCircleIds((prev) => [...prev, id])
    }
    setInputValue("")
  }

  const removeCircle = (id: string) => setCircleIds((prev) => prev.filter((x) => x !== id))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compare Circles"
        description="Compare up to 4 circles side-by-side to find the best fit."
      />

      <div className="flex items-center gap-2">
        <Input
          placeholder="Paste a circle ID to compare..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCircle()}
          leftIcon={<Search className="h-4 w-4" />}
          className="flex-1"
        />
        <Button variant="primary" size="md" onClick={addCircle} disabled={circleIds.length >= 4 || !inputValue.trim()}>
          Add
        </Button>
      </div>

      {circleIds.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {circleIds.map((id) => (
            <CircleCompareChip key={id} id={id} onRemove={removeCircle} />
          ))}
        </div>
      )}

      {circleIds.length === 0 ? (
        <EmptyState
          icon={<BarChart3 className="h-6 w-6" />}
          title="Add circles to compare"
          description="Paste circle IDs above to compare attributes side-by-side. You can compare up to 4 circles."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="glass-strong border-b border-border">
                <th className="px-4 py-3 text-left text-2xs font-heading tracking-wider uppercase text-muted-foreground w-48 sticky left-0 bg-[var(--bg-card)]">Attribute</th>
                {circleIds.map((id) => (
                  <th key={id} className="px-4 py-3 text-center text-2xs font-heading tracking-wider uppercase text-muted-foreground">
                    <Link href={`/circles/${id}`} className="hover:text-foreground transition-colors">Circle {circleIds.indexOf(id) + 1}</Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ATTRIBUTES.map((attr) => {
                return (
                  <tr key={attr.key} className="border-b border-border hover:glass-whisper transition-colors">
                    <td className="px-4 py-3 text-sm font-heading font-medium text-muted-foreground w-48 sticky left-0 bg-[var(--bg-card)] z-10">{attr.label}</td>
                    {circleIds.map((id) => {
                      return <td key={id} className="px-4 py-3 text-sm text-center"><CircleAttrValue circleId={id} attr={attr} /></td>
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CircleAttrValue({ circleId, attr }: { circleId: string; attr: typeof ATTRIBUTES[0] }) {
  const { data: circle } = useCircle(circleId)
  if (!circle) return <span className="text-muted-foreground">—</span>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const val = (circle as any)[attr.key]
  return <span>{val !== undefined ? attr.format(val, circle) : "—"}</span>
}
