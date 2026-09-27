"use client"

import React from "react"

import { Shield, Target, Shuffle, ArrowUpDown, Gavel, Vote } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/cn"
import type { CircleFormData, PayoutType } from "@/types"

interface CreateStepPayoutProps {
  formData: CircleFormData
  setFormData: React.Dispatch<React.SetStateAction<CircleFormData>>
  errors: Record<string, string>
}

const PAYOUT_TYPES: {
  value: PayoutType
  label: string
  description: string
  icon: React.ReactNode
}[] = [
  { value: "random", label: "Random", description: "Recipient randomly selected each round", icon: <Shuffle className="h-5 w-5" /> },
  { value: "fixed", label: "Fixed Order", description: "Predetermined payout order", icon: <ArrowUpDown className="h-5 w-5" /> },
  { value: "auction", label: "Auction", description: "Bid discount for early payout", icon: <Gavel className="h-5 w-5" /> },
  { value: "vote", label: "Vote", description: "Members vote on recipient", icon: <Vote className="h-5 w-5" /> },
]

export function CreateStepPayout({ formData, setFormData }: CreateStepPayoutProps) {
  return (
    <div className="space-y-6">
      <h3 className="font-heading text-lg font-semibold text-foreground dark:text-white">
        Payout Configuration
      </h3>

      <div>
        <p id="payout-type-label" className="mb-2 block font-heading text-sm text-muted-foreground">
          Payout Type
        </p>
        <div role="group" aria-labelledby="payout-type-label" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PAYOUT_TYPES.map((pt) => (
            <button
              key={pt.value}
              type="button"
              aria-pressed={formData.payoutType === pt.value}
              onClick={() => setFormData((prev) => ({ ...prev, payoutType: pt.value }))}
              className={cn(
                "glass rounded-xl p-4 text-left transition-all duration-300",
                formData.payoutType === pt.value
                  ? "glass-strong holo-border"
                  : "hover:glass-strong",
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full text-lg",
                    formData.payoutType === pt.value
                      ? "bg-gradient-to-br from-aurora-violet/20 to-aurora-indigo/20"
                      : "bg-white/5",
                  )}
                >
                  <span>{pt.icon}</span>
                </div>
                <div>
                  <span className="block font-heading font-semibold text-sm text-foreground dark:text-white">
                    {pt.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{pt.description}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Collateral % (optional)"
          type="number"
          min={0}
          max={100}
          value={formData.collateralPercent != null ? String(formData.collateralPercent) : ""}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              collateralPercent: e.target.value ? Number(e.target.value) : undefined,
            }))
          }
          leftIcon={<Shield className="h-4 w-4" />}
          hint="Percentage of contribution required as collateral"
        />
        <Input
          label="Min MoiScore (optional)"
          type="number"
          min={0}
          max={1000}
          value={formData.minMoiScore != null ? String(formData.minMoiScore) : ""}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              minMoiScore: e.target.value ? Number(e.target.value) : undefined,
            }))
          }
          leftIcon={<Target className="h-4 w-4" />}
          hint="Minimum trust score to join"
        />
      </div>
    </div>
  )
}
